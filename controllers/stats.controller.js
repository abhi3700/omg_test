const models = require('../models');
const { sendSuccess } = require('../utils/response');

const getStats = (req, res) => {
  const blockchain = models.blockchain;
  const allTransactions = blockchain.getAllTransactions();

  sendSuccess(res, {
    chainLength: blockchain.chain.length,
    pendingTransactions: blockchain.pendingTransactions.length,
    totalTransactions: allTransactions.length,
    difficulty: blockchain.difficulty,
    miningReward: blockchain.miningReward,
    isValid: blockchain.isChainValid(),
    latestBlockHash: blockchain.getLatestBlock().hash,
  });
};

module.exports = { getStats };
