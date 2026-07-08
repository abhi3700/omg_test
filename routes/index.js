const { Router } = require('express');
const blockchainRoutes = require('./blockchain.routes');
const transactionRoutes = require('./transaction.routes');
const miningRoutes = require('./mining.routes');
const balanceRoutes = require('./balance.routes');
const statsRoutes = require('./stats.routes');
const walletRoutes = require('./wallet.routes');

const router = Router();

router.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'API is running',
    endpoints: {
      chain: {
        get: 'GET /api/chain',
        valid: 'GET /api/chain/valid',
      },
      transactions: {
        create: 'POST /api/transactions',
        list: 'GET /api/transactions',
        pending: 'GET /api/transactions/pending',
      },
      mining: {
        mine: 'POST /api/mine',
      },
      balance: {
        get: 'GET /api/balance/:address',
      },
      stats: {
        get: 'GET /api/stats',
      },
      wallets: {
        create: 'POST /api/wallets',
        get: 'GET /api/wallets/:address',
      },
    },
  });
});

router.use('/chain', blockchainRoutes);
router.use('/transactions', transactionRoutes);
router.use('/mine', miningRoutes);
router.use('/balance', balanceRoutes);
router.use('/stats', statsRoutes);
router.use('/wallets', walletRoutes);

module.exports = router;
