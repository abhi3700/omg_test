const models = require('../models');
const persistenceService = require('../services/persistence.service');
const { sendSuccess } = require('../utils/response');
const logger = require('../utils/logger');

const mineBlock = async (req, res, next) => {
  try {
    const miningRewardAddress =
      req.body.miningRewardAddress || req.body.minerAddress || 'miner1';
    const blockchain = models.blockchain;

    logger.info(`Mining block for reward address: ${miningRewardAddress}`);

    // NOTE: Prevent mining when no pending txs.
    if (blockchain.pendingTransactions.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No pending transactions to mine',
      });
    }

    blockchain.minePendingTransactions(miningRewardAddress);
    await persistenceService.save(blockchain);
    logger.info(
      `Block mined successfully: ${blockchain.getLatestBlock().hash}`,
    );

    sendSuccess(res, {
      message: 'Block mined successfully',
      latestBlock: blockchain.getLatestBlock(),
      chain: blockchain.chain,
      chainLength: blockchain.chain.length,
      pendingTransactions: blockchain.pendingTransactions,
      pendingCount: blockchain.pendingTransactions.length,
    });
  } catch (err) {
    next(err);
  }
};

module.exports = { mineBlock };
