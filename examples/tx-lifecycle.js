#!/usr/bin/env node

/*
 * End-to-end Transaction lifecycle example.
 *
 * Run:
 *   node examples/tx-lifecycle.js
 *
 * Optional:
 *   BLOCKCHAIN_HOST=http://localhost:3002 node examples/tx-lifecycle.js
 */

const axios = require('axios');

const config = require('../config');
const { signTransactionPayload } = require('../controllers/wallet.controller');

const HOST = (
  process.env.BLOCKCHAIN_HOST || `http://localhost:${config.port}`
).replace(/\/+$/, '');
const API_BASE = `${HOST}/api`;
const HEALTH_URL = `${HOST}/health`;
const MINER_ADDRESS =
  process.env.EXAMPLE_MINER_ADDRESS || config.blockchain.initialMinerAddress;
const TRANSFER_AMOUNT = 25;

const color = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
};

const client = axios.create({
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' },
});

const createWallet = async (name) => {
  const wallet = await postJson(apiUrl('/wallets'), {});

  printStatus('[OK]', `${name} account created.`, color.green);
  printFields([
    ['Public key', shorten(wallet.publicKey, 24, 18)],
    ['Starting balance', wallet.balance],
    ['Private key', 'generated and kept in-memory for signing'],
  ]);

  return wallet;
};

const createAliceToBobTransaction = (alice, bob) => {
  const signature = signTransactionPayload({
    fromAddress: alice.publicKey,
    toAddress: bob.publicKey,
    amount: TRANSFER_AMOUNT,
    privateKey: alice.privateKey,
  });

  const payload = {
    fromAddress: alice.publicKey,
    toAddress: bob.publicKey,
    amount: TRANSFER_AMOUNT,
    signature,
  };

  printStatus('[OK]', 'Alice signed a 25-unit transfer to Bob.', color.green);
  printFields([
    ['Amount', payload.amount],
    ['From', shorten(payload.fromAddress, 24, 18)],
    ['To', shorten(payload.toAddress, 24, 18)],
    ['Signature', shorten(payload.signature, 22, 16)],
  ]);

  return payload;
};

// ==============
//        UTILS
// ==============

const hr = (char = '=') => char.repeat(78);

const paint = (value, ...styles) => `${styles.join('')}${value}${color.reset}`;

const printBanner = (title, subtitle) => {
  console.log(paint(hr(), color.cyan));
  console.log(paint(title, color.bold, color.cyan));
  if (subtitle) {
    console.log(paint(subtitle, color.dim));
  }
  console.log(paint(hr(), color.cyan));
};

const printStep = (index, title) => {
  console.log('');
  console.log(paint(`[STEP ${index}] ${title}`, color.bold));
  console.log(paint(hr('-'), color.dim));
};

const printStatus = (label, message, tone = color.green) => {
  console.log(`${paint(label.padEnd(7), tone, color.bold)} ${message}`);
};

const printFields = (fields) => {
  fields.forEach(([label, value]) => {
    console.log(`  ${paint(`${label}:`.padEnd(22), color.dim)} ${value}`);
  });
};

const shorten = (value, head = 18, tail = 12) => {
  if (value === null || value === undefined) {
    return 'n/a';
  }

  const normalized = String(value).replace(/\s+/g, ' ').trim();
  if (normalized.length <= head + tail + 3) {
    return normalized;
  }

  return `${normalized.slice(0, head)}...${normalized.slice(-tail)}`;
};

const apiUrl = (path) => `${API_BASE}${path}`;

const getJson = async (url) => {
  const response = await client.get(url);
  return response.data;
};

const postJson = async (url, payload) => {
  const response = await client.post(url, payload);
  return response.data;
};

const ensureTransactionPresent = (transactions, signature, locationLabel) => {
  const matchingTransaction = transactions.find(
    (transaction) => transaction.signature === signature,
  );

  if (!matchingTransaction) {
    throw new Error(
      `Expected Alice -> Bob transaction in ${locationLabel}, but it was not found.`,
    );
  }

  return matchingTransaction;
};

const formatError = (error) => {
  if (error.response?.data?.error) {
    return `${error.response.status} ${error.response.data.error}`;
  }

  if (error.code === 'ECONNREFUSED') {
    return `Could not connect to ${HOST}. Start the backend with "npm run dev" or "npm run server".`;
  }

  return error.message || String(error);
};

