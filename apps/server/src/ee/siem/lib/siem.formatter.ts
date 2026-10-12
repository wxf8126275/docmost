import {
  ISiemConfig,
  ISiemSecrets,
  SiemAuditEvent,
  SiemDestinationType,
} from '../types/siem.types';

export interface DeliverRequest {
  url: string;
  headers: Record<string, string>;
  body: string;
  rejectUnauthorized: boolean;
}

function mergeSecrets(
  config: Record<string, unknown>,
  secrets: Record<string, string> = {},
): Record<string, unknown> {
  return { ...config, ...secrets };
}

/** A minimal synthetic event used by the "test destination" endpoint. */
export const SAMPLE_SIEM_EVENT: SiemAuditEvent = {
  id: '00000000-0000-0000-0000-000000000000',
  workspaceId: 'test-workspace',
  actorId: 'test-actor',
  actorType: 'user',
  event: 'siem.test',
  resourceType: 'workspace',
  resourceId: 'test-workspace',
  spaceId: null,
  changes: null,
  metadata: { probe: true },
  ipAddress: null,
  userAgent: null,
  createdAt: new Date(0).toISOString(),
};

/**
 * Build the outbound HTTP request for a given destination type. Secrets are
 * merged into the request (auth header / API key / HEC token) but never left in
 * the returned `config` shape.
 */
export function buildDeliverRequest(
  type: SiemDestinationType,
  config: Record<string, unknown>,
  secrets: Record<string, string>,
  event: SiemAuditEvent,
): DeliverRequest {
  const merged = mergeSecrets(config, secrets) as Record<string, any>;

  if (type === 'http') {
    const format: 'json' | 'ndjson' = merged.format === 'ndjson' ? 'ndjson' : 'json';
    const body = format === 'ndjson' ? JSON.stringify(event) + '\n' : JSON.stringify(event);
    const headers: Record<string, string> = {
      'Content-Type': format === 'ndjson' ? 'application/x-ndjson' : 'application/json',
    };
    const authValue = merged.authHeaderValue;
    if (merged.authHeaderName && authValue) {
      headers[merged.authHeaderName] = merged.authHeaderPrefix
        ? `${merged.authHeaderPrefix} ${authValue}`
        : authValue;
    }
    return {
      url: merged.url,
      headers,
      body,
      rejectUnauthorized: merged.tls?.rejectUnauthorized ?? true,
    };
  }

  if (type === 'datadog') {
    const body = JSON.stringify({
      message: JSON.stringify(event),
      ddsource: 'docmost',
      service: merged.service ?? 'docmost',
      ddtags: merged.tags ?? '',
    });
    return {
      url: `https://${merged.site}/api/v2/logs`,
      headers: {
        'DD-API-KEY': secrets.apiKey ?? '',
        'Content-Type': 'application/json',
      },
      body,
      rejectUnauthorized: true,
    };
  }

  // splunk_hec
  const base = merged.url.endsWith('/services/collector/event')
    ? merged.url
    : `${merged.url.replace(/\/$/, '')}/services/collector/event`;
  const body = JSON.stringify({
    event,
    index: merged.index,
    source: merged.source,
    sourcetype: merged.sourcetype,
    host: merged.host,
  });
  return {
    url: base,
    headers: {
      Authorization: `Splunk ${secrets.token ?? ''}`,
      'Content-Type': 'application/json',
    },
    body,
    rejectUnauthorized: merged.tls?.rejectUnauthorized ?? true,
  };
}
