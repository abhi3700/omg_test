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
    blockchain.minePendingTransactions(miningRewardAddress);
    await persistenceService.save(blockchain);
    logger.info(
      `Block mined successfully: ${blockchain.getLatestBlock().hash}`,
    );

    sendSuccess(res, {
      message: 'Block mined successfully',
      latestBlock: blockchain.getLatestBlock(),
      chainLength: blockchain.chain.length,
    });
  } catch (err) {
    next(err);
  }
};

module.exports = { mineBlock };
