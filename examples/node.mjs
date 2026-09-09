const apiBaseUrl = (process.env.JOB_SEARCH_API_BASE_URL || 'https://api.hiddenjobs.dev/v1').replace(/\/$/, '')
const apiKey = process.env.JOB_SEARCH_API_KEY?.trim()

if (!apiKey) {
  throw new Error('Set JOB_SEARCH_API_KEY before running this example.')
}

const request = async (path) => {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
  })
  const payload = await response.json()
  if (!response.ok) throw new Error(`API request failed with HTTP ${response.status}`)
  return payload
}

const params = new URLSearchParams({
  q: 'typescript',
  remoteLocation: 'Europe',
  limit: '5',
})
const search = await request(`/jobs?${params}`)
const jobs = search.data?.jobs || []

console.log(JSON.stringify({
  totalCount: search.data?.totalCount ?? 0,
  jobs: jobs.map(({ id, slug, title, company, location, hasApplicationLink }) => ({
    id,
    slug,
    title,
    company,
    location,
    hasApplicationLink,
  })),
}, null, 2))

if (jobs[0]?.id || jobs[0]?.slug) {
  const identifier = encodeURIComponent(jobs[0].id || jobs[0].slug)
  const detail = await request(`/jobs/${identifier}`)
  console.log(JSON.stringify({
    selectedJob: {
      id: detail.data?.id,
      title: detail.data?.title,
      descriptionPreview: detail.data?.descriptionPreview,
    },
  }, null, 2))
}
