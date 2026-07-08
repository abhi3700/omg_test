const models = require('../models');
const persistenceService = require('../services/persistence.service');
const { sendSuccess, sendCreated, sendError } = require('../utils/response');
const {
  isValidAddress,
  isValidAmount,
  sanitizeAddress,
  sanitizeAmount,
} = require('../utils/validator');
const getBlockchain = () => models.blockchain;

const addTransaction = async (req, res, next) => {
  try {
    const { fromAddress, toAddress, amount, signature } = req.body;
    const blockchain = getBlockchain();
    const providedSignature =
      typeof signature === 'string' ? signature.trim() : '';

    if (!isValidAddress(fromAddress) || !isValidAddress(toAddress)) {
      return sendError(res, 'Invalid wallet address format', 400);
    }

    if (!isValidAmount(amount)) {
      return sendError(res, 'Amount must be a positive number', 400);
    }

    const transaction = new models.Transaction(
      sanitizeAddress(fromAddress),
      sanitizeAddress(toAddress),
      sanitizeAmount(amount),
    );

    if (!providedSignature) {
      return sendError(res, 'Transaction signature is required', 400);
    }

    transaction.signature = providedSignature;

    if (!transaction.isValid()) {
      return sendError(res, 'Invalid transaction signature', 400);
    }

    blockchain.addTransaction(transaction);

    await persistenceService.save(blockchain);

    sendCreated(res, {
      message: 'Transaction added to pending pool',
      transaction,
    });
  } catch (err) {
    return sendError(res, err.message || 'Failed to create transaction', 400);
  }
};

const getPendingTransactions = (req, res) => {
  const blockchain = getBlockchain();
  sendSuccess(res, {
    pendingTransactions: blockchain.pendingTransactions,
    count: blockchain.pendingTransactions.length,
  });
};

const getAllTransactions = (req, res) => {
  const blockchain = getBlockchain();
  const transactions = blockchain.getAllTransactions();
  sendSuccess(res, { transactions, count: transactions.length });
};

module.exports = { addTransaction, getPendingTransactions, getAllTransactions };
