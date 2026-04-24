/**
 * REMOVED — syncEngine caused data to disappear.
 * This file is kept as an empty stub to satisfy any stale imports.
 * All data operations go directly through phpApiService.ts.
 */

export const syncEngine = {
  subscribe: (_fn: () => void) => () => {},
  getQueueStats: () => ({ pending: 0, failed: 0 }),
  getSyncStatus: () => ({
    state: "idle" as const,
    lastSyncTime: null,
    lastError: null,
    pendingCount: 0,
    serverCounts: {} as Record<string, number>,
  }),
  loadAllFromCanister: async () => {},
  startPolling: () => {},
  stopPolling: () => {},
};

export default syncEngine;
