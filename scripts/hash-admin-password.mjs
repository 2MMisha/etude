// Prints the SHA-256 hex hash of a password, for src/lib/adminConfig.ts.
// Usage: node scripts/hash-admin-password.mjs "your new password"
import { createHash } from 'node:crypto';

const password = process.argv[2];
if (!password) {
  console.error('Usage: node scripts/hash-admin-password.mjs "your new password"');
  process.exit(1);
}
console.log(createHash('sha256').update(password, 'utf8').digest('hex'));
