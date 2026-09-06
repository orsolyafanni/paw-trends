import { describe, expect, it, vi } from "vite-plus/test";

import { createPawTrendsProbeStore } from "@/persistence/paw-trends-probe-store";
import type { PawTrendsProbeRecord } from "@/persistence/paw-trends-probe-store";

import { registerPawTrendsWebMcpTool } from "./paw-trends-webmcp";
import type { PawTrendsWebMcpContext } from "./paw-trends-webmcp";

describe("Paw Trends WebMCP tool", () => {
  it("saves through the same local store and rejects invalid input", async () => {
    const store = createPawTrendsProbeStore({
      databaseName: `paw-trends-webmcp-${crypto.randomUUID()}`,
    });
    const registerTool = vi.fn<PawTrendsWebMcpContext["registerTool"]>();
    const onRecordSaved = vi.fn<(record: PawTrendsProbeRecord) => void>();

    await registerPawTrendsWebMcpTool({
      context: { registerTool },
      onRecordSaved,
      signal: new AbortController().signal,
      store,
    });

    const registeredTool = registerTool.mock.calls[0]?.[0];
    expect(registeredTool).toMatchObject({
      annotations: { readOnlyHint: false, untrustedContentHint: false },
      name: "save_sample_observation",
    });
    await expect(
      registeredTool?.execute({ note: "  Playful after mantraing  " })
    ).resolves.toMatchObject({ recordId: "owner-sample", status: "saved" });
    await expect(store.readSampleRecord()).resolves.toMatchObject({
      note: "Playful after mantraing",
    });
    expect(onRecordSaved).toHaveBeenCalledOnce();

    await expect(registeredTool?.execute({ note: "" })).rejects.toThrow(
      "Too small"
    );
  });

  it("does not replace the local record when input is invalid", async () => {
    const store = createPawTrendsProbeStore({
      databaseName: `paw-trends-webmcp-invalid-${crypto.randomUUID()}`,
    });
    await store.saveSampleRecord("Playful after mantraing");
    const registerTool = vi.fn<PawTrendsWebMcpContext["registerTool"]>();

    await registerPawTrendsWebMcpTool({
      context: { registerTool },
      onRecordSaved: vi.fn<(record: PawTrendsProbeRecord) => void>(),
      signal: new AbortController().signal,
      store,
    });

    const registeredTool = registerTool.mock.calls[0]?.[0];
    await expect(registeredTool?.execute({ note: "" })).rejects.toThrow(
      "Too small"
    );
    await expect(store.readSampleRecord()).resolves.toMatchObject({
      note: "Playful after mantraing",
    });
  });
});
