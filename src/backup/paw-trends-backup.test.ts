import { describe, expect, it } from "vite-plus/test";

import { createPawTrendsProbeStore } from "@/persistence/paw-trends-probe-store";

import {
  exportPawTrendsBackup,
  restorePawTrendsBackup,
} from "./paw-trends-backup";

describe("Paw Trends backup", () => {
  it("exports a versioned JSON backup containing the saved record", async () => {
    const store = createPawTrendsProbeStore({
      databaseName: `paw-trends-export-${crypto.randomUUID()}`,
    });
    const savedRecord = await store.saveSampleRecord("Playful morning walk");

    const backupJson = await exportPawTrendsBackup(store);
    const backup: unknown = JSON.parse(backupJson);

    expect(backup).toMatchObject({
      product: "Paw Trends",
      records: [savedRecord],
      version: 1,
    });
    expect(backupJson).toContain('"exportedAt":');
  });

  it("rejects invalid JSON without changing the saved record", async () => {
    const store = createPawTrendsProbeStore({
      databaseName: `paw-trends-invalid-${crypto.randomUUID()}`,
    });
    const originalRecord = await store.saveSampleRecord(
      "Keep this observation"
    );

    await expect(
      restorePawTrendsBackup(store, '{"product":"Something else"}')
    ).rejects.toThrow("not a valid Paw Trends backup");
    await expect(store.readSampleRecord()).resolves.toStrictEqual(
      originalRecord
    );
  });

  it("replaces local data from a valid backup", async () => {
    const source = createPawTrendsProbeStore({
      databaseName: `paw-trends-source-${crypto.randomUUID()}`,
    });
    const target = createPawTrendsProbeStore({
      databaseName: `paw-trends-target-${crypto.randomUUID()}`,
    });
    const sourceRecord = await source.saveSampleRecord(
      "Restored from my iPhone"
    );
    await target.saveSampleRecord("Replace me");

    const restoredRecord = await restorePawTrendsBackup(
      target,
      await exportPawTrendsBackup(source)
    );

    expect(restoredRecord).toStrictEqual(sourceRecord);
    await expect(target.readSampleRecord()).resolves.toStrictEqual(
      sourceRecord
    );
  });
});
