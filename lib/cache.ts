import { cacheLife, cacheTag } from "next/cache";

/** Tag on every cached household read. Mutations call updateTag(DATA_TAG) so changes show at once. */
export const DATA_TAG = "app-data";

/**
 * Call first thing inside a "use cache: private" function. Results stay in the browser's
 * router cache for 5 minutes, so tab switches render instantly, and are dropped on any mutation.
 */
export function privateData() {
  cacheTag(DATA_TAG);
  cacheLife({ stale: 300, revalidate: 300, expire: 3600 });
}
