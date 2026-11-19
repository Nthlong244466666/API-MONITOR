// Usage: node --env-file=.env scripts/migrate-request-secrets.js [--apply]
// By default this is DRY RUN. Stop backend/schedulers before --apply.
import { prisma } from '../src/lib/prisma.js';
import {
  assertSecretsConfigured, isEncrypted, containsEncryptedHeaders,
  encryptedRequestFields,
} from '../src/lib/secretsVault.js';

const apply = process.argv.includes('--apply');
const batchSize = 100;
assertSecretsConfigured();
let cursor;
let examined = 0;
let candidates = 0;
let updated = 0;
try {
  while (true) {
    const rows = await prisma.apiRequest.findMany({
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      take: batchSize,
      orderBy: { id: 'asc' },
      select: { id: true, url: true, headers: true, body: true, updatedAt: true },
    });
    if (!rows.length) break;
    for (const row of rows) {
      examined++;
      const plain = {};
      if (!isEncrypted(row.url)) plain.url = row.url;
      if (row.headers != null && !containsEncryptedHeaders(row.headers)) plain.headers = row.headers;
      if (row.body != null && !isEncrypted(row.body)) plain.body = row.body;
      if (!Object.keys(plain).length) continue;
      candidates++;
      if (apply) {
        // Only patch still-unencrypted columns. Do not overwrite a newer write
        // if another process changed the row; shutdown is still mandatory.
        const where = { id: row.id, updatedAt: row.updatedAt };
        const changes = encryptedRequestFields(row.id, plain);
        const result = await prisma.apiRequest.updateMany({ where, data: changes });
        if (result.count !== 1) throw new Error(`Concurrent update of ${row.id}; stop services and retry`);
        updated++;
      }
    }
    cursor = rows.at(-1).id;
  }
  console.log(JSON.stringify({ mode: apply ? 'APPLY' : 'DRY_RUN', examined, candidates, updated }));
} catch (error) {
  console.error(`Migration failed: ${error.message}`);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
