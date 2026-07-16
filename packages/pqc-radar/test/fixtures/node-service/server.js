const crypto = require('node:crypto');

const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
  modulusLength: 2048,
});

const ecdh = crypto.createECDH('prime256v1');

function legacyDigest(buf) {
  return crypto.createHash('sha1').update(buf).digest('hex');
}

module.exports = { publicKey, privateKey, ecdh, legacyDigest };
