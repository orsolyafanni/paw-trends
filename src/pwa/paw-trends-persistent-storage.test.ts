import { describe, expect, it, vi } from "vite-plus/test";

import { requestPawTrendsPersistentStorage } from "./paw-trends-pwa-registration";

describe("Paw Trends persistent storage request", () => {
  it("reports when the browser grants persistent storage", async () => {
    const persist = vi.fn<() => Promise<boolean>>().mockResolvedValue(true);

    await expect(requestPawTrendsPersistentStorage({ persist })).resolves.toBe(
      "granted"
    );
    expect(persist).toHaveBeenCalledOnce();
  });

  it("continues safely when the browser does not support the request", async () => {
    await expect(requestPawTrendsPersistentStorage()).resolves.toBe(
      "browser-managed"
    );
  });

  it("continues safely when the browser rejects the request", async () => {
    const persist = vi
      .fn<() => Promise<boolean>>()
      .mockRejectedValue(new Error("not available"));

    await expect(requestPawTrendsPersistentStorage({ persist })).resolves.toBe(
      "browser-managed"
    );
  });
});