const main = async () => {
  printBanner('Blockchain Example Flow', `Target host: ${HOST}`);

  printStep(1, 'Check that the blockchain API is running');
  const [health, initialStats] = await Promise.all([
    getJson(HEALTH_URL),
    getJson(apiUrl('/stats')),
  ]);

  printStatus('[OK]', 'Blockchain API is reachable.', color.green);
  printFields([
    ['Health status', health.status],
    ['Environment', health.env],
    ['Uptime (seconds)', health.uptime],
    ['Chain length', initialStats.chainLength],
    ['Pending tx count', initialStats.pendingTransactions],
  ]);

  if (initialStats.pendingTransactions > 0) {
    printStatus(
      '[NOTE]',
      'This chain already has pending transactions. The mine step will confirm all of them together.',
      color.yellow,
    );
  }

  printStep(2, 'Create account for Alice');
  const alice = await createWallet('Alice');

  printStep(3, 'Create account for Bob');
  const bob = await createWallet('Bob');

  printStep(
    4,
    'Create Alice -> Bob transaction and add it to pending transactions',
  );
  const transactionPayload = createAliceToBobTransaction(alice, bob);
  const addTransactionResponse = await postJson(
    apiUrl('/transactions'),
    transactionPayload,
  );

  printStatus('[OK]', addTransactionResponse.message, color.green);
  printFields([
    ['Pending tx count', addTransactionResponse.pendingCount],
    ['Transaction timestamp', addTransactionResponse.transaction.timestamp],
  ]);

  printStep(5, 'Verify the transaction is in the pending pool');
  const pendingResponse = await getJson(apiUrl('/transactions/pending'));
  ensureTransactionPresent(
    pendingResponse.pendingTransactions,
    transactionPayload.signature,
    'the pending pool',
  );

  printStatus('[OK]', 'Alice -> Bob transaction is pending.', color.green);
  printFields([
    ['Pending tx count', pendingResponse.count],
    ['Tracked signature', shorten(transactionPayload.signature, 22, 16)],
  ]);

  printStep(6, 'Mine the pending transactions and confirm the transfer');
  const mineResponse = await postJson(apiUrl('/mine'), {
    miningRewardAddress: MINER_ADDRESS,
  });
  const latestBlock = mineResponse.latestBlock;
  const confirmedTransaction = ensureTransactionPresent(
    latestBlock.transactions,
    transactionPayload.signature,
    'the newly mined block',
  );
  const rewardTransaction = latestBlock.transactions.find(
    (transaction) =>
      transaction.fromAddress === null &&
      transaction.toAddress === MINER_ADDRESS,
  );

  const [postMinePending, aliceBalance, bobBalance, chainValidity] =
    await Promise.all([
      getJson(apiUrl('/transactions/pending')),
      getJson(apiUrl(`/wallets/${alice.publicKey}`)),
      getJson(apiUrl(`/wallets/${bob.publicKey}`)),
      getJson(apiUrl('/chain/valid')),
    ]);

  if (postMinePending.count !== 0) {
    throw new Error(
      `Expected pending tx count to be 0 after mining, received ${postMinePending.count}.`,
    );
  }

  if (!rewardTransaction) {
    throw new Error('Expected a miner reward transaction in the mined block.');
  }

  printStatus('[OK]', mineResponse.message, color.green);
  printFields([
    ['Latest block hash', shorten(latestBlock.hash, 22, 18)],
    ['Block tx count', latestBlock.transactions.length],
    ['Confirmed amount', confirmedTransaction.amount],
    ['Miner reward address', shorten(MINER_ADDRESS, 24, 18)],
    ['Pending tx count', postMinePending.count],
    ['Chain valid', chainValidity.isValid ? 'yes' : 'no'],
    ['Alice balance', aliceBalance.balance],
    ['Bob balance', bobBalance.balance],
  ]);

  console.log('');
  printStatus(
    '[DONE]',
    'Example flow completed: running check, wallets, signed tx, pending pool, mining, and confirmation.',
    color.cyan,
  );
  printStatus(
    '[NOTE]',
    'This educational chain validates signatures, but it does not block spends from an unfunded wallet.',
    color.yellow,
  );
};

main().catch((error) => {
  console.error('');
  printStatus('[FAIL]', formatError(error), color.red);
  process.exitCode = 1;
});
