import { useState, useEffect, useCallback, useRef } from 'react';
import { fetchDashboard } from '../api/blockchain.api';
import { POLL_INTERVAL_MS } from '../constants';

const useBlockchain = (pollInterval = POLL_INTERVAL_MS) => {
  const [chain, setChain] = useState(null);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const intervalRef = useRef(null);
  const latestRefreshIdRef = useRef(0);

  const refresh = useCallback(async () => {
    const refreshId = latestRefreshIdRef.current + 1;
    latestRefreshIdRef.current = refreshId;

    try {
      const { chainData, statsData } = await fetchDashboard();

      if (refreshId !== latestRefreshIdRef.current) {
        return;
      }

      setChain(chainData);
      setStats(statsData);
      setError(null);
    } catch (err) {
      if (refreshId !== latestRefreshIdRef.current) {
        return;
      }

      setError(err.message || 'Failed to connect to the blockchain API.');
    } finally {
      if (refreshId === latestRefreshIdRef.current) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    refresh();
    intervalRef.current = setInterval(refresh, pollInterval);
    return () => clearInterval(intervalRef.current);
  }, [refresh, pollInterval]);

  return { chain, stats, loading, error, refresh };
};

export default useBlockchain;
