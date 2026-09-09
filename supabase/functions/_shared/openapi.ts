export const getOpenApiDocument = (serverUrl: string) => ({
  openapi: '3.1.0',
  info: {
    title: 'Job Search API',
    version: '1.0.0',
    description:
      'Search remote job information. Original application links require an active subscription.',
  },
  servers: [{ url: serverUrl }],
  security: [{ bearerApiKey: [] }],
  paths: {
    '/health': {
      get: {
        security: [],
        summary: 'Check API availability',
        responses: {
          '200': {
            description: 'API is available',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/HealthResponse' } },
            },
          },
        },
      },
    },
    '/jobs': {
      get: {
        summary: 'Search jobs',
        parameters: [
          { name: 'q', in: 'query', schema: { type: 'string', maxLength: 120 } },
          { name: 'category', in: 'query', schema: { type: 'string' } },
          { name: 'employmentType', in: 'query', schema: { type: 'string' } },
          { name: 'jobType', in: 'query', schema: { type: 'string' } },
          { name: 'remoteLocation', in: 'query', schema: { type: 'string' } },
          { name: 'page', in: 'query', schema: { type: 'integer', minimum: 1, default: 1 } },
          {
            name: 'limit',
            in: 'query',
            schema: { type: 'integer', minimum: 1, maximum: 50, default: 20 },
          },
        ],
        responses: {
          '200': {
            description: 'Public job data without the original application URL',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/JobsResponse' } },
            },
          },
          '401': { $ref: '#/components/responses/Unauthorized' },
          '429': { $ref: '#/components/responses/RateLimited' },
        },
      },
    },
    '/jobs/{idOrSlug}': {
      get: {
        summary: 'Get one job',
        parameters: [{ name: 'idOrSlug', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          '200': {
            description: 'Public job data without the original application URL',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/JobResponse' } },
            },
          },
          '404': { description: 'Job not found' },
          '401': { $ref: '#/components/responses/Unauthorized' },
        },
      },
    },
    '/jobs/{idOrSlug}/application-link': {
      post: {
        summary: 'Reveal the original application link',
        description: 'Requires the API key owner to have an active job-search subscription.',
        parameters: [{ name: 'idOrSlug', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          '200': {
            description: 'Original application URL',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApplicationLinkResponse' },
              },
            },
          },
          '401': { $ref: '#/components/responses/Unauthorized' },
          '402': { description: 'Active subscription required' },
          '404': { description: 'Application link not found' },
          '429': { $ref: '#/components/responses/RateLimited' },
        },
      },
    },
    '/me': {
      get: {
        summary: 'Get API key identity and limits',
        responses: {
          '200': {
            description: 'Current API key information',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/MeResponse' } },
            },
          },
          '401': { $ref: '#/components/responses/Unauthorized' },
        },
      },
    },
    '/me/usage': {
      get: {
        summary: 'Get API key usage',
        responses: {
          '200': {
            description: 'Current request usage and limits',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/UsageResponse' } },
            },
          },
          '401': { $ref: '#/components/responses/Unauthorized' },
        },
      },
    },
  },
  components: {
    securitySchemes: {
      bearerApiKey: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'Job Search API key',
      },
    },
    responses: {
      Unauthorized: {
        description: 'Missing, invalid, revoked, or expired API key',
      },
      RateLimited: {
        description: 'API key rate or monthly limit exceeded',
      },
    },
    schemas: {
      Job: {
        type: 'object',
        required: ['id', 'title', 'description', 'hasApplicationLink'],
        properties: {
          id: { type: 'string', format: 'uuid' },
          slug: { type: ['string', 'null'] },
          title: { type: 'string' },
          description: { type: 'string' },
          descriptionPreview: { type: 'string' },
          salary: { type: 'string' },
          company: { type: ['string', 'null'] },
          companySlug: { type: ['string', 'null'] },
          location: { type: ['string', 'null'] },
          category: { type: 'string' },
          employmentType: { type: ['string', 'null'] },
          jobType: { type: ['string', 'null'] },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: ['string', 'null'], format: 'date-time' },
          validThrough: { type: ['string', 'null'] },
          experienceLevel: { type: ['string', 'null'] },
          skills: { type: 'array', items: { type: 'string' } },
          remoteScope: { type: ['string', 'null'] },
          remoteLocationCodes: { type: 'array', items: { type: 'string' } },
          remoteLocationLabel: { type: ['string', 'null'] },
          hasApplicationLink: { type: 'boolean' },
        },
      },
      JobsResponse: {
        type: 'object',
        properties: {
          data: {
            type: 'object',
            properties: {
              jobs: { type: 'array', items: { $ref: '#/components/schemas/Job' } },
              totalCount: { type: 'integer' },
              page: { type: 'integer' },
              limit: { type: 'integer' },
              hasMore: { type: 'boolean' },
            },
          },
        },
      },
      JobResponse: {
        type: 'object',
        properties: { data: { $ref: '#/components/schemas/Job' } },
      },
      ApplicationLinkResponse: {
        type: 'object',
        properties: {
          data: { type: 'object', properties: { url: { type: 'string', format: 'uri' } } },
        },
      },
      HealthResponse: {
        type: 'object',
        properties: {
          data: {
            type: 'object',
            properties: { status: { type: 'string' }, version: { type: 'string' } },
          },
        },
      },
      MeResponse: {
        type: 'object',
        properties: {
          data: {
            type: 'object',
            properties: {
              apiKeyId: { type: 'string', format: 'uuid' },
              scopes: { type: 'array', items: { type: 'string' } },
              requestsPerMinute: { type: 'integer' },
              monthlyRequestLimit: { type: ['integer', 'null'] },
            },
          },
        },
      },
      UsageResponse: {
        type: 'object',
        properties: {
          data: {
            type: 'object',
            properties: {
              monthlyUsageCount: { type: 'integer' },
              monthlyRequestLimit: { type: ['integer', 'null'] },
              requestsPerMinute: { type: 'integer' },
              monthlyUsageMonth: { type: 'string', format: 'date' },
            },
          },
        },
      },
    },
  },
});
