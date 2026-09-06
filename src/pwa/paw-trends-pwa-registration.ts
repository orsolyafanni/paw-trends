/** Registers the Paw Trends offline shell immediately in supported browsers. */
export function registerPawTrendsPwa() {
  if (!("serviceWorker" in navigator)) {
    return;
  }

  void navigator.serviceWorker.register("/sw.js", { scope: "/" });
}

export type PawTrendsPersistentStorageStatus = "browser-managed" | "granted";

interface PawTrendsStorageManager {
  persist?: () => Promise<boolean>;
}

/** Asks the browser to protect local observations from automatic storage eviction. */
export async function requestPawTrendsPersistentStorage(
  storageManager?: PawTrendsStorageManager
): Promise<PawTrendsPersistentStorageStatus> {
  if (!storageManager?.persist) {
    return "browser-managed";
  }

  try {
    return (await storageManager.persist()) ? "granted" : "browser-managed";
  } catch {
    return "browser-managed";
  }
}
