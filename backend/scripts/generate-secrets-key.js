import { randomBytes } from 'node:crypto';
// Run once. Save this key securely; do not commit to Git or paste into chat.
console.log(randomBytes(32).toString('hex'));
