# Blockchain, Smart Contracts, and Web3 Assessment Project

This repository is a multi-track assessment project for candidates applying to roles in blockchain engineering, smart contract engineering, and full-stack Web3 development.

It combines:

- a layered Express backend for a simplified blockchain
- a React-based explorer for interacting with the chain
- a Solidity smart contract example for assessment and deployment discussion
- a persistence layer so the chain can survive restarts

---

## What’s Included

### Backend

- Express API with routes for chain, transactions, mining, balance, stats, and wallets
- Blockchain domain model with block hashing, transaction validation, and mining logic
- Persistence layer that saves blockchain state to a JSON file
- Centralized middleware for error handling, logging, validation, and rate limiting

### Frontend

- React dashboard to view blockchain state and mine blocks
- Wallet creation panel for generating key material and checking balances
- Transaction form for creating new pending transactions
- Polling-based refresh for near-real-time updates

### Smart Contracts

- Solidity contract example in [contracts/AssessmentToken.sol](contracts/AssessmentToken.sol)
- Deployment script in [scripts/deploy-contract.js](scripts/deploy-contract.js)

---

## Documentation

- 📘 [User Guide](#user-guide)
- 🧪 Transaction lifecycle example — `npm run example:tx-lifecycle`
- 📄 API Overview — see the API Overview section [below](#api-overview).

---

## Project Structure

```text
hometask-blockchain/
├── config/
├── controllers/
├── contracts/
├── examples/
├── middleware/
├── models/
├── routes/
├── scripts/
├── services/
├── src/
├── tests/
├── package.json
├── server.js
└── README.md
```

---

## Getting Started

### Prerequisites

- Node.js 18+
- npm

### Install

```bash
npm install
```

### Configure environment

```bash
cp .env.example .env
```

If you do not have an .env.example file yet, create one with values such as:

```env
PORT=3002
NODE_ENV=development
BLOCKCHAIN_DIFFICULTY=2
BLOCKCHAIN_MINING_REWARD=100
INITIAL_MINER_ADDRESS=genesis-miner
SEED_DEMO_DATA=true
REACT_APP_API_URL=http://localhost:3002
```

### Run the app

```bash
# Terminal 1
npm start

# Terminal 2
npm run dev
```

The React app uses the proxy in [src/setupProxy.js](src/setupProxy.js) so browser requests to /api are forwarded to the backend.

---

### Run the examples

The repository includes end-to-end example scripts that demonstrate common blockchain workflows using the REST API.

Run the transaction lifecycle example:

```bash
npm run example:tx-lifecycle
```

This example walks through:

- checking API health
- creating wallets
- signing and submitting a transaction
- inspecting pending transactions
- mining a block
- verifying updated balances

---

## User Guide

New to the project? Start [here](res/user_guide.excalidraw) ↗️.

The User Guide covers the main blockchain explorer workflow, including wallet creation, transaction submission, mining, blockchain state inspection, and common troubleshooting.

---

## Architecture

The project follows a layered architecture where the frontend triggers blockchain actions through REST APIs, while the backend keeps the core blockchain rules inside the domain model.

```text
Frontend Explorer UI
   |
   | HTTP / REST
   v
Express Backend
   |
   +-- Routes Layer
   |     - chain routes
   |     - transaction routes
   |     - mining routes
   |     - wallet routes
   |
   +-- Controllers Layer
   |     - validate request input
   |     - sanitize transaction data
   |     - build transaction payloads
   |     - return API-friendly responses
   |
   +-- Domain Model Layer
   |     - Blockchain
   |     - Block
   |     - Transaction
   |
   +-- Persistence Layer
         - save blockchain state
         - restore blockchain state after restart
```

### Transaction lifecycle

```text
Create Transaction
   |
   v
Validate and sanitize request data
   |
   v
Build Transaction object
   |
   v
Verify transaction signature
   |
   v
Add transaction to pendingTransactions
   |
   v
Persist blockchain state
```

A transaction is not added directly to a block. It first enters the pending transaction pool. Mining is the only step that moves pending transactions into a confirmed block.

### Mining lifecycle

```text
Mine Block
   |
   v
Check pendingTransactions.length
   |
   +-- if 0
   |     return a clear no-pending-transactions response
   |
   +-- if > 0
         create a new block
         include pending transactions
         add miner reward
         run proof-of-work mining
         append block to chain
         clear pendingTransactions
         persist blockchain state
```

### Low-level components

#### Transaction

Represents a signed transfer between two wallet addresses.

Responsibilities:

- build a deterministic signing payload
- calculate the transaction hash
- sign the transaction with a private key
- verify the signature against the sender address
- reject unsigned or tampered transactions

#### Block

Represents a mined collection of transactions.

Responsibilities:

- store transactions
- reference the previous block hash
- calculate the block hash
- run proof-of-work mining
- verify all transactions inside the block

#### Blockchain

Owns the current chain state and pending transaction pool.

Responsibilities:

- create the genesis block
- add only valid transactions to pending transactions
- mine pending transactions into a new block
- calculate wallet balances
- validate chain integrity
- expose serializable state for persistence

#### Persistence service

Saves and restores blockchain state from disk.

Responsibilities:

- persist chain state after important mutations
- restore blocks and transactions as class instances
- preserve pending transactions across server restarts

### Design rule

```text
Controller validates input.
Model enforces blockchain rules.
Persistence saves and restores state.
Frontend displays state and triggers actions.
Mining converts pending transactions into confirmed block transactions.
```

---

## API Overview

All API responses follow this pattern:

```json
{ "success": true, "message": "...", ... }
```

Try [here](./request.http) ↗️.

### Core endpoints

| Method | Path | Description |
|---|---|---|
| GET | /api/chain | Return the full blockchain |
| GET | /api/chain/valid | Return whether the chain is valid |
| POST | /api/transactions | Add a pending transaction |
| GET | /api/transactions/pending | View pending transactions |
| POST | /api/mine | Mine the pending transactions |
| GET | /api/balance/:address | Get an address balance |
| GET | /api/stats | View chain and mining statistics |
| POST | /api/wallets | Generate a wallet-like key pair |
| GET | /api/wallets/:address | View a balance for a wallet address |

---

## Smart Contract Notes

The Solidity contract in [contracts/AssessmentToken.sol](contracts/AssessmentToken.sol) is a simple ERC-20-style token example. It demonstrates:

- token supply initialization
- balance tracking
- transfer and approval flows
- basic events

It is intended as an assessment artifact and can be extended for more advanced scenarios.

---

## Testing

A basic regression suite is included in [tests/blockchain.test.js](tests/blockchain.test.js).

Run:

```bash
node --test
```

---

## Known Limitations

- The blockchain is still a simplified educational implementation, not a production-grade distributed ledger.
- Wallet generation is demonstration-oriented and does not yet implement a full signing workflow end-to-end in the UI.
- The smart contract is intentionally simple for assessment purposes.

---

## License

One More Game
