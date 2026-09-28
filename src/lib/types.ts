export interface ServiceAddress {
  ip: string;
  family: 'ipv4' | 'ipv6';
  interfaces: string[];
  linkLocal: boolean;
}

export interface TxtEntry {
  key: string;
  value: string | null;
  binary: boolean;
}

export interface ServiceRecord {
  id: string;
  name: string;
  serviceType: string;
  type: string;
  protocol: string;
  domain: string;
  subtype: string | null;
  subtypeDomain: string | null;
  host: string;
  port: number;
  addresses: ServiceAddress[];
  txt: TxtEntry[];
  online: boolean;
  firstSeen: number;
  lastSeen: number;
  updates: number;
}

export type DiscoveryEvent
  = | { kind: 'upserted'; revision: number; service: ServiceRecord }
    | { kind: 'cleared'; revision: number }
    | { kind: 'typeDiscovered'; revision: number; serviceType: string };

export interface Snapshot {
  revision: number;
  startedAt: number;
  types: string[];
  services: ServiceRecord[];
}
