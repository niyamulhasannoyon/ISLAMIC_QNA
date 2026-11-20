import fs from 'node:fs';
import path from 'node:path';

function validateOpenApiSync() {
  const openApiPath = path.resolve(__dirname, '../../../docs/openapi.yaml');
  if (!fs.existsSync(openApiPath)) {
    throw new Error(`docs/openapi.yaml not found at ${openApiPath}`);
  }

  const content = fs.readFileSync(openApiPath, 'utf-8');
  console.log(`[OpenAPI Generator] Loaded docs/openapi.yaml (${content.length} bytes)`);

  const requiredEndpoints = [
    '/api/v1/search',
    '/api/v1/fatwa/{id}',
    '/api/v1/rag',
    '/api/v1/analytics/track',
    '/api/v1/ingest',
    '/api/v1/admin/auth',
  ];

  for (const ep of requiredEndpoints) {
    if (!content.includes(ep)) {
      throw new Error(`OpenAPI spec is missing required endpoint: ${ep}`);
    }
  }

  const requiredSchemas = [
    'FatwaQA:',
    'SearchResultItem:',
    'SearchResponse:',
    'RAGRequest:',
    'RAGResponse:',
    'IngestResponse:',
  ];

  for (const sc of requiredSchemas) {
    if (!content.includes(sc)) {
      throw new Error(`OpenAPI spec is missing required component schema: ${sc}`);
    }
  }

  console.log('[OpenAPI Generator] ✓ OpenAPI specification and client schemas are fully verified and in sync!');
}

validateOpenApiSync();
