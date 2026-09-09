import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';
import { type ApiKeyAuth, authenticateApiKey } from '../_shared/api-keys.ts';
import { corsHeaders, jsonResponse } from '../_shared/cors.ts';
import {
  getApplicationLink,
  getPublicJob,
  hasActiveSubscription,
  normalizeJobsSearchParams,
  searchPublicJobs,
} from '../_shared/jobs-api.ts';
import { getOpenApiDocument } from '../_shared/openapi.ts';

const supabaseUrl = Deno.env.get('SUPABASE_URL');
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
const apiVersion = '1';

const supabase = supabaseUrl && serviceRoleKey
  ? createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  })
  : null;

const responseHeaders = {
  'Cache-Control': 'no-store',
  'X-API-Version': apiVersion,
};

const apiResponse = (body: unknown, status = 200, extraHeaders: Record<string, string> = {}) =>
  jsonResponse(body, status, { ...responseHeaders, ...extraHeaders });

const getRoute = (req: Request) => {
  const segments = new URL(req.url).pathname.split('/').filter(Boolean);
  const functionIndex = segments.lastIndexOf('api-v1');
  if (functionIndex >= 0) return segments.slice(functionIndex + 1);

  const versionIndex = segments.lastIndexOf('v1');
  if (versionIndex >= 0) return segments.slice(versionIndex + 1);

  return segments;
};

const getApiBaseUrl = () => {
  const configuredApiUrl = Deno.env.get('PUBLIC_API_BASE_URL')?.trim();
  if (configuredApiUrl) return configuredApiUrl.replace(/\/$/, '');

  const publicSiteUrl = Deno.env.get('PUBLIC_SITE_URL')?.trim();
  return publicSiteUrl
    ? `${publicSiteUrl.replace(/\/$/, '')}/api/v1`
    : `${(supabaseUrl || '').replace(/\/$/, '')}/functions/v1/api-v1`;
};

const authErrorResponse = (auth: ApiKeyAuth) => {
  if (auth.reason === 'backend_error') {
    return apiResponse({ error: 'API authentication is temporarily unavailable.' }, 503);
  }

  if (auth.reason === 'scope') {
    return apiResponse({
      error: 'This API key does not have the required scope.',
      code: 'insufficient_scope',
    }, 403);
  }

  if (auth.reason === 'paused') {
    return apiResponse({ error: 'This API key is paused.', code: 'paused' }, 403);
  }

  if (auth.reason === 'rate_limit' || auth.reason === 'monthly_limit') {
    const retryAfter = auth.retryAfter ? String(Math.max(1, auth.retryAfter)) : undefined;
    return apiResponse(
      {
        error: auth.reason === 'monthly_limit'
          ? 'This API key has reached its monthly request limit.'
          : 'This API key is being rate limited.',
        code: auth.reason,
      },
      429,
      retryAfter ? { 'Retry-After': retryAfter } : {},
    );
  }

  return apiResponse(
    { error: 'A valid job-search API key is required.', code: auth.reason || 'unauthorized' },
    401,
    { 'WWW-Authenticate': 'Bearer' },
  );
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (!supabase) {
    return apiResponse({ error: 'API is not configured.' }, 500);
  }

  const route = getRoute(req);
  const method = req.method.toUpperCase();

  if (method === 'GET' && (route[0] === 'health' || route.length === 0)) {
    return apiResponse({ data: { status: 'ok', version: apiVersion } }, 200, {
      'Cache-Control': 'no-cache',
    });
  }

  if (method === 'GET' && (route[0] === 'openapi' || route[0] === 'openapi.json')) {
    return apiResponse(getOpenApiDocument(getApiBaseUrl()), 200, {
      'Cache-Control': 'public, max-age=300',
    });
  }

  if (route.length === 0) {
    return apiResponse({ error: 'Not found.' }, 404);
  }

  if (route[0] === 'jobs' && route.length === 1 && method === 'GET') {
    const auth = await authenticateApiKey(supabase, req, 'jobs:read');
    if (!auth.ok) return authErrorResponse(auth);

    try {
      const result = await searchPublicJobs(
        supabase,
        normalizeJobsSearchParams(new URL(req.url).searchParams),
      );
      return apiResponse({ data: result });
    } catch (error) {
      console.error('[api-v1] job search failed:', error instanceof Error ? error.message : error);
      return apiResponse({ error: 'Unable to search jobs.' }, 500);
    }
  }

  if (route[0] === 'jobs' && route.length === 2 && method === 'GET') {
    const auth = await authenticateApiKey(supabase, req, 'jobs:read');
    if (!auth.ok) return authErrorResponse(auth);

    try {
      const job = await getPublicJob(supabase, decodeURIComponent(route[1]));
      if (!job) return apiResponse({ error: 'Job not found.' }, 404);
      return apiResponse({ data: job });
    } catch (error) {
      console.error('[api-v1] job detail failed:', error instanceof Error ? error.message : error);
      return apiResponse({ error: 'Unable to load this job.' }, 500);
    }
  }

  if (
    route[0] === 'jobs' && route.length === 3 && route[2] === 'application-link' &&
    method === 'POST'
  ) {
    const auth = await authenticateApiKey(supabase, req, 'application-links:read');
    if (!auth.ok) return authErrorResponse(auth);
    if (!auth.userId) return apiResponse({ error: 'API key owner could not be identified.' }, 401);

    if (!await hasActiveSubscription(supabase, auth.userId)) {
      return apiResponse({
        error: 'An active job-search subscription is required to access application links.',
        code: 'subscription_required',
        paymentRequired: true,
      }, 402);
    }

    try {
      const url = await getApplicationLink(supabase, decodeURIComponent(route[1]));
      if (!url) return apiResponse({ error: 'Application link not found.' }, 404);

      return apiResponse({ data: { url } }, 200, {
        'Cache-Control': 'no-store, private',
      });
    } catch (error) {
      console.error(
        '[api-v1] application link failed:',
        error instanceof Error ? error.message : error,
      );
      return apiResponse({ error: 'Unable to load the application link.' }, 500);
    }
  }

  if (route[0] === 'me' && route.length === 1 && method === 'GET') {
    const auth = await authenticateApiKey(supabase, req, 'account:read');
    if (!auth.ok) return authErrorResponse(auth);

    return apiResponse({
      data: {
        apiKeyId: auth.apiKeyId,
        scopes: auth.scopes || [],
        requestsPerMinute: auth.requestsPerMinute,
        monthlyRequestLimit: auth.monthlyRequestLimit ?? null,
      },
    });
  }

  if (route[0] === 'me' && route[1] === 'usage' && route.length === 2 && method === 'GET') {
    const auth = await authenticateApiKey(supabase, req, 'account:read');
    if (!auth.ok) return authErrorResponse(auth);

    return apiResponse({
      data: {
        monthlyUsageCount: auth.monthlyUsageCount ?? 0,
        monthlyRequestLimit: auth.monthlyRequestLimit ?? null,
        requestsPerMinute: auth.requestsPerMinute ?? null,
        monthlyUsageMonth: auth.monthlyUsageMonth ?? null,
      },
    });
  }

  return apiResponse({ error: 'Not found.' }, 404);
});
