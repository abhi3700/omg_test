const models = require('../models');
const { sendSuccess } = require('../utils/response');

const getChain = (req, res) => {
  const blockchain = models.blockchain;

  sendSuccess(res, {
    chain: blockchain.chain,
    length: blockchain.chain.length,
  });
};

const validateChain = (req, res) => {
  const blockchain = models.blockchain;

  sendSuccess(res, { isValid: blockchain.isChainValid() });
};

module.exports = { getChain, validateChain };
