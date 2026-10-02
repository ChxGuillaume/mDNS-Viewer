import type { DiscoveryEvent, ServiceRecord } from './types';

type Seed = [name: string, type: string, host: string, port: number, ip: string, txt?: Record<string, string>];

const seeds: Seed[] = [
  ['Freebox Server', 'http', 'Freebox-Server.local', 80, '192.168.1.254'],
  ['Freebox Server', 'fbx-api', 'Freebox-Server.local', 443, '192.168.1.254', { api_version: '15.0', api_base_url: '/api/', https_available: '1' }],
  ['Freebox Server', 'smb', 'Freebox-Server.local', 445, '192.168.1.254'],
  ['pi5 Glances', 'glances', 'pi5.local', 61208, '192.168.1.42', { protocol: 'rest' }],
  ['pi5', 'ssh', 'pi5.local', 22, '192.168.1.42'],
  ['pi5', 'sftp-ssh', 'pi5.local', 22, '192.168.1.42'],
  ['Home Assistant', 'home-assistant', 'homeassistant.local', 8123, '192.168.1.40', { version: '2026.9.2', internal_url: 'http://192.168.1.40:8123', base_url: 'http://192.168.1.40:8123' }],
  ['Home Assistant', 'hap', 'homeassistant.local', 21064, '192.168.1.40', { md: 'HASS Bridge', pv: '1.1', ci: '2', sf: '0' }],
  ['Living Room', 'airplay', 'Living-Room.local', 7000, '192.168.1.61', { model: 'AppleTV14,1', features: '0x4A7FDFD5,0xBC177FDE', srcvers: '860.7.1' }],
  ['Living Room', 'companion-link', 'Living-Room.local', 49153, '192.168.1.61', { rpBA: 'D1:3A:9F:11:20:44', rpVr: '640.2' }],
  ['Chromecast Kitchen', 'googlecast', 'kitchen-cast.local', 8009, '192.168.1.73', { fn: 'Kitchen speaker', md: 'Google Nest Mini', ve: '05' }],
  ['Office Speaker', 'spotify-connect', 'office-speaker.local', 4070, '192.168.1.77', { CPath: '/spotify', VERSION: '1.0' }],
  ['HP OfficeJet Pro', 'ipp', 'HP-OfficeJet.local', 631, '192.168.1.90', { ty: 'HP OfficeJet Pro 9010', rp: 'ipp/print', adminurl: 'http://HP-OfficeJet.local/', pdl: 'application/pdf,image/urf' }],
  ['HP OfficeJet Pro', 'uscan', 'HP-OfficeJet.local', 8080, '192.168.1.90', { ty: 'HP OfficeJet Pro 9010', rs: 'eSCL' }],
  ['HP OfficeJet Pro', 'http', 'HP-OfficeJet.local', 80, '192.168.1.90'],
  ['NAS', 'smb', 'nas.local', 445, '192.168.1.20'],
  ['NAS', 'afpovertcp', 'nas.local', 548, '192.168.1.20'],
  ['NAS', 'https', 'nas.local', 5001, '192.168.1.20', { path: '/' }],
  ['NAS', 'adisk', 'nas.local', 9, '192.168.1.20', { sys: 'waMa=0,adVF=0x100', dk0: 'adVN=TimeMachine,adVF=0x82' }],
  ['Guillaume’s MacBook Pro', 'rfb', 'Guillaumes-MacBook-Pro.local', 5900, '192.168.1.12'],
  ['Guillaume’s MacBook Pro', 'device-info', 'Guillaumes-MacBook-Pro.local', 0, '192.168.1.12', { model: 'Mac16,7', osxvers: '26' }],
  ['972BEBDCEDB5F0B8-000000000001B669', 'matter', 'D83ADDDFE5EA.local', 50272, '192.168.1.110', { T: '2', SII: '5000', SAI: '300' }],
  ['Kitchen Lights', 'hue', 'Philips-hue.local', 443, '192.168.1.130', { bridgeid: '001788fffe4b2c11', modelid: 'BSB002' }],
  ['esp-garage', 'esphomelib', 'esp-garage.local', 6053, '192.168.1.150', { version: '2026.9.0', platform: 'ESP32', board: 'esp32dev' }],
  ['Mosquitto', 'mqtt', 'pi5.local', 1883, '192.168.1.42'],
  ['Dev server', 'http', 'Guillaumes-MacBook-Pro.local', 5173, '192.168.1.12', { path: '/' }],
  ['Samsung Q90 Series (65) Living Room Television With An Unreasonably Long Name', 'airplay', 'Samsung-Q90-Series-65-Living-Room-Television.local', 7000, '192.168.1.66', {
    deviceid: 'A4:30:7A:1F:88:02',
    features: '0x7F8AD0,0x38BCB46,0x1C340405D4A00,0x2A0B0000,0x2000000000000000,0x7FFFFFFF',
    pk: 'b07727d6f6cd6e08b58ede525ec3cdeaa252ad9f683feb212ef8a205246554e7a4f1b9c2d3e8f7a6b5c4d3e2f1a0b9c8d7e6f5',
    very_long_txt_record_key_name_that_goes_on: 'short',
    manufacturer: 'Samsung',
  }],
];

let timers: ReturnType<typeof setTimeout>[] = [];

function record(seed: Seed, index: number): ServiceRecord {
  const [name, type, host, port, ip, txt = {}] = seed;
  const now = Date.now();
  return {
    id: `${name}._${type}._tcp.local.`,
    name,
    serviceType: `_${type}._tcp.local.`,
    type,
    protocol: 'tcp',
    domain: 'local',
    subtype: null,
    subtypeDomain: null,
    host,
    port,
    addresses: [
      { ip, family: 'ipv4', interfaces: ['en0'], linkLocal: false },
      ...(index % 3 === 0 ? [{ ip: `fe80::${(index + 10).toString(16)}a:ad0f:7fe6:9bd5`, family: 'ipv6' as const, interfaces: ['en0'], linkLocal: true }] : []),
    ],
    txt: Object.entries(txt).map(([key, value]) => ({ key, value, binary: false })),
    online: true,
    firstSeen: now,
    lastSeen: now,
    updates: 0,
  };
}

export function mockStream(emit: (event: DiscoveryEvent) => void) {
  timers.forEach(clearTimeout);
  timers = [];

  let revision = 0;
  emit({ kind: 'cleared', revision: ++revision });

  seeds.forEach((seed, index) => {
    timers.push(setTimeout(() => {
      const service = record(seed, index);
      emit({ kind: 'typeDiscovered', revision: ++revision, serviceType: service.serviceType });
      emit({ kind: 'upserted', revision: ++revision, service });
    }, 150 + index * 90 + Math.random() * 400));
  });

  timers.push(setTimeout(() => {
    const service = record(seeds[10]!, 10);
    emit({ kind: 'upserted', revision: ++revision, service: { ...service, online: false, updates: 1 } });
  }, 9000));
}
