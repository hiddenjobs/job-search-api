# Client examples

The [`examples/`](../examples/) directory contains dependency-free examples for shell, Node.js, and Python. Every example reads the key from an environment variable.

## Shell

```bash
export JOB_SEARCH_API_KEY=hj_live_...
./examples/curl.sh
```

The script searches for remote TypeScript jobs and prints a small, safe summary. It does not request or print application URLs.

## Node.js

```bash
JOB_SEARCH_API_KEY=hj_live_... node examples/node.mjs
```

The Node example uses the built-in `fetch` available in modern Node versions. It searches, selects the first result, and loads its detail response.

## Python

```bash
JOB_SEARCH_API_KEY=hj_live_... python3 examples/python.py
```

The Python example uses the standard library only. It sends the key through the `Authorization` header and never writes it to output.

## Application links

Do not request an application link during ordinary search or indexing. Request it only after a user chooses to apply:

```bash
curl -X POST \
  "https://api.hiddenjobs.dev/v1/jobs/<id-or-slug>/application-link" \
  -H "Authorization: Bearer ${JOB_SEARCH_API_KEY}"
```

The key needs `application-links:read` and its owner needs an active subscription. Handle `402 subscription_required` as a product state rather than retrying it.
