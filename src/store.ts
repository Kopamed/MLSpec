import { SQLiteStore } from "./store/sqlite/index.js";
import { JSONLStore } from "./store/jsonl/index.js";
import type { MLSpecStore } from "./store/index.js";

export type { MLSpecStore, CaseFilter, RunFilter, StatusReport } from "./store/index.js";
export { generateId } from "./store/index.js";
export { SQLiteStore } from "./store/sqlite/index.js";
export { JSONLStore } from "./store/jsonl/index.js";

export type StoreAdapter = "sqlite" | "jsonl";

function getAdapterFromEnv(): StoreAdapter {
  const env = process.env.MLSPEC_STORE;
  if (!env) return "sqlite";
  const match = env.match(/adapter=(\w+)/);
  return (match?.[1] as StoreAdapter) ?? "sqlite";
}

let storeInstance: MLSpecStore | null = null;

export function createStore(adapter?: StoreAdapter): MLSpecStore {
  const storeAdapter = adapter ?? getAdapterFromEnv();
  switch (storeAdapter) {
    case "jsonl":
      return new JSONLStore();
    case "sqlite":
    default:
      return new SQLiteStore();
  }
}

export function getStore(): MLSpecStore {
  if (!storeInstance) {
    storeInstance = createStore();
  }
  return storeInstance;
}

export function resetStore(): void {
  storeInstance = null;
}