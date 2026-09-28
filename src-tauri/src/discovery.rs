use std::collections::{HashMap, HashSet};
use std::sync::{Arc, Mutex, MutexGuard};
use std::time::{SystemTime, UNIX_EPOCH};

use log::{debug, info, warn};
use mdns_sd::{ResolvedService, ScopedIp, ServiceDaemon, ServiceEvent};
use serde::Serialize;
use tauri::{AppHandle, Emitter};

pub const EVENT_NAME: &str = "mdns://event";

const META_QUERY: &str = "_services._dns-sd._udp.local.";

// Many devices never answer the DNS-SD meta query, so these are browsed unconditionally.
const WELL_KNOWN_TYPES: &[&str] = &[
    "_afpovertcp._tcp.local.",
    "_airplay._tcp.local.",
    "_companion-link._tcp.local.",
    "_daap._tcp.local.",
    "_device-info._tcp.local.",
    "_esphomelib._tcp.local.",
    "_googlecast._tcp.local.",
    "_hap._tcp.local.",
    "_home-assistant._tcp.local.",
    "_homekit._tcp.local.",
    "_http._tcp.local.",
    "_https._tcp.local.",
    "_ipp._tcp.local.",
    "_ipps._tcp.local.",
    "_matter._tcp.local.",
    "_matterc._udp.local.",
    "_mqtt._tcp.local.",
    "_nfs._tcp.local.",
    "_pdl-datastream._tcp.local.",
    "_printer._tcp.local.",
    "_raop._tcp.local.",
    "_rfb._tcp.local.",
    "_scanner._tcp.local.",
    "_sftp-ssh._tcp.local.",
    "_sleep-proxy._udp.local.",
    "_smb._tcp.local.",
    "_spotify-connect._tcp.local.",
    "_ssh._tcp.local.",
    "_uscan._tcp.local.",
    "_workstation._tcp.local.",
];

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Address {
    pub ip: String,
    pub family: &'static str,
    pub interfaces: Vec<String>,
    pub link_local: bool,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TxtEntry {
    pub key: String,
    pub value: Option<String>,
    pub binary: bool,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ServiceRecord {
    pub id: String,
    pub name: String,
    pub service_type: String,
    #[serde(rename = "type")]
    pub kind: String,
    pub protocol: String,
    pub domain: String,
    pub subtype: Option<String>,
    pub subtype_domain: Option<String>,
    pub host: String,
    pub port: u16,
    pub addresses: Vec<Address>,
    pub txt: Vec<TxtEntry>,
    pub online: bool,
    pub first_seen: u64,
    pub last_seen: u64,
    pub updates: u32,
}

impl ServiceRecord {
    fn same_content(&self, other: &Self) -> bool {
        self.host == other.host
            && self.port == other.port
            && self.subtype == other.subtype
            && self.subtype_domain == other.subtype_domain
            && self.addresses == other.addresses
            && self.txt == other.txt
    }
}

#[derive(Debug, Clone, Serialize)]
#[serde(tag = "kind", rename_all = "camelCase")]
pub enum DiscoveryEvent {
    Upserted {
        revision: u64,
        service: Box<ServiceRecord>,
    },
    Cleared {
        revision: u64,
    },
    TypeDiscovered {
        revision: u64,
        service_type: String,
    },
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Snapshot {
    pub revision: u64,
    pub started_at: u64,
    pub types: Vec<String>,
    pub services: Vec<ServiceRecord>,
}

struct Registry {
    generation: u64,
    revision: u64,
    started_at: u64,
    daemon: Option<ServiceDaemon>,
    browsed: HashSet<String>,
    services: HashMap<String, ServiceRecord>,
}

#[derive(Clone)]
pub struct Discovery {
    app: AppHandle,
    inner: Arc<Mutex<Registry>>,
}

impl Discovery {
    pub fn new(app: AppHandle) -> Self {
        Self {
            app,
            inner: Arc::new(Mutex::new(Registry {
                generation: 0,
                revision: 0,
                started_at: now_ms(),
                daemon: None,
                browsed: HashSet::new(),
                services: HashMap::new(),
            })),
        }
    }

    fn lock(&self) -> MutexGuard<'_, Registry> {
        self.inner
            .lock()
            .unwrap_or_else(|poisoned| poisoned.into_inner())
    }

    pub fn start(&self) -> Result<(), String> {
        let daemon =
            ServiceDaemon::new().map_err(|e| format!("failed to start mDNS daemon: {e}"))?;

        let (generation, previous, revision) = {
            let mut reg = self.lock();
            reg.generation += 1;
            reg.revision += 1;
            reg.started_at = now_ms();
            reg.browsed.clear();
            reg.services.clear();
            (
                reg.generation,
                reg.daemon.replace(daemon.clone()),
                reg.revision,
            )
        };

        if let Some(old) = previous {
            let _ = old.shutdown();
        }

        self.emit(DiscoveryEvent::Cleared { revision });

        self.browse_types(generation, &daemon);
        for ty in WELL_KNOWN_TYPES {
            self.browse(generation, &daemon, ty);
        }

        info!("mDNS discovery started (generation {generation})");
        Ok(())
    }

    pub fn stop(&self) {
        let mut reg = self.lock();
        reg.generation += 1;
        if let Some(daemon) = reg.daemon.take() {
            let _ = daemon.shutdown();
        }
    }

    pub fn snapshot(&self) -> Snapshot {
        let reg = self.lock();
        let mut types: Vec<String> = reg
            .browsed
            .iter()
            .filter(|t| t.as_str() != META_QUERY)
            .cloned()
            .collect();
        types.sort();
        Snapshot {
            revision: reg.revision,
            started_at: reg.started_at,
            types,
            services: reg.services.values().cloned().collect(),
        }
    }

    fn emit(&self, event: DiscoveryEvent) {
        if let Err(e) = self.app.emit(EVENT_NAME, event) {
            warn!("failed to emit discovery event: {e}");
        }
    }

    fn browse_types(&self, generation: u64, daemon: &ServiceDaemon) {
        self.lock().browsed.insert(META_QUERY.to_string());
        let receiver = match daemon.browse(META_QUERY) {
            Ok(r) => r,
            Err(e) => {
                warn!("meta query browse failed: {e}");
                return;
            }
        };

        let this = self.clone();
        let daemon = daemon.clone();
        tauri::async_runtime::spawn(async move {
            while let Ok(event) = receiver.recv_async().await {
                if !this.is_current(generation) {
                    break;
                }
                if let ServiceEvent::ServiceFound(_, ty) = event {
                    this.browse(generation, &daemon, &ty);
                }
            }
        });
    }

    fn browse(&self, generation: u64, daemon: &ServiceDaemon, ty: &str) {
        let ty = normalize_type(ty);
        if !is_browsable(&ty) {
            debug!("skipping unsupported service type {ty}");
            return;
        }

        let revision = {
            let mut reg = self.lock();
            if reg.generation != generation || !reg.browsed.insert(ty.clone()) {
                return;
            }
            reg.revision += 1;
            reg.revision
        };

        let receiver = match daemon.browse(&ty) {
            Ok(r) => r,
            Err(e) => {
                warn!("browse {ty} failed: {e}");
                self.lock().browsed.remove(&ty);
                return;
            }
        };

        self.emit(DiscoveryEvent::TypeDiscovered {
            revision,
            service_type: ty.clone(),
        });
        debug!("browsing {ty}");

        let this = self.clone();
        tauri::async_runtime::spawn(async move {
            while let Ok(event) = receiver.recv_async().await {
                if !this.is_current(generation) {
                    break;
                }
                match event {
                    ServiceEvent::ServiceResolved(resolved) => {
                        this.on_resolved(generation, &resolved)
                    }
                    ServiceEvent::ServiceRemoved(_, fullname) => {
                        this.on_removed(generation, &fullname)
                    }
                    ServiceEvent::SearchStopped(_) => break,
                    _ => {}
                }
            }
            debug!("stopped browsing {ty}");
        });
    }

    fn is_current(&self, generation: u64) -> bool {
        self.lock().generation == generation
    }

    fn on_resolved(&self, generation: u64, resolved: &ResolvedService) {
        let event = {
            let mut reg = self.lock();
            if reg.generation != generation {
                return;
            }
            let now = now_ms();
            let mut record = to_record(resolved, now);
            if let Some(previous) = reg.services.get_mut(&record.id) {
                if previous.online && previous.same_content(&record) {
                    previous.last_seen = now;
                    return;
                }
                record.first_seen = previous.first_seen;
                record.updates = previous.updates + 1;
            }
            debug!("resolved {} at {}:{}", record.id, record.host, record.port);
            reg.revision += 1;
            let revision = reg.revision;
            reg.services.insert(record.id.clone(), record.clone());
            DiscoveryEvent::Upserted {
                revision,
                service: Box::new(record),
            }
        };
        self.emit(event);
    }

    fn on_removed(&self, generation: u64, fullname: &str) {
        debug!("removed {fullname}");
        let event = {
            let mut reg = self.lock();
            if reg.generation != generation {
                return;
            }
            reg.revision += 1;
            let revision = reg.revision;
            let Some(record) = reg.services.get_mut(fullname) else {
                return;
            };
            record.online = false;
            record.last_seen = now_ms();
            DiscoveryEvent::Upserted {
                revision,
                service: Box::new(record.clone()),
            }
        };
        self.emit(event);
    }
}

fn now_ms() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_millis() as u64)
        .unwrap_or_default()
}

fn normalize_type(ty: &str) -> String {
    let ty = ty.trim();
    if ty.ends_with('.') {
        ty.to_string()
    } else {
        format!("{ty}.")
    }
}

fn is_browsable(ty: &str) -> bool {
    if !ty.starts_with('_') {
        return false;
    }

    let is_service_type = |name: &str| {
        name.starts_with('_') && (name.ends_with("._tcp.local.") || name.ends_with("._udp.local."))
    };

    if let Some((subtype, service_type)) = ty.split_once("._sub.") {
        // DNS-SD subtypes are queried as `<subtype>._sub.<service type>`.
        // Keep them as browse targets while resolved records retain the base type.
        return subtype.len() > 1 && !subtype[1..].contains('.') && is_service_type(service_type);
    }

    is_service_type(ty)
}

fn to_record(service: &ResolvedService, now: u64) -> ServiceRecord {
    // A subtype browse can resolve a service with the queried subtype as its
    // ty_domain (for example `_I..._sub._matter._tcp.local.`). Store and
    // classify it by the parent service type instead.
    let (queried_subtype, ty_domain) = match service.ty_domain.split_once("._sub.") {
        Some((subtype, parent_type)) => (Some(subtype), parent_type),
        None => (None, service.ty_domain.as_str()),
    };
    let mut labels = ty_domain.trim_end_matches('.').splitn(3, '.');
    let kind = labels
        .next()
        .unwrap_or_default()
        .trim_start_matches('_')
        .to_string();
    let protocol = labels
        .next()
        .unwrap_or_default()
        .trim_start_matches('_')
        .to_string();
    let domain = labels.next().unwrap_or_default().to_string();

    let name = service
        .fullname
        .strip_suffix(ty_domain)
        .unwrap_or(&service.fullname)
        .trim_end_matches('.');

    let subtype_domain = service
        .sub_ty_domain
        .clone()
        .or_else(|| queried_subtype.map(|sub| format!("{sub}._sub.{ty_domain}")));
    let subtype = subtype_domain
        .as_deref()
        .and_then(|sub| sub.split("._sub.").next())
        .map(|s| s.trim_start_matches('_').to_string());

    let mut addresses: Vec<Address> = service
        .addresses
        .iter()
        .map(to_address)
        .map(|mut address| {
            address.interfaces.sort();
            address
        })
        .collect();
    addresses.sort_by(|a, b| (a.family, a.link_local, &a.ip).cmp(&(b.family, b.link_local, &b.ip)));

    let txt = service
        .txt_properties
        .iter()
        .map(|prop| match prop.val() {
            None => TxtEntry {
                key: prop.key().to_string(),
                value: None,
                binary: false,
            },
            Some(bytes) => match std::str::from_utf8(bytes) {
                Ok(s) => TxtEntry {
                    key: prop.key().to_string(),
                    value: Some(s.to_string()),
                    binary: false,
                },
                Err(_) => TxtEntry {
                    key: prop.key().to_string(),
                    value: Some(bytes.iter().map(|b| format!("{b:02x}")).collect()),
                    binary: true,
                },
            },
        })
        .collect();

    ServiceRecord {
        id: service.fullname.clone(),
        name: unescape_dns(name),
        service_type: ty_domain.to_string(),
        kind,
        protocol,
        domain,
        subtype,
        subtype_domain,
        host: service.host.trim_end_matches('.').to_string(),
        port: service.port,
        addresses,
        txt,
        online: true,
        first_seen: now,
        last_seen: now,
        updates: 0,
    }
}

