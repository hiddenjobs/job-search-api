#!/usr/bin/env python3

import json
import os
import urllib.parse
import urllib.request


API_BASE_URL = os.environ.get("JOB_SEARCH_API_BASE_URL", "https://api.hiddenjobs.dev/v1").rstrip("/")
API_KEY = os.environ.get("JOB_SEARCH_API_KEY", "").strip()

if not API_KEY:
    raise SystemExit("Set JOB_SEARCH_API_KEY before running this example.")


def request(path):
    request = urllib.request.Request(
        f"{API_BASE_URL}{path}",
        headers={
            "Accept": "application/json",
            "Authorization": f"Bearer {API_KEY}",
        },
    )
    with urllib.request.urlopen(request) as response:
        return json.load(response)


params = urllib.parse.urlencode({
    "q": "typescript",
    "remoteLocation": "Europe",
    "limit": "5",
})
search = request(f"/jobs?{params}")
jobs = search.get("data", {}).get("jobs", [])

print(json.dumps({
    "totalCount": search.get("data", {}).get("totalCount", 0),
    "jobs": [
        {
            "id": job.get("id"),
            "slug": job.get("slug"),
            "title": job.get("title"),
            "company": job.get("company"),
            "location": job.get("location"),
            "hasApplicationLink": job.get("hasApplicationLink"),
        }
        for job in jobs
    ],
}, indent=2))

if jobs:
    identifier = urllib.parse.quote(str(jobs[0].get("id") or jobs[0].get("slug")), safe="")
    detail = request(f"/jobs/{identifier}")
    print(json.dumps({
        "selectedJob": {
            "id": detail.get("data", {}).get("id"),
            "title": detail.get("data", {}).get("title"),
            "descriptionPreview": detail.get("data", {}).get("descriptionPreview"),
        },
    }, indent=2))
