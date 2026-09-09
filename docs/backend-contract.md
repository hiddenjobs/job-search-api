# Backend contract

The `api-v1` function is deployable, but it expects a private Supabase data layer behind it. This document describes only the interface the function consumes. It does not expose data or credentials.

## Environment

The function requires:

| Variable | Required | Description |
| --- | --- | --- |
| `SUPABASE_URL` | Runtime | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Server-only key used by the Edge Function |
| `SUPABASE_JOBS_TABLE` | No | Jobs table name, defaults to `jobs` |

`PUBLIC_API_BASE_URL` or `PUBLIC_SITE_URL` is optional and is used only to set the server URL in the generated OpenAPI document.

## Jobs relation

The configured jobs relation must support the fields used by [`_shared/jobs-api.ts`](../supabase/functions/_shared/jobs-api.ts):

| Field | Purpose |
| --- | --- |
| `id` | UUID identifier |
| `slug` | Human-readable identifier |
| `title` | Job title |
| `description` | Full description |
| `url` or `application_url` | Private original destination |
| `company`, `company_slug` | Employer metadata |
| `location`, `remote_scope`, `remote_location_codes`, `remote_location_label` | Remote eligibility |
| `category`, `employment_type`, `job_type` | Search filters |
| `salary`, `experience_level`, `skills` | Structured metadata |
| `created_at`, `updated_at`, `valid_through` | Lifecycle metadata |
| `is_active` | Public visibility flag |

The service-role client reads only active rows. The public mapper deliberately drops the original URL fields from normal responses.

## Search RPC

When a query contains search terms, the function calls a database RPC named `search_jobs`:

```text
search_jobs(
  p_terms,
  p_filters,
  p_limit,
  p_offset
)
```

`p_terms` is a lower-case string array. `p_filters` contains `category`, `employmentType`, `jobType`, `remoteLocation`, and `remoteLocationCodes`. The RPC should return an object shaped like:

```json
{
  "jobs": [],
  "totalCount": 0
}
```

Each returned row is mapped through the same public projection as the no-query path.

## API-key RPC

Authentication calls a database RPC named `consume_user_api_key`:

```text
consume_user_api_key(p_key_hash, p_scope)
```

The RPC should atomically validate the hashed key, enforce revocation, expiry, pause state, per-minute limits, and monthly limits, then return an object compatible with:

```json
{
  "ok": true,
  "apiKeyId": "key-uuid",
  "userId": "user-uuid",
  "scopes": ["jobs:read"],
  "requestsPerMinute": 60,
  "monthlyRequestLimit": null,
  "monthlyUsageCount": 0,
  "monthlyUsageMonth": "2026-01-01"
}
```

For a rejected request, return `ok: false` and a reason such as `missing`, `invalid`, `revoked`, `expired`, `paused`, `scope`, `rate_limit`, or `monthly_limit`.

## Subscription lookup

The application-link route calls `hasActiveSubscription`. The data layer must expose the key owner's subscription records with a status equivalent to `active`, `trialing`, or `cancelling`, plus an optional current-period end timestamp.

If no active record exists, the API returns `402 subscription_required` and does not return the original URL.
