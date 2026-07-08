const crypto = require('crypto');
const { sendSuccess, sendError } = require('../utils/response');
const { isValidAddress, sanitizeAddress } = require('../utils/validator');

const buildTransactionMessage = (fromAddress, toAddress, amount) => {
  const { Transaction } = require('../models/blockchain');

  const transaction = new Transaction(
    sanitizeAddress(fromAddress),
    sanitizeAddress(toAddress),
    amount,
  );

  return transaction.getSigningPayload();
};

const signTransactionPayload = ({
  fromAddress,
  toAddress,
  amount,
  privateKey,
}) => {
  if (!privateKey) {
    throw new Error('Private key is required to sign transaction payload');
  }

  const message = buildTransactionMessage(fromAddress, toAddress, amount);
  return crypto
    .sign('SHA256', Buffer.from(message), privateKey)
    .toString('hex');
};

const generateWallet = (req, res) => {
  try {
    const blockchain = require('../models').blockchain;

    const { publicKey, privateKey } = crypto.generateKeyPairSync('ec', {
      namedCurve: 'secp256k1',
    });

    const publicKeyHex = publicKey
      .export({ type: 'spki', format: 'der' })
      .toString('hex');
    const privateKeyPem = privateKey.export({ type: 'pkcs8', format: 'pem' });

    sendSuccess(res, {
      publicKey: publicKeyHex,
      privateKey: privateKeyPem,
      balance: blockchain.getBalanceOfAddress(publicKeyHex),
    });
  } catch (error) {
    sendError(res, error.message || 'Failed to create wallet', 500);
  }
};

const getWalletBalance = (req, res) => {
  const blockchain = require('../models').blockchain;
  const address = sanitizeAddress(req.params.address);

  if (!isValidAddress(address)) {
    return sendError(res, 'Invalid wallet address', 400);
  }

  sendSuccess(res, {
    address,
    balance: blockchain.getBalanceOfAddress(address),
  });
};

module.exports = {
  generateWallet,
  getWalletBalance,
  buildTransactionMessage,
  signTransactionPayload,
};
