const apiBaseUrl = (Deno.env.get('HIDDEN_JOBS_API_URL') || 'https://api.hiddenjobs.dev/v1').replace(
  /\/$/,
  '',
);
const apiKey = Deno.env.get('HIDDEN_JOBS_API_KEY')?.trim();

if (!apiKey) {
  throw new Error('Set HIDDEN_JOBS_API_KEY to run the authenticated smoke test.');
}

const asRecord = (value: unknown) =>
  value && typeof value === 'object' ? value as Record<string, unknown> : {};

const request = async (path: string, method = 'GET') => {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    method,
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
  });
  const payload = await response.json().catch(() => null);
  return { response, payload };
};

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const health = await request('/health');
assert(health.response.ok, `health failed with HTTP ${health.response.status}`);
assert(asRecord(health.payload).data, 'health returned no data.');

const params = new URLSearchParams({ q: 'typescript', limit: '1' });
const search = await request(`/jobs?${params}`);
assert(search.response.ok, `jobs search failed with HTTP ${search.response.status}`);

const searchData = asRecord(asRecord(search.payload).data);
const jobs = Array.isArray(searchData.jobs)
  ? searchData.jobs as Array<Record<string, unknown>>
  : [];
assert(jobs.length > 0, 'jobs search returned no test job.');

const firstJob = jobs[0];
const identifier = typeof firstJob.id === 'string'
  ? firstJob.id
  : typeof firstJob.slug === 'string'
  ? firstJob.slug
  : '';
assert(identifier, 'jobs search returned a job without an id or slug.');

for (const field of ['url', 'application_url', 'source_url']) {
  assert(!(field in firstJob), `public job response exposed ${field}.`);
}

const detail = await request(`/jobs/${encodeURIComponent(identifier)}`);
assert(detail.response.ok, `job detail failed with HTTP ${detail.response.status}`);
const detailData = asRecord(asRecord(detail.payload).data);
assert(typeof detailData.title === 'string', 'job detail returned no title.');
for (const field of ['url', 'application_url', 'source_url']) {
  assert(!(field in detailData), `job detail exposed ${field}.`);
}

if (Deno.env.get('CHECK_APPLICATION_LINK') === 'true') {
  const applicationLink = await request(
    `/jobs/${encodeURIComponent(identifier)}/application-link`,
    'POST',
  );
  const payload = asRecord(applicationLink.payload);
  const data = asRecord(payload.data);
  const hasUrl = typeof data.url === 'string' && /^https?:\/\//i.test(data.url);
  const isExpectedSubscriptionGate = applicationLink.response.status === 402 &&
    payload.code === 'subscription_required';
  assert(
    hasUrl || isExpectedSubscriptionGate,
    `application link returned unexpected HTTP ${applicationLink.response.status}`,
  );
  console.log(`application link: ${hasUrl ? 'authorized' : 'subscription gate'}`);
}

console.log(
  `API smoke test passed: ${jobs.length} job returned and public URL fields stayed protected.`,
);
