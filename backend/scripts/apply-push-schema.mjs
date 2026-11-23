import { readFileSync, writeFileSync, copyFileSync } from 'node:fs';
import { join } from 'node:path';
const path = join(process.cwd(), 'prisma', 'schema.prisma');
let schema = readFileSync(path, 'utf8');
if (schema.includes('model PushSubscription {')) { console.log('Web Push schema already present.'); process.exit(0); }
for (const model of ['User', 'Notification']) {
  const expression = new RegExp(`model ${model} \\{`);
  if (!expression.test(schema)) throw new Error(`Missing model ${model}; schema unchanged`);
}
copyFileSync(path, `${path}.before-push-v31.bak`);
schema = schema.replace(/model User \{/, 'model User {\n  pushSubscriptions PushSubscription[]');
schema = schema.replace(/model Notification \{/, 'model Notification {\n  pushDeliveries PushDelivery[]');
schema += `
// Web Push v3.1 — browser subscriptions and persistent delivery queue.
enum PushDeliveryStatus {
  PENDING
  PROCESSING
  SENT
  FAILED
}

model PushSubscription {
  id        String   @id @default(uuid()) @db.Uuid
  userId    String   @map("user_id") @db.Uuid
  endpoint  String   @unique
  p256dh    String
  auth      String
  createdAt DateTime @default(now()) @map("created_at") @db.Timestamptz(3)
  updatedAt DateTime @updatedAt @map("updated_at") @db.Timestamptz(3)

  user       User           @relation(fields: [userId], references: [id], onDelete: Cascade)
  deliveries PushDelivery[]

  @@index([userId])
  @@map("push_subscriptions")
}

model PushDelivery {
  id             String             @id @default(uuid()) @db.Uuid
  notificationId String             @map("notification_id") @db.Uuid
  subscriptionId String             @map("subscription_id") @db.Uuid
  status         PushDeliveryStatus @default(PENDING)
  attempts       Int                @default(0)
  nextAttemptAt  DateTime           @default(now()) @map("next_attempt_at") @db.Timestamptz(3)
  lockedAt       DateTime?          @map("locked_at") @db.Timestamptz(3)
  lastError      String?            @map("last_error") @db.VarChar(80)
  createdAt      DateTime           @default(now()) @map("created_at") @db.Timestamptz(3)

  notification Notification @relation(fields: [notificationId], references: [id], onDelete: Cascade)
  subscription PushSubscription @relation(fields: [subscriptionId], references: [id], onDelete: Cascade)

  @@unique([notificationId, subscriptionId])
  @@index([status, nextAttemptAt])
  @@map("push_deliveries")
}
`;
writeFileSync(path, schema);
console.log('Patched prisma/schema.prisma. Backup:', `${path}.before-push-v31.bak`);
