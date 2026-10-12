export type SiemDestinationType = 'http' | 'splunk_hec' | 'datadog';
export type SiemDestinationStatus = 'healthy' | 'failing';

export interface IHttpConfig {
  url: string;
  authHeaderName: string;
  authHeaderPrefix: string;
  format: 'json' | 'ndjson';
  tls?: { rejectUnauthorized: boolean };
}

export interface ISplunkHecConfig {
  url: string;
  index?: string;
  source: string;
  sourcetype: string;
  host?: string;
  channelId: string;
  tls?: { rejectUnauthorized: boolean };
}

export interface IDatadogConfig {
  site: string;
  service: string;
  tags?: string;
}

export type ISiemConfig = IHttpConfig | ISplunkHecConfig | IDatadogConfig;

/** Secret values are stored encrypted; keys map 1:1 to per-type config secrets. */
export interface ISiemSecrets {
  authHeaderValue?: string; // http
  apiKey?: string; // datadog
  token?: string; // splunk_hec
}

export interface ISiemDestinationInput {
  name: string;
  type: SiemDestinationType;
  config: Record<string, unknown>;
  secrets?: Record<string, string>;
  enabled?: boolean;
}

export interface IUpdateSiemDestinationInput {
  destinationId: string;
  name?: string;
  config?: Record<string, unknown>;
  secrets?: Record<string, string>;
  enabled?: boolean;
}

export interface ITestSiemDestinationInput {
  type: SiemDestinationType;
  config: Record<string, unknown>;
  secrets?: Record<string, string>;
  destinationId?: string;
}

export interface ISiemTestResult {
  delivered: boolean;
  error?: string;
  statusCode?: number;
}

export interface ISiemDestination {
  id: string;
  name: string;
  type: SiemDestinationType;
  enabled: boolean;
  status: SiemDestinationStatus;
  config: ISiemConfig;
  hasSecrets: Record<string, boolean>;
  cursorCreatedAt: string;
  lastDeliveredAt: string | null;
  lastError: string | null;
  lastErrorAt: string | null;
  consecutiveFailures: number;
  nextAttemptAt: string | null;
  failingSince: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Audit event payload forwarded to SIEM destinations. */
export interface SiemAuditEvent {
  id: string;
  workspaceId: string;
  actorId: string | null;
  actorType: string;
  event: string;
  resourceType: string;
  resourceId: string | null;
  spaceId: string | null;
  changes: any | null;
  metadata: any | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
}
