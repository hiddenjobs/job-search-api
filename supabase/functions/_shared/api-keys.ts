import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

export const API_KEY_SCOPES = [
  'jobs:read',
  'application-links:read',
  'account:read',
] as const;

export type ApiKeyScope = (typeof API_KEY_SCOPES)[number];

export type ApiKeyAuth = {
  ok: boolean;
  reason?: string;
  apiKeyId?: string;
  userId?: string;
  scopes?: string[];
  requestsPerMinute?: number;
  monthlyRequestLimit?: number | null;
  monthlyUsageCount?: number;
  monthlyUsageMonth?: string;
  retryAfter?: number;
};

const API_KEY_PREFIX = 'hj_live_';

const toBase64Url = (bytes: Uint8Array) => {
  let binary = '';
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });

  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
};

export const generateApiKey = () => {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return `${API_KEY_PREFIX}${toBase64Url(bytes)}`;
};

export const hashApiKey = async (apiKey: string) => {
  const digest = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(apiKey),
  );

  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
};

export const getBearerToken = (req: Request) => {
  const authorization = req.headers.get('Authorization') || '';
  const match = authorization.match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() || '';
};

export const authenticateApiKey = async (
  supabase: SupabaseClient,
  req: Request,
  scope: ApiKeyScope | null = null,
): Promise<ApiKeyAuth> => {
  const apiKey = getBearerToken(req);
  if (!apiKey || !apiKey.startsWith(API_KEY_PREFIX)) {
    return { ok: false, reason: 'missing' };
  }

  const keyHash = await hashApiKey(apiKey);
  const { data, error } = await supabase.rpc('consume_user_api_key', {
    p_key_hash: keyHash,
    p_scope: scope,
  });

  if (error) {
    console.error('[api-key] authentication lookup failed:', error.message);
    return { ok: false, reason: 'backend_error' };
  }

  if (!data || typeof data !== 'object') {
    return { ok: false, reason: 'invalid' };
  }

  return data as ApiKeyAuth;
};

export const isApiKeyScope = (value: unknown): value is ApiKeyScope =>
  typeof value === 'string' && API_KEY_SCOPES.includes(value as ApiKeyScope);

export const normalizeApiKeyScopes = (value: unknown) => {
  const requested = Array.isArray(value)
    ? value.filter(isApiKeyScope)
    : [];
  const scopes = Array.from(new Set(requested));

  return scopes.length > 0 ? scopes : [...API_KEY_SCOPES];
};

export const apiKeyPublicPrefix = (apiKey: string) => apiKey.slice(0, 16);
