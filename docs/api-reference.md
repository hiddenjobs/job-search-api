# API reference

Base URL:

```text
https://api.hiddenjobs.dev/v1
```

The same contract is available as an [OpenAPI 3.1 document](https://api.hiddenjobs.dev/v1/openapi.json) and in the live [developer documentation](https://hiddenjobs.dev/api/docs).

## Authentication

Send the API key on every protected request:

```http
Authorization: Bearer hj_live_...
```

The `/health` endpoint is public. Search and account endpoints require the scope shown below. The application-link endpoint also requires an active subscription for the key owner.

## `GET /health`

Returns the API version without authentication.

```json
{
  "data": {
    "status": "ok",
    "version": "1"
  }
}
```

## `GET /jobs`

Searches active remote jobs. Requires `jobs:read`.

### Query parameters

| Parameter | Type | Default | Description |
| --- | --- | --- | --- |
| `q` or `query` | string | empty | Keywords, role, skills, or company, up to 120 characters |
| `category` | string | `All` | Job category |
| `employmentType` | string | `All` | `Full-time` or `Part-time` |
| `jobType` | string | `All` | `Permanent` or `Freelance` |
| `remoteLocation` or `location` | string | `All` | For example `Worldwide`, `Europe`, `Spain`, or `Germany` |
| `page` | integer | `1` | Page number from `1` |
| `limit` | integer | `20` | Results per page from `1` to `50` |

Supported categories include `Frontend`, `Backend`, `Full Stack`, `DevOps`, `Mobile`, `Data Scientist`, `Data Analyst`, `Data Engineer`, `MLOps`, `AI Engineer`, `Design`, `Video`, `Support`, `Project Management`, and `Other`.

Example:

```bash
curl -G "https://api.hiddenjobs.dev/v1/jobs" \
  --data-urlencode "q=typescript" \
  --data-urlencode "remoteLocation=Europe" \
  --data-urlencode "page=1" \
  --data-urlencode "limit=10" \
  -H "Authorization: Bearer hj_live_..."
```

### Response

```json
{
  "data": {
    "jobs": [
      {
        "id": "job-uuid",
        "slug": "senior-typescript-engineer",
        "title": "Senior TypeScript Engineer",
        "description": "Full job description...",
        "descriptionPreview": "Full job description...",
        "salary": "Not specified",
        "company": "Example Co",
        "companySlug": "example-co",
        "location": "Europe",
        "category": "Backend",
        "employmentType": "Full-time",
        "jobType": "Permanent",
        "createdAt": "2026-01-15T10:00:00.000Z",
        "updatedAt": null,
        "validThrough": null,
        "experienceLevel": "Senior",
        "skills": ["TypeScript", "Node.js"],
        "remoteScope": "regional",
        "remoteLocationCodes": ["EUROPE"],
        "remoteLocationLabel": "Europe",
        "hasApplicationLink": true
      }
    ],
    "totalCount": 1,
    "page": 1,
    "limit": 10,
    "hasMore": false
  }
}
```

The response does not include `url`, `application_url`, or `source_url`.

## `GET /jobs/{idOrSlug}`

Returns the public fields and full description for one active job. `idOrSlug` can be the UUID or the `slug` returned by search. Requires `jobs:read`.

```bash
curl "https://api.hiddenjobs.dev/v1/jobs/senior-typescript-engineer" \
  -H "Authorization: Bearer hj_live_..."
```

The response uses the same job object as search. The original application destination is never included.

## `POST /jobs/{idOrSlug}/application-link`

Returns the original application URL for an active job. This is the only endpoint that returns that URL.

Requirements:

- The API key has `application-links:read`
- The API key owner has an active subscription

```bash
curl -X POST \
  "https://api.hiddenjobs.dev/v1/jobs/senior-typescript-engineer/application-link" \
  -H "Authorization: Bearer hj_live_..."
```

Successful response:

```json
{
  "data": {
    "url": "https://example.com/apply"
  }
}
```

The response is private and must not be cached. Without an active subscription, the API returns `402`:

```json
{
  "error": "An active subscription is required to access application links.",
  "code": "subscription_required",
  "paymentRequired": true
}
```

## `GET /me`

Returns the identity, scopes, and limits for the current API key. Requires `account:read`.

```json
{
  "data": {
    "apiKeyId": "key-uuid",
    "scopes": ["jobs:read", "application-links:read"],
    "requestsPerMinute": 60,
    "monthlyRequestLimit": null
  }
}
```

## `GET /me/usage`

Returns current usage and limits for the current month. Requires `account:read`.

```json
{
  "data": {
    "monthlyUsageCount": 42,
    "monthlyRequestLimit": null,
    "requestsPerMinute": 60,
    "monthlyUsageMonth": "2026-01-01"
  }
}
```

## Errors

All errors are JSON. Use `code` for programmatic handling when it is present.

| Status | Code | Meaning |
| --- | --- | --- |
| `401` | `missing`, `invalid`, `revoked`, or `expired` | The API key is missing or cannot be used |
| `402` | `subscription_required` | An active subscription is required for an application link |
| `403` | `insufficient_scope` | The key does not have the required scope |
| `403` | `paused` | The key has been paused |
| `404` | — | The route, job, or application link was not found |
| `429` | `rate_limit` or `monthly_limit` | A usage limit was reached |
| `503` | `backend_error` | Key authentication is temporarily unavailable |

For `429`, respect the `Retry-After` header when present.
