/**
 * Run: npx tsx src/lib/validators.selftest.ts
 */
import { validatePassword, formatInviteCode, parseEmailList } from './validators';

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(msg);
}

assert(!validatePassword('weak').valid, 'weak should fail');
assert(validatePassword('Secure1!x').valid, 'strong should pass');
assert(formatInviteCode('ABC123') === 'ABC-123', 'code format');
assert(parseEmailList('a@b.com,c@d.com', 1).length === 1, 'email limit');

console.log('validators.selftest: OK');
