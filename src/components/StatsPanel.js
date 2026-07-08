import React, { useEffect, useRef, useState } from 'react';
import './StatsPanel.css';

const NO_PENDING_TRANSACTIONS_WARNING =
  'No pending transactions to mine. Create a transaction first.';
const MINE_WARNING_AUTO_DISMISS_MS = 10000;

const StatsPanel = ({ stats, onMine }) => {
  const [mineWarning, setMineWarning] = useState('');
  const mineWarningTimeoutRef = useRef(null);

  const getPendingTransactionsCount = () => {
    if (!stats) {
      return 0;
    }

    if (Array.isArray(stats.pendingTransactions)) {
      return stats.pendingTransactions.length;
    }

    const pendingTransactionsCount = Number(stats.pendingTransactions);
    return Number.isFinite(pendingTransactionsCount)
      ? pendingTransactionsCount
      : 0;
  };

  const pendingTransactionsCount = getPendingTransactionsCount();

  const clearMineWarningTimeout = () => {
    if (mineWarningTimeoutRef.current !== null) {
      window.clearTimeout(mineWarningTimeoutRef.current);
      mineWarningTimeoutRef.current = null;
    }
  };

  const dismissMineWarning = () => {
    clearMineWarningTimeout();
    setMineWarning('');
  };

  const showMineWarning = (message) => {
    clearMineWarningTimeout();
    setMineWarning(message);
    mineWarningTimeoutRef.current = window.setTimeout(() => {
      mineWarningTimeoutRef.current = null;
      setMineWarning('');
    }, MINE_WARNING_AUTO_DISMISS_MS);
  };

  useEffect(() => {
    if (pendingTransactionsCount > 0) {
      clearMineWarningTimeout();
      setMineWarning('');
    }
  }, [pendingTransactionsCount]);

  useEffect(() => {
    return () => {
      if (mineWarningTimeoutRef.current !== null) {
        window.clearTimeout(mineWarningTimeoutRef.current);
        mineWarningTimeoutRef.current = null;
      }
    };
  }, []);

  if (!stats) return null;

  const isNoPendingTransactionsError = (error) =>
    error?.message?.toLowerCase().includes('no pending transaction');

  const handleMineClick = async () => {
    if (pendingTransactionsCount === 0) {
      showMineWarning(NO_PENDING_TRANSACTIONS_WARNING);
      return;
    }

    dismissMineWarning();

    try {
      await onMine();
    } catch (err) {
      if (isNoPendingTransactionsError(err)) {
        showMineWarning(NO_PENDING_TRANSACTIONS_WARNING);
        return;
      }

      console.error('Mining failed:', err);
    }
  };

  return (
    <div className="stats-panel">
      <h2 className="panel-title">Blockchain Stats</h2>
      <div className="stats-grid">
        <div className="stat-item">
          <div className="stat-label">Chain Length</div>
          <div className="stat-value">{stats.chainLength}</div>
        </div>

        <div className="stat-item">
          <div className="stat-label">Pending Transactions</div>
          {/* <div className="stat-value">{stats.pendingTransactions}</div> */}
          <div className="stat-value">{pendingTransactionsCount}</div>
        </div>

        <div className="stat-item">
          <div className="stat-label">Difficulty</div>
          <div className="stat-value">{stats.difficulty}</div>
        </div>

        <div className="stat-item">
          <div className="stat-label">Mining Reward</div>
          <div className="stat-value">{stats.miningReward}</div>
        </div>

        <div className="stat-item status">
          <div className="stat-label">Chain Status</div>
          <div className={`stat-value ${stats.isValid ? 'valid' : 'invalid'}`}>
            {stats.isValid ? '✓ Valid' : '✗ Invalid'}
          </div>
        </div>
      </div>
      <button type="button" className="mine-button" onClick={handleMineClick}>
        ⛏️ Mine Block
      </button>

      {mineWarning && (
        <div className="mine-warning" role="alert">
          {mineWarning}
        </div>
      )}
    </div>
  );
};

export default StatsPanel;
