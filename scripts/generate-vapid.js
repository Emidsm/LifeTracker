// Run: node scripts/generate-vapid.js
import { webcrypto } from 'crypto';
const { subtle } = webcrypto;

const kp = await subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify']);

const pubRaw    = await subtle.exportKey('raw',  kp.publicKey);
const pubJwk    = await subtle.exportKey('jwk',  kp.publicKey);
const privJwk   = await subtle.exportKey('jwk',  kp.privateKey);

const pubB64    = Buffer.from(pubRaw).toString('base64url');

console.log('\n=== VAPID Keys ===\n');
console.log('VAPID_PUBLIC_KEY (client applicationServerKey):');
console.log(pubB64);
console.log('\nVAPID_PUBLIC_KEY_JWK (for reference):');
console.log(JSON.stringify(pubJwk));
console.log('\nVAPID_PRIVATE_KEY_JWK (secret — next step):');
console.log(JSON.stringify(privJwk));
console.log('\n=== Next steps ===');
console.log('1. wrangler secret put VAPID_PUBLIC_KEY');
console.log('   Paste:', pubB64);
console.log('\n2. wrangler secret put VAPID_PRIVATE_KEY_JWK');
console.log('   Paste the VAPID_PRIVATE_KEY_JWK value above');
