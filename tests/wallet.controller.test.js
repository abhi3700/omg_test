const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('crypto');
const {
  buildTransactionMessage,
  signTransactionPayload,
} = require('../controllers/wallet.controller');

const generateTestWallet = () => {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('ec', {
    namedCurve: 'secp256k1',
  });

  return {
    publicKeyHex: publicKey
      .export({ type: 'spki', format: 'der' })
      .toString('hex'),
    privateKeyPem: privateKey.export({ type: 'pkcs8', format: 'pem' }),
  };
};

test('buildTransactionMessage builds the same signing payload used by Transaction.isValid', () => {
  const { Transaction } = require('../models/blockchain');
  const fromWallet = generateTestWallet();
  const toWallet = generateTestWallet();
  const amount = 25;

  const transaction = new Transaction(
    fromWallet.publicKeyHex,
    toWallet.publicKeyHex,
    amount,
  );

  const message = buildTransactionMessage(
    `  ${fromWallet.publicKeyHex}  `,
    `  ${toWallet.publicKeyHex}  `,
    amount,
  );

  assert.equal(message, transaction.getSigningPayload());
  assert.equal(
    transaction.calculateHash(),
    crypto.createHash('sha256').update(message).digest('hex'),
  );
});

test('signTransactionPayload returns a DER encoded secp256k1 signature as hex', () => {
  const fromWallet = generateTestWallet();
  const toWallet = generateTestWallet();
  const amount = 25;

  const signature = signTransactionPayload({
    fromAddress: fromWallet.publicKeyHex,
    toAddress: toWallet.publicKeyHex,
    amount,
    privateKey: fromWallet.privateKeyPem,
  });

  assert.match(signature, /^[0-9a-f]+$/);
  assert.equal(signature.length % 2, 0);
  assert.ok(signature.length >= 140);
  assert.ok(signature.length <= 144);
});

test('generated signature verifies against the from wallet public key', () => {
  const fromWallet = generateTestWallet();
  const toWallet = generateTestWallet();
  const amount = 25;

  const signature = signTransactionPayload({
    fromAddress: fromWallet.publicKeyHex,
    toAddress: toWallet.publicKeyHex,
    amount,
    privateKey: fromWallet.privateKeyPem,
  });

  // For log to use as payload for tx create in "request.http" file.
  // console.log('\nCreate transaction payload for request.http:');
  // console.log(
  //   JSON.stringify(
  //     {
  //       fromAddress: fromWallet.publicKeyHex,
  //       toAddress: toWallet.publicKeyHex,
  //       amount,
  //       signature,
  //     },
  //     null,
  //     2,
  //   ),
  // );

  const { Transaction } = require('../models/blockchain');
  const transaction = new Transaction(
    fromWallet.publicKeyHex,
    toWallet.publicKeyHex,
    amount,
  );
  transaction.signature = signature;

  assert.equal(transaction.isValid(), true);

  const secondSignature = signTransactionPayload({
    fromAddress: fromWallet.publicKeyHex,
    toAddress: toWallet.publicKeyHex,
    amount,
    privateKey: fromWallet.privateKeyPem,
  });

  const secondTransaction = new Transaction(
    fromWallet.publicKeyHex,
    toWallet.publicKeyHex,
    amount,
  );
  secondTransaction.signature = secondSignature;

  assert.equal(secondTransaction.isValid(), true);
});

test('generated signature does not verify against a different transaction message', () => {
  const fromWallet = generateTestWallet();
  const toWallet = generateTestWallet();
  const amount = 25;
  const differentAmount = 50;

  const signature = signTransactionPayload({
    fromAddress: fromWallet.publicKeyHex,
    toAddress: toWallet.publicKeyHex,
    amount,
    privateKey: fromWallet.privateKeyPem,
  });

  const { Transaction } = require('../models/blockchain');
  const transaction = new Transaction(
    fromWallet.publicKeyHex,
    toWallet.publicKeyHex,
    differentAmount,
  );
  transaction.signature = signature;

  assert.equal(transaction.isValid(), false);
});

test('signTransactionPayload throws when private key is missing', () => {
  const fromWallet = generateTestWallet();
  const toWallet = generateTestWallet();

  assert.throws(
    () =>
      signTransactionPayload({
        fromAddress: fromWallet.publicKeyHex,
        toAddress: toWallet.publicKeyHex,
        amount: 25,
      }),
    /Private key is required to sign transaction payload/,
  );
});
