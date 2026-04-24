/**
 * REMOVED — localFirstSync caused data to disappear via IndexedDB pending queues.
 * This file is kept as an empty stub to satisfy any stale imports.
 * All data operations go directly through phpApiService.ts.
 */

export const localFirstSync = {
  save: async (_col: string, item: Record<string, unknown>, _op: string) =>
    item,
  load: async (_col: string) => [] as Record<string, unknown>[],
  getSnapshot: <T = Record<string, unknown>>(_col: string): T[] => [],
  mergeServerRecords: (_col: string, _rows: Record<string, unknown>[]) => {},
  setCollection: (_col: string, _rows: Record<string, unknown>[]) => {},
  getPendingCount: () => 0,
  restorePendingQueue: async () => {},
  forceSync: async () => {},
  startFlushTimer: () => {},
  stopFlushTimer: () => {},
  reset: () => {},
  resumeAfterTokenRefresh: async () => {},
};

export default localFirstSync;
