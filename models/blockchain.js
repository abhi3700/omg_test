const crypto = require('crypto');

class Block {
  constructor(timestamp, transactions, previousHash = '') {
    this.timestamp = timestamp;
    this.transactions = transactions;
    this.previousHash = previousHash;
    this.nonce = 0;
    this.hash = this.calculateHash();
  }

  calculateHash() {
    return crypto
      .createHash('sha256')
      .update(
        this.previousHash +
          this.timestamp +
          JSON.stringify(this.transactions) +
          this.nonce,
      )
      .digest('hex');
  }

  mineBlock(difficulty) {
    const target = Array(difficulty + 1).join('0');

    while (this.hash.substring(0, difficulty) !== target) {
      this.nonce++;
      this.hash = this.calculateHash();
    }
  }

  hasValidTransactions() {
    for (const tx of this.transactions) {
      const transaction =
        tx instanceof Transaction
          ? tx
          : Object.assign(
              new Transaction(tx.fromAddress, tx.toAddress, tx.amount),
              {
                timestamp: tx.timestamp,
                signature: tx.signature || '',
              },
            );

      if (!transaction.isValid()) {
        return false;
      }
    }

    return true;
  }
}

class Transaction {
  constructor(fromAddress, toAddress, amount) {
    this.fromAddress = fromAddress;
    this.toAddress = toAddress;
    this.amount = amount;
    this.timestamp = Date.now();
    this.signature = '';
  }

  getSigningPayload() {
    return `${this.fromAddress}${this.toAddress}${this.amount}`;
  }

  calculateHash() {
    return crypto
      .createHash('sha256')
      .update(this.getSigningPayload())
      .digest('hex');
  }

  signTransaction(signingKey) {
    try {
      const publicKey = crypto.createPublicKey(signingKey);
      const publicKeyDer = publicKey.export({ type: 'spki', format: 'der' });
      const publicKeyHex = publicKeyDer.toString('hex');

      if (this.fromAddress !== publicKeyHex) {
        throw new Error('You cannot sign transactions for other wallets');
      }

      const signature = crypto.sign(
        'SHA256',
        Buffer.from(this.getSigningPayload()),
        signingKey,
      );
      this.signature = signature.toString('hex');
    } catch (error) {
      throw new Error(`Unable to sign transaction: ${error.message}`);
    }
  }

  isValid() {
    if (this.fromAddress === null) return true;

    if (!this.signature || this.signature.length === 0) {
      return false;
    }

    try {
      const publicKey = crypto.createPublicKey({
        key: Buffer.from(this.fromAddress, 'hex'),
        format: 'der',
        type: 'spki',
      });

      return crypto.verify(
        'SHA256',
        Buffer.from(this.getSigningPayload()),
        publicKey,
        Buffer.from(this.signature, 'hex'),
      );
    } catch {
      return false;
    }
  }
}

class Blockchain {
  constructor(difficulty, miningReward) {
    this.chain = [this.createGenesisBlock()];
    this.difficulty = difficulty || 2;
    this.pendingTransactions = [];
    this.miningReward = miningReward || 100;
  }

  createGenesisBlock() {
    return new Block(Date.now(), [], '0');
  }

  getLatestBlock() {
    return this.chain[this.chain.length - 1];
  }

  minePendingTransactions(miningRewardAddress) {
    // NOTE: Prevent mining when no pending txs.
    if (this.pendingTransactions.length === 0) {
      throw new Error('No pending transactions to mine');
    }

    const rewardTx = new Transaction(
      null,
      miningRewardAddress,
      this.miningReward,
    );

    const transactionsToMine = [...this.pendingTransactions, rewardTx];

    const block = new Block(
      Date.now(),
      transactionsToMine,
      this.getLatestBlock().hash,
    );
    block.mineBlock(this.difficulty);

    this.chain.push(block);
    this.pendingTransactions = [];
  }

  addTransaction(transaction) {
    if (!transaction.fromAddress || !transaction.toAddress) {
      throw new Error('Transaction must include from and to address');
    }

    if (!transaction.isValid()) {
      throw new Error('Cannot add unsigned or invalid transaction to chain');
    }

    this.pendingTransactions.push(transaction);
  }

  getBalanceOfAddress(address) {
    let balance = 0;

    for (const block of this.chain) {
      for (const trans of block.transactions) {
        if (trans.fromAddress === address) balance -= trans.amount;
        if (trans.toAddress === address) balance += trans.amount;
      }
    }

    return balance;
  }

  isChainValid() {
    for (let i = 1; i < this.chain.length; i++) {
      const current =
        this.chain[i] instanceof Block
          ? this.chain[i]
          : Object.assign(
              new Block(
                this.chain[i].timestamp,
                this.chain[i].transactions || [],
                this.chain[i].previousHash,
              ),
              {
                nonce: this.chain[i].nonce,
                hash: this.chain[i].hash,
              },
            );
      const previous = this.chain[i - 1];

      if (!current.hasValidTransactions()) return false;
      if (current.hash !== current.calculateHash()) return false;
      if (current.previousHash !== previous.hash) return false;
    }

    return true;
  }

  getAllTransactions() {
    return this.chain.flatMap((block) => block.transactions);
  }
}

module.exports = { Blockchain, Block, Transaction };
