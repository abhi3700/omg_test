const crypto = require('crypto');
const config = require('../config');
const logger = require('../utils/logger');
const persistenceService = require('../services/persistence.service');
const { Blockchain, Block, Transaction } = require('./blockchain');

let blockchain = new Blockchain(
  config.blockchain.difficulty,
  config.blockchain.miningReward,
);

const seedDemoData = () => {
  if (!config.demoData.enabled) {
    return;
  }

  for (const { to, amount } of config.demoData.transactions) {
    const { publicKey, privateKey } = crypto.generateKeyPairSync('ec', {
      namedCurve: 'secp256k1',
    });

    const from = publicKey
      .export({ type: 'spki', format: 'der' })
      .toString('hex');
    const demoTx = new Transaction(from, to, amount);

    demoTx.signTransaction(privateKey.export({ type: 'pkcs8', format: 'pem' }));
    blockchain.addTransaction(demoTx);
  }

  if (blockchain.pendingTransactions.length > 0) {
    blockchain.minePendingTransactions(config.blockchain.initialMinerAddress);
    logger.info('Seeded demo blockchain data');
  }
};

const initializeBlockchain = async () => {
  const restored = await persistenceService.load();

  if (restored) {
    blockchain = restored;
    logger.info('Loaded persisted blockchain state');
    return;
  }

  seedDemoData();
  if (blockchain.pendingTransactions.length > 0) {
    await persistenceService.save(blockchain);
  }
};

initializeBlockchain();

module.exports = {
  get blockchain() {
    return blockchain;
  },
  Blockchain,
  Block,
  Transaction,
};
