import { describe, expect, it } from "vite-plus/test";

import {
  PAW_TRENDS_SEEDED_REUSABLE_LABELS,
  createPawTrendsProbeStore,
} from "./paw-trends-probe-store";
import type { PawTrendsProbeRecord } from "./paw-trends-probe-store";

describe("Paw Trends probe store", () => {
  it("keeps completed setup after a new app session", async () => {
    const databaseName = `paw-trends-setup-${crypto.randomUUID()}`;
    const firstSession = createPawTrendsProbeStore({ databaseName });

    const savedSetup = await firstSession.saveSetupRecord({
      dataOwnershipAcknowledged: true,
      dogName: "Mabel",
      labels: PAW_TRENDS_SEEDED_REUSABLE_LABELS,
      storageStatus: "granted",
    });
    const reopenedSession = createPawTrendsProbeStore({ databaseName });

    await expect(reopenedSession.readSetupRecord()).resolves.toStrictEqual(
      savedSetup
    );
  });

  it("saves a sample record and reads it from a new store instance", async () => {
    const databaseName = `paw-trends-save-${crypto.randomUUID()}`;
    const firstSession = createPawTrendsProbeStore({ databaseName });

    const savedRecord = await firstSession.saveSampleRecord(
      "Tense after seeing a cat near Lake11."
    );
    const reopenedSession = createPawTrendsProbeStore({ databaseName });

    await expect(reopenedSession.readSampleRecord()).resolves.toStrictEqual(
      savedRecord
    );
  });

  it("replaces the complete sample record during restore", async () => {
    const store = createPawTrendsProbeStore({
      databaseName: `paw-trends-replace-${crypto.randomUUID()}`,
    });
    const restoredRecord: PawTrendsProbeRecord = {
      id: "owner-sample",
      note: "Restored observation",
      savedAt: "2026-09-06T08:30:00.000Z",
      schemaVersion: 1,
    };

    await store.saveSampleRecord("This should be replaced");
    await store.replaceSampleRecord(restoredRecord);

    await expect(store.readSampleRecord()).resolves.toStrictEqual(
      restoredRecord
    );
  });
});
