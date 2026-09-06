import {
  Check,
  CloudOff,
  Database,
  Download,
  PawPrint,
  ShieldCheck,
  Smartphone,
  Upload,
} from "lucide-react";
import { useEffect, useState } from "react";
import type { ChangeEvent, SyntheticEvent } from "react";

import {
  exportPawTrendsBackup,
  restorePawTrendsBackup,
} from "@/backup/paw-trends-backup";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { registerPawTrendsWebMcpTool } from "@/integrations/paw-trends-webmcp";
import type {
  PawTrendsProbeRecord,
  PawTrendsProbeStore,
} from "@/persistence/paw-trends-probe-store";
import {
  registerPawTrendsPwa,
  requestPawTrendsPersistentStorage,
} from "@/pwa/paw-trends-pwa-registration";
import type { PawTrendsPersistentStorageStatus } from "@/pwa/paw-trends-pwa-registration";

export interface PawTrendsPersistenceProofProps {
  store: PawTrendsProbeStore;
}

type PawTrendsUiNotice =
  | { kind: "error"; message: string }
  | { kind: "success"; message: string }
  | null;

/** Renders the owner-facing workflow for proving local save, export, and restore. */
export function PawTrendsPersistenceProof({
  store,
}: PawTrendsPersistenceProofProps) {
  const [note, setNote] = useState("");
  const [record, setRecord] = useState<PawTrendsProbeRecord | null>(null);
  const [notice, setNotice] = useState<PawTrendsUiNotice>(null);
  const [isReady, setIsReady] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [storageStatus, setStorageStatus] =
    useState<PawTrendsPersistentStorageStatus>("browser-managed");

  useEffect(() => {
    let isCurrent = true;
    const loadRecord = async () => {
      const savedRecord = await store.readSampleRecord();
      if (isCurrent) {
        setRecord(savedRecord);
        setNote(savedRecord?.note ?? "");
        setIsReady(true);
      }
    };
    void loadRecord();

    return () => {
      isCurrent = false;
    };
  }, [store]);

  useEffect(() => {
    const lifecycle = new AbortController();
    void registerPawTrendsWebMcpTool({
      onRecordSaved: (savedRecord) => {
        setRecord(savedRecord);
        setNote(savedRecord.note);
        setNotice({ kind: "success", message: "Saved on this iPhone" });
      },
      signal: lifecycle.signal,
      store,
    });
    return () => {
      lifecycle.abort();
    };
  }, [store]);

  useEffect(() => {
    let isCurrent = true;
    const updateConnection = () => {
      setIsOnline(navigator.onLine);
    };
    const requestPersistentStorage = async () => {
      const status = await requestPawTrendsPersistentStorage(navigator.storage);
      if (isCurrent) {
        setStorageStatus(status);
      }
    };
    registerPawTrendsPwa();
    void requestPersistentStorage();
    updateConnection();
    window.addEventListener("online", updateConnection);
    window.addEventListener("offline", updateConnection);
    return () => {
      isCurrent = false;
      window.removeEventListener("online", updateConnection);
      window.removeEventListener("offline", updateConnection);
    };
  }, []);

  const saveObservation = async (event: SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault();
    const normalizedNote = note.trim();
    if (!normalizedNote) {
      setNotice({ kind: "error", message: "Add a short observation first." });
      return;
    }

    const savedRecord = await store.saveSampleRecord(normalizedNote);
    setRecord(savedRecord);
    setNote(savedRecord.note);
    setNotice({ kind: "success", message: "Saved on this iPhone" });
  };

  const downloadBackup = async () => {
    const backupJson = await exportPawTrendsBackup(store);
    const backupUrl = URL.createObjectURL(
      new Blob([backupJson], { type: "application/json" })
    );
    const backupLink = document.createElement("a");
    backupLink.href = backupUrl;
    backupLink.download = "paw-trends-backup.json";
    backupLink.click();
    URL.revokeObjectURL(backupUrl);
    setNotice({ kind: "success", message: "Backup downloaded" });
  };

  const restoreBackup = async (event: ChangeEvent<HTMLInputElement>) => {
    const [backupFile] = event.target.files ?? [];
    if (backupFile === undefined) {
      return;
    }

    try {
      const restoredRecord = await restorePawTrendsBackup(
        store,
        await backupFile.text()
      );
      setRecord(restoredRecord);
      setNote(restoredRecord?.note ?? "");
      setNotice({ kind: "success", message: "Backup restored" });
    } catch (error) {
      setNotice({
        kind: "error",
        message:
          error instanceof Error
            ? error.message
            : "The backup could not be restored.",
      });
    }
    event.target.value = "";
  };

  return (
    <main className="paw-shell">
      <header className="paw-header">
        <div className="paw-brand-mark" aria-hidden="true">
          <PawPrint />
        </div>
        <div>
          <p className="paw-eyebrow">Paw Trends</p>
          <h1>Your private storage check</h1>
        </div>
      </header>

      <section className="paw-intro" aria-labelledby="proof-intro-title">
        <div>
          <p className="paw-kicker">Before we build the tracker</p>
          <h2 id="proof-intro-title">Let’s prove your notes stay with you.</h2>
          <p>
            Save one sample observation, close the app, and come back. This tiny
            check makes sure Paw Trends can keep your future records on your own
            iPhone—even when you are offline.
          </p>
        </div>
        <div className="paw-privacy-seal">
          <ShieldCheck aria-hidden="true" />
          <span>Owner only</span>
          <small>No cloud database</small>
        </div>
      </section>

      <div className="paw-grid">
        <Card className="paw-card paw-record-card">
          <CardHeader>
            <div className="paw-step">01</div>
            <CardTitle>Save a sample</CardTitle>
            <CardDescription>
              Try a real note you might want to remember after a walk.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form
              className="paw-form"
              onSubmit={(event) => {
                void saveObservation(event);
              }}
            >
              <Label htmlFor="sample-observation">Sample observation</Label>
              <Textarea
                id="sample-observation"
                value={note}
                onChange={(event) => {
                  setNote(event.target.value);
                }}
                placeholder="Example: Tense after seeing a cat near Lake11."
                rows={4}
              />
              <Button type="submit" size="lg" disabled={!isReady}>
                <Database data-icon="inline-start" />
                Save on this iPhone
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className="paw-card paw-current-card">
          <CardHeader>
            <div className="paw-step">02</div>
            <CardTitle>Close, reopen, check</CardTitle>
            <CardDescription>
              Your saved sample should still appear here after a restart.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div
              className="paw-saved-note"
              aria-label="Saved sample"
              aria-live="polite"
            >
              {record ? (
                <>
                  <Check aria-hidden="true" />
                  <div>
                    <p>{record.note}</p>
                    <small>
                      Saved {new Date(record.savedAt).toLocaleString("en-GB")}
                    </small>
                  </div>
                </>
              ) : (
                <p>No sample saved yet.</p>
              )}
            </div>
            <div className="paw-device-status">
              <Smartphone aria-hidden="true" />
              <span>
                {storageStatus === "granted"
                  ? "Extra storage protection granted"
                  : "Stored and managed by this browser"}
              </span>
            </div>
            <div className="paw-device-status">
              <CloudOff aria-hidden="true" />
              <span>
                {isOnline ? "Ready for an offline check" : "You are offline"}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="paw-card paw-backup-card">
          <CardHeader>
            <div className="paw-step">03</div>
            <CardTitle>Prove backup and restore</CardTitle>
            <CardDescription>
              Download a copy, then choose that file to replace the local
              sample.
            </CardDescription>
          </CardHeader>
          <CardContent className="paw-backup-actions">
            <Button
              type="button"
              variant="outline"
              size="lg"
              onClick={() => {
                void downloadBackup();
              }}
            >
              <Download data-icon="inline-start" />
              Export backup
            </Button>
            <Label className="paw-upload-button" htmlFor="restore-backup">
              <Upload aria-hidden="true" />
              Restore backup
            </Label>
            <input
              className="paw-visually-hidden"
              id="restore-backup"
              type="file"
              accept="application/json,.json"
              onChange={(event) => {
                void restoreBackup(event);
              }}
            />
          </CardContent>
        </Card>
      </div>

      {notice === null ? null : (
        <output
          className={`paw-notice paw-notice-${notice.kind}`}
          aria-live="polite"
        >
          {notice.message}
        </output>
      )}

      <footer className="paw-footer">
        <ShieldCheck aria-hidden="true" />
        <p>
          Storage proof version 2 is installed. Nothing leaves this device
          unless you export the backup yourself.
        </p>
      </footer>
    </main>
  );
}
