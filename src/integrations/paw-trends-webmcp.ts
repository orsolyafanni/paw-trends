import { z } from "zod";

import type {
  PawTrendsProbeRecord,
  PawTrendsProbeStore,
} from "@/persistence/paw-trends-probe-store";

const pawTrendsWebMcpInputSchema = z.strictObject({
  note: z.string().trim().min(1).max(500),
});

export interface PawTrendsWebMcpTool {
  name: string;
  title: string;
  description: string;
  inputSchema: object;
  annotations: {
    readOnlyHint: boolean;
    untrustedContentHint: boolean;
  };
  execute: (input: unknown) => Promise<unknown>;
}

export interface PawTrendsWebMcpContext {
  registerTool: (
    tool: PawTrendsWebMcpTool,
    options?: { signal?: AbortSignal }
  ) => void | Promise<void>;
}

interface PawTrendsWebMcpRegistration {
  store: PawTrendsProbeStore;
  onRecordSaved: (record: PawTrendsProbeRecord) => void;
  signal: AbortSignal;
  context?: PawTrendsWebMcpContext;
}

/** Registers the single structured action that mirrors saving the sample form. */
export async function registerPawTrendsWebMcpTool({
  store,
  onRecordSaved,
  signal,
  context = (document as Document & { modelContext?: PawTrendsWebMcpContext })
    .modelContext,
}: PawTrendsWebMcpRegistration): Promise<void> {
  if (!context?.registerTool) {
    return;
  }

  try {
    await context.registerTool(
      {
        annotations: {
          readOnlyHint: false,
          untrustedContentHint: false,
        },
        description:
          "Save or replace the Paw Trends storage-proof observation on this device and update the visible sample.",
        execute: async (input) => {
          const { note } = pawTrendsWebMcpInputSchema.parse(input);
          const record = await store.saveSampleRecord(note);
          onRecordSaved(record);
          return {
            recordId: record.id,
            savedAt: record.savedAt,
            status: "saved",
          };
        },
        inputSchema: {
          additionalProperties: false,
          properties: {
            note: {
              description: "A short dog wellness or trigger observation.",
              maxLength: 500,
              minLength: 1,
              type: "string",
            },
          },
          required: ["note"],
          type: "object",
        },
        name: "save_sample_observation",
        title: "Save sample observation",
      },
      { signal }
    );
  } catch {
    // The form remains available if the optional host integration is unavailable.
  }
}
