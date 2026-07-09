const test = require('node:test');
const assert = require('node:assert/strict');

const balanceControllerPath = require.resolve('../controllers/balance.controller');
const modelsPath = require.resolve('../models');

const loadBalanceController = (modelsExports) => {
  const originalModelsModule = require.cache[modelsPath];
  const originalControllerModule = require.cache[balanceControllerPath];

  require.cache[modelsPath] = {
    id: modelsPath,
    filename: modelsPath,
    loaded: true,
    exports: modelsExports,
  };
  delete require.cache[balanceControllerPath];

  const controller = require('../controllers/balance.controller');

  return {
    controller,
    restore() {
      delete require.cache[balanceControllerPath];

      if (originalControllerModule) {
        require.cache[balanceControllerPath] = originalControllerModule;
      }

      if (originalModelsModule) {
        require.cache[modelsPath] = originalModelsModule;
      } else {
        delete require.cache[modelsPath];
      }
    },
  };
};

const createResponse = () => ({
  statusCode: null,
  body: null,
  status(code) {
    this.statusCode = code;
    return this;
  },
  json(payload) {
    this.body = payload;
    return this;
  },
});

test('getBalance reads the live blockchain instance instead of a stale import', () => {
  let currentBlockchain = {
    getBalanceOfAddress: () => 0,
  };

  const { controller, restore } = loadBalanceController({
    get blockchain() {
      return currentBlockchain;
    },
  });

  currentBlockchain = {
    getBalanceOfAddress: () => 100,
  };

  const req = {
    params: {
      address: 'address2',
    },
  };
  const res = createResponse();

  try {
    controller.getBalance(req, res);
  } finally {
    restore();
  }

  assert.equal(res.statusCode, 200);
  assert.deepEqual(res.body, {
    success: true,
    address: 'address2',
    balance: 100,
  });
});
