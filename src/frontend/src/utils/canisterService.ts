/**
 * SHUBH SCHOOL ERP — Canister Service Stub
 *
 * This project uses cPanel/MySQL via phpApiService — no Internet Computer.
 * Only generateId() is kept for backward compatibility.
 */

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export const canisterService = {
  getCounts: async (): Promise<Record<string, number>> => ({}),
  isReady: () => false,
};

export default canisterService;
