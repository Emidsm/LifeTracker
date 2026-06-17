function b64u(data) {
  const bytes = data instanceof Uint8Array ? data : new Uint8Array(data);
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

function fromB64u(str) {
  const b64 = str.replace(/-/g, '+').replace(/_/g, '/');
  const pad = (4 - b64.length % 4) % 4;
  const bin = atob(b64 + '='.repeat(pad));
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function concat(...parts) {
  const arrays = parts.map(p => p instanceof Uint8Array ? p : new Uint8Array(p));
  const total = arrays.reduce((n, a) => n + a.length, 0);
  const out = new Uint8Array(total);
  let i = 0;
  for (const a of arrays) { out.set(a, i); i += a.length; }
  return out;
}

async function hkdf(salt, ikm, info, length) {
  const key = await crypto.subtle.importKey(
    'raw',
    ikm instanceof Uint8Array ? ikm : new Uint8Array(ikm),
    { name: 'HKDF' }, false, ['deriveBits']
  );
  const derived = await crypto.subtle.deriveBits(
    {
      name: 'HKDF',
      hash: 'SHA-256',
      salt: salt instanceof Uint8Array ? salt : new Uint8Array(salt),
      info: info instanceof Uint8Array ? info : new Uint8Array(info),
    },
    key,
    length * 8
  );
  return new Uint8Array(derived);
}

async function makeVapidJwt(endpoint, privateKeyJwk, publicKeyB64, subject) {
  const audience = new URL(endpoint).origin;
  const now = Math.floor(Date.now() / 1000);
  const enc = new TextEncoder();

  const hdr = b64u(enc.encode(JSON.stringify({ typ: 'JWT', alg: 'ES256' })));
  const pay = b64u(enc.encode(JSON.stringify({ aud: audience, exp: now + 43200, sub: subject })));
  const toSign = enc.encode(`${hdr}.${pay}`);

  const key = await crypto.subtle.importKey(
    'jwk', privateKeyJwk,
    { name: 'ECDSA', namedCurve: 'P-256' },
    false, ['sign']
  );

  const sig = await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, key, toSign);
  return `${hdr}.${pay}.${b64u(new Uint8Array(sig))}`;
}

export async function sendPush(subscription, messageStr, privateKeyJwk, publicKeyB64, subject) {
  const { endpoint, keys } = subscription;
  const uaPublic = fromB64u(keys.p256dh);
  const authSecret = fromB64u(keys.auth);

  // Ephemeral ECDH keypair
  const serverKP = await crypto.subtle.generateKey(
    { name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']
  );
  const serverPubRaw = new Uint8Array(await crypto.subtle.exportKey('raw', serverKP.publicKey));

  const uaKey = await crypto.subtle.importKey(
    'raw', uaPublic, { name: 'ECDH', namedCurve: 'P-256' }, false, []
  );
  const sharedSecret = new Uint8Array(
    await crypto.subtle.deriveBits({ name: 'ECDH', public: uaKey }, serverKP.privateKey, 256)
  );

  // RFC 8291 IKM
  const enc = new TextEncoder();
  const info_key = concat(enc.encode('WebPush: info\x00'), uaPublic, serverPubRaw);
  const ikm = await hkdf(authSecret, sharedSecret, info_key, 32);

  // RFC 8188 encryption
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const cek = await hkdf(salt, ikm, enc.encode('Content-Encoding: aes128gcm\x00'), 16);
  const nonce = await hkdf(salt, ikm, enc.encode('Content-Encoding: nonce\x00'), 12);

  const aesKey = await crypto.subtle.importKey('raw', cek, { name: 'AES-GCM' }, false, ['encrypt']);
  const plaintext = concat(enc.encode(messageStr), new Uint8Array([0x02]));
  const ciphertext = new Uint8Array(
    await crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonce }, aesKey, plaintext)
  );

  // aes128gcm body: salt(16) || rs(4) || idlen(1) || server_pub(65) || ciphertext
  const rs = new Uint8Array(4);
  new DataView(rs.buffer).setUint32(0, 4096, false);
  const body = concat(salt, rs, new Uint8Array([65]), serverPubRaw, ciphertext);

  const jwt = await makeVapidJwt(endpoint, privateKeyJwk, publicKeyB64, subject);

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      Authorization: `vapid t=${jwt},k=${publicKeyB64}`,
      'Content-Type': 'application/octet-stream',
      'Content-Encoding': 'aes128gcm',
      TTL: '86400',
    },
    body,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Push ${res.status}: ${text}`);
  }
}