fn to_address(ip: &ScopedIp) -> Address {
    match ip {
        ScopedIp::V4(v4) => Address {
            ip: v4.addr().to_string(),
            family: "ipv4",
            interfaces: v4.interface_ids().iter().map(|i| i.name.clone()).collect(),
            link_local: v4.addr().is_link_local(),
        },
        ScopedIp::V6(v6) => {
            let scope = &v6.scope_id().name;
            Address {
                ip: v6.addr().to_string(),
                family: "ipv6",
                interfaces: if scope.is_empty() {
                    vec![]
                } else {
                    vec![scope.clone()]
                },
                link_local: v6.addr().is_unicast_link_local(),
            }
        }
        _ => Address {
            ip: ip.to_string(),
            family: if ip.is_ipv4() { "ipv4" } else { "ipv6" },
            interfaces: vec![],
            link_local: false,
        },
    }
}

fn unescape_dns(label: &str) -> String {
    let bytes = label.as_bytes();
    let mut out = Vec::with_capacity(bytes.len());
    let mut i = 0;
    while i < bytes.len() {
        if bytes[i] == b'\\' && i + 1 < bytes.len() {
            let digits = &bytes[i + 1..bytes.len().min(i + 4)];
            if digits.len() == 3 && digits.iter().all(u8::is_ascii_digit) {
                let value = digits
                    .iter()
                    .fold(0u16, |acc, d| acc * 10 + u16::from(d - b'0'));
                if let Ok(byte) = u8::try_from(value) {
                    out.push(byte);
                    i += 4;
                    continue;
                }
            }
            out.push(bytes[i + 1]);
            i += 2;
            continue;
        }
        out.push(bytes[i]);
        i += 1;
    }
    String::from_utf8_lossy(&out).into_owned()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn unescapes_dns_labels() {
        assert_eq!(unescape_dns(r"Living\032Room"), "Living Room");
        assert_eq!(unescape_dns(r"a\.b"), "a.b");
        assert_eq!(unescape_dns("plain"), "plain");
    }

    #[test]
    fn validates_types() {
        assert!(is_browsable("_http._tcp.local."));
        assert!(!is_browsable("_services._dns-sd._udp.example."));
        assert_eq!(normalize_type("_ssh._tcp.local"), "_ssh._tcp.local.");
    }
}
