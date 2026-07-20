export type BrowserCapabilities = {
  secureContext: boolean;
  indexedDb: boolean;
  worker: boolean;
  objectUrls: boolean;
  storageEstimate: boolean;
  serviceWorker: boolean;
  randomUuid: boolean;
};

export function browserCapabilities(): BrowserCapabilities {
  return {
    secureContext: window.isSecureContext,
    indexedDb: "indexedDB" in window,
    worker: "Worker" in window,
    objectUrls: typeof URL.createObjectURL === "function",
    storageEstimate: Boolean(navigator.storage?.estimate),
    serviceWorker: "serviceWorker" in navigator,
    randomUuid: Boolean(window.crypto?.randomUUID),
  };
}

export function browserId() {
  if (window.crypto?.randomUUID) return window.crypto.randomUUID();
  if (window.crypto?.getRandomValues) {
    const bytes = window.crypto.getRandomValues(new Uint8Array(12));
    return `browser-${Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("")}`;
  }
  return `browser-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}
