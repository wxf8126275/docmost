import { buildDeliverRequest } from './siem.formatter';
import { SiemAuditEvent } from '../types/siem.types';

const event: SiemAuditEvent = {
  id: 'a1',
  workspaceId: 'w1',
  actorId: 'u1',
  actorType: 'user',
  event: 'user.login',
  resourceType: 'user',
  resourceId: 'u1',
  spaceId: null,
  changes: null,
  metadata: null,
  ipAddress: null,
  userAgent: null,
  createdAt: new Date().toISOString(),
};

describe('buildDeliverRequest', () => {
  it('http json merges auth header from secrets and keeps secrets out of config', () => {
    const req = buildDeliverRequest(
      'http',
      {
        url: 'https://collector.example.com/ingest',
        authHeaderName: 'Authorization',
        authHeaderPrefix: 'Bearer',
        format: 'json',
      },
      { authHeaderValue: 'secret-token' },
      event,
    );

    expect(req.url).toBe('https://collector.example.com/ingest');
    expect(req.headers['Authorization']).toBe('Bearer secret-token');
    expect(req.headers['Content-Type']).toBe('application/json');
    expect(req.body).toBe(JSON.stringify(event));
    expect(req.rejectUnauthorized).toBe(true);
  });

  it('http ndjson serializes a single line', () => {
    const req = buildDeliverRequest(
      'http',
      {
        url: 'https://x/ingest',
        authHeaderName: 'X-Auth',
        authHeaderPrefix: '',
        format: 'ndjson',
      },
      { authHeaderValue: 'k' },
      event,
    );
    expect(req.body).toBe(JSON.stringify(event) + '\n');
    expect(req.headers['X-Auth']).toBe('k');
  });

  it('datadog posts to the logs API with DD-API-KEY', () => {
    const req = buildDeliverRequest(
      'datadog',
      { site: 'datadoghq.eu', service: 'docmost', tags: 'env:prod' },
      { apiKey: 'dd-key' },
      event,
    );
    expect(req.url).toBe('https://datadoghq.eu/api/v2/logs');
    expect(req.headers['DD-API-KEY']).toBe('dd-key');
    const parsed = JSON.parse(req.body);
    expect(parsed.service).toBe('docmost');
    expect(parsed.message).toBe(JSON.stringify(event));
  });

  it('splunk_hec appends the collector path and uses Splunk token', () => {
    const req = buildDeliverRequest(
      'splunk_hec',
      {
        url: 'https://splunk.example.com:8088',
        index: 'main',
        source: 'docmost',
        sourcetype: 'docmost:audit',
        channelId: 'c1',
      },
      { token: 'hec-token' },
      event,
    );
    expect(req.url).toBe(
      'https://splunk.example.com:8088/services/collector/event',
    );
    expect(req.headers['Authorization']).toBe('Splunk hec-token');
    const parsed = JSON.parse(req.body);
    expect(parsed.index).toBe('main');
    expect(parsed.event).toEqual(event);
  });
});
