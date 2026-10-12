export const Feature = {
  SSO_CUSTOM: 'sso:custom',
  SSO_GOOGLE: 'sso:google',
  MFA: 'mfa',
  API_KEYS: 'api:keys',
  COMMENT_RESOLUTION: 'comment:resolution',
  PAGE_PERMISSIONS: 'page:permissions',
  AI: 'ai',
  CONFLUENCE_IMPORT: 'import:confluence',
  DOCX_IMPORT: 'import:docx',
  PDF_IMPORT: 'import:pdf',
  ATTACHMENT_INDEXING: 'attachment:indexing',
  SECURITY_SETTINGS: 'security:settings',
  MCP: 'mcp',
  SCIM: 'scim',
  PAGE_VERIFICATION: 'page:verification',
  AUDIT_LOGS: 'audit:logs',
  RETENTION: 'retention',
  SHARING_CONTROLS: 'sharing:controls',
  TEMPLATES: 'templates',
  VIEWER_COMMENTS: 'comment:viewer',
  PERSONAL_SPACES: 'spaces:personal',
  DOCX_EXPORT: 'export:docx',
  BASES: 'bases',
  OAUTH: 'oauth',
  AI_CONTROLS: 'ai:controls',
  MCP_CONTROLS: 'mcp:controls',
  PUBLIC_SPACE_APPEARANCE: 'public-space:appearance',
  SIEM: 'siem',
} as const;

/**
 * Features that are available in the self-hosted community build without an
 * enterprise license. API keys are implemented in the community backend
 * (apps/server/src/ee/api-key), so we treat them as enabled here to keep the
 * settings UI (sidebar entry + admin-only toggle) usable without a license.
 */
export const COMMUNITY_FEATURES: string[] = [
  Feature.API_KEYS,
  Feature.AUDIT_LOGS,
  Feature.SIEM,
  // AI settings page (toggles) and AI Chat are implemented in the core backend
  // (no enterprise license required), so self-hosted community instances can
  // enable and use them. AI Search / Generative AI backends remain unimplemented
  // and only persist their toggle flag.
  Feature.AI,
  Feature.AI_CONTROLS,
  // Page verification backend/UI is implemented in the community build, so the
  // settings "Verified pages" module is usable without an enterprise license.
  Feature.PAGE_VERIFICATION,
];
