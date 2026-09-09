# Deployment

The repository contains the `api-v1` Supabase Edge Function. It provides the REST boundary while the job catalog and access-control data remain in the private Supabase project.

## Prerequisites

- Supabase CLI installed and authenticated
- A Supabase project
- The private data layer described in [`backend-contract.md`](backend-contract.md)
- A public HTTPS origin for client requests
- Deno 2 for local checks

## Configure the project

```bash
supabase login
supabase link --project-ref <your-project-ref>
```

Set the function secrets in the Supabase project. Do not commit them:

| Variable | Required | Description |
| --- | --- | --- |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Server-only database access |
| `SUPABASE_JOBS_TABLE` | No | Jobs relation, defaults to `jobs` |
| `PUBLIC_API_BASE_URL` | Recommended | Canonical API base URL for OpenAPI, for example `https://api.example.com/v1` |
| `PUBLIC_SITE_URL` | Fallback | Site origin used when `PUBLIC_API_BASE_URL` is absent |

```bash
supabase secrets set \
  SUPABASE_SERVICE_ROLE_KEY=<server-only-key> \
  PUBLIC_API_BASE_URL=https://api.example.com/v1
```

## Deploy the function

```bash
supabase functions deploy api-v1 --no-verify-jwt
```

The `--no-verify-jwt` flag is intentional. This function authenticates the bearer API key through its own access-control RPC. Supabase JWT verification would reject server-to-server API requests before that check runs.

The direct function URL is:

```text
https://<your-project-ref>.supabase.co/functions/v1/api-v1
```

Put a trusted custom domain or reverse proxy in front of it for production. If you use a proxy, forward the `Authorization` header and do not add a service-role credential to the client-facing request.

## Local development

Use a local `.env` based on [`.env.example`](../.env.example), then start the function:

```bash
deno task start
```

The local server uses Deno's default port. Set `HIDDEN_JOBS_API_URL` to the local base URL when running the smoke test.

## Deployment checklist

- Confirm `verify_jwt = false` for `api-v1`
- Set `SUPABASE_SERVICE_ROLE_KEY` only as a server-side secret
- Confirm the jobs projection does not expose original URLs
- Verify `PUBLIC_API_BASE_URL` points to the actual public origin
- Test `/health`, authenticated search, detail, and the subscription gate
- Check `429` responses and `Retry-After` behavior
- Keep API keys and private application URLs out of logs
