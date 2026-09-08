import {
  AlertTriangle,
  Database,
  Download,
  Gauge,
  Smartphone,
  Upload,
} from "lucide-react";
import { useEffect, useId, useState } from "react";

import {
  exportPawTrendsBackup,
  previewPawTrendsRestore,
  restorePawTrendsBackup,
} from "@/backup/paw-trends-backup";
import type { PawTrendsRestorePreview } from "@/backup/paw-trends-backup";
import { Button } from "@/components/ui/button";
import type {
  PawTrendsBackupStatus,
  PawTrendsProbeStore,
  PawTrendsSetupRecord,
} from "@/persistence/paw-trends-probe-store";
import { PAW_TRENDS_DATABASE_SCHEMA_VERSION } from "@/persistence/paw-trends-probe-store";

const DELETE_PAW_TRENDS_CONFIRMATION = "DELETE PAW TRENDS";

interface PawTrendsDataSettingsProps {
  onSetupChange: (setup: PawTrendsSetupRecord | null) => void;
  setupRecord: PawTrendsSetupRecord;
  store: PawTrendsProbeStore;
}

const downloadPawTrendsBackup = (backupJson: string, exportedAt: string) => {
  const backupBlob = new Blob([backupJson], { type: "application/json" });
  const downloadUrl = URL.createObjectURL(backupBlob);
  const downloadLink = document.createElement("a");
  downloadLink.download = `paw-trends-backup-${exportedAt.slice(0, 10)}.json`;
  downloadLink.href = downloadUrl;
  downloadLink.click();
  URL.revokeObjectURL(downloadUrl);
};

const formatBackupDate = (dateTime: string) =>
  new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(dateTime));

/** Manages full local database backups, restores, guidance, and deletion. */
export function PawTrendsDataSettings({
  onSetupChange,
  setupRecord,
  store,
}: PawTrendsDataSettingsProps) {
  const restoreFileId = useId();
  const deleteConfirmationId = useId();
  const [backupStatus, setBackupStatus] =
    useState<PawTrendsBackupStatus | null>(null);
  const [restoreJson, setRestoreJson] = useState<string | null>(null);
  const [restorePreview, setRestorePreview] =
    useState<PawTrendsRestorePreview | null>(null);
  const [restoreError, setRestoreError] = useState<string | null>(null);
  const [operationMessage, setOperationMessage] = useState<string | null>(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [isWorking, setIsWorking] = useState(false);

  useEffect(() => {
    let isCurrent = true;
    const loadBackupStatus = async () => {
      const currentStatus = await store.readBackupStatus();
      if (isCurrent) {
        setBackupStatus(currentStatus);
      }
    };
    void loadBackupStatus();
    return () => {
      isCurrent = false;
    };
  }, [store]);

  const exportBackup = async () => {
    setIsWorking(true);
    setOperationMessage(null);
    try {
      const backupJson = await exportPawTrendsBackup(store);
      const { exportedAt } = previewPawTrendsRestore(backupJson);
      downloadPawTrendsBackup(backupJson, exportedAt);
      setBackupStatus(await store.readBackupStatus());
      setOperationMessage("Backup downloaded.");
    } catch {
      setOperationMessage("The backup could not be downloaded. Try again.");
    } finally {
      setIsWorking(false);
    }
  };

  const readRestoreFile = async (file: File | undefined) => {
    setRestoreError(null);
    setRestorePreview(null);
    setRestoreJson(null);
    setOperationMessage(null);
    if (file === undefined) {
      return;
    }
    try {
      const backupJson = await file.text();
      const preview = previewPawTrendsRestore(backupJson);
      setRestoreJson(backupJson);
      setRestorePreview(preview);
    } catch (error) {
      setRestoreError(
        error instanceof Error
          ? error.message
          : "This file is not a complete Paw Trends backup."
      );
    }
  };

  const confirmRestore = async () => {
    if (restoreJson === null) {
      return;
    }
    setIsWorking(true);
    setRestoreError(null);
    try {
      const restoredSnapshot = await restorePawTrendsBackup(store, restoreJson);
      setBackupStatus(restoredSnapshot.backupStatus);
      setRestoreJson(null);
      setRestorePreview(null);
      setOperationMessage("Backup restored. All current data was replaced.");
      onSetupChange(restoredSnapshot.setup);
    } catch (error) {
      setRestoreError(
        error instanceof Error
          ? error.message
          : "Restore failed. Your current data was not changed."
      );
    } finally {
      setIsWorking(false);
    }
  };

  const deleteAllData = async () => {
    if (deleteConfirmation !== DELETE_PAW_TRENDS_CONFIRMATION) {
      return;
    }
    setIsWorking(true);
    await store.deleteAllData();
    onSetupChange(null);
  };

  const shouldRemindAboutBackup =
    (backupStatus?.newTopLevelRecordsSinceExport ?? 0) >= 20;

  return (
    <div className="paw-data-settings">
      {shouldRemindAboutBackup ? (
        <aside className="paw-backup-reminder" aria-live="polite">
          <Download aria-hidden="true" />
          <div>
            <strong>Time for a backup</strong>
            <p>
              You have added {backupStatus?.newTopLevelRecordsSinceExport} new
              records since your last successful export.
            </p>
          </div>
        </aside>
      ) : null}

      <section
        className="paw-data-settings-section"
        aria-labelledby="backup-title"
      >
        <div className="paw-settings-section-heading">
          <div>
            <h2 id="backup-title">Backup and restore</h2>
            <p>Keep a copy outside this browser and restore it when needed.</p>
          </div>
          <Database aria-hidden="true" />
        </div>
        <div className="paw-backup-actions">
          <div>
            <strong>Download a complete backup</strong>
            <p>
              Includes your Dog setup, labels, moods, Daily Check-ins, Walks,
              Training, and Trigger Encounters.
            </p>
            <Button
              type="button"
              disabled={isWorking}
              onClick={() => {
                void exportBackup();
              }}
            >
              <Download aria-hidden="true" />
              Download JSON backup
            </Button>
          </div>
          <div>
            <strong>Restore from a backup</strong>
            <p>Paw Trends checks the whole file before it can replace data.</p>
            <label className="paw-file-button" htmlFor={restoreFileId}>
              <Upload aria-hidden="true" />
              Choose JSON backup
            </label>
            <input
              className="paw-visually-hidden"
              id={restoreFileId}
              type="file"
              accept="application/json,.json"
              onChange={(event) => {
                void readRestoreFile(event.target.files?.[0]);
              }}
            />
          </div>
        </div>
        {operationMessage === null ? null : (
          <p className="paw-operation-message" aria-live="polite">
            {operationMessage}
          </p>
        )}
        {restoreError === null ? null : (
          <p className="paw-form-error paw-restore-error" role="alert">
            {restoreError} Your current data has not changed.
          </p>
        )}
        {restorePreview === null ? null : (
          <div className="paw-restore-preview" aria-label="Restore preview">
            <div>
              <span>Exported</span>
              <strong>{formatBackupDate(restorePreview.exportedAt)}</strong>
            </div>
            <div>
              <span>Dog</span>
              <strong>{restorePreview.dogName}</strong>
            </div>
            <div>
              <span>Records</span>
              <strong>{restorePreview.recordCounts.total}</strong>
              <small>
                {restorePreview.recordCounts.moodEntries} moods,{" "}
                {restorePreview.recordCounts.dailyCheckIns} Daily Check-ins,{" "}
                {restorePreview.recordCounts.dogActivities} activities
              </small>
            </div>
            <p>
              Restoring replaces every current Paw Trends record. If anything
              fails, Paw Trends keeps the current database unchanged.
            </p>
            <Button
              type="button"
              variant="destructive"
              disabled={isWorking}
              onClick={() => {
                void confirmRestore();
              }}
            >
              Replace all data with this backup
            </Button>
          </div>
        )}
      </section>

      <section
        className="paw-guidance-grid"
        aria-label="Storage and scoring guidance"
      >
        <article>
          <Smartphone aria-hidden="true" />
          <div>
            <h2>Keep Paw Trends on iPhone</h2>
            <p>
              In Safari, tap Share, then Add to Home Screen. Open Paw Trends
              from that icon so the same local database stays available.
            </p>
          </div>
        </article>
        <article>
          <Gauge aria-hidden="true" />
          <div>
            <h2>Reaction Severity</h2>
            <p>
              0 means noticed with no reaction. 1 to 2 means attention with some
              response to guidance. 3 is a mild reaction. 4 is intense without
              ready disengagement. 5 is extreme or an immediate safety concern.
            </p>
          </div>
        </article>
      </section>

      <section className="paw-settings-list" aria-label="Current setup">
        <div>
          <span>Dog</span>
          <strong>{setupRecord.dogName}</strong>
        </div>
        <div>
          <span>Persistent storage</span>
          <strong>
            {setupRecord.storageStatus === "granted"
              ? "Extra protection granted"
              : "Managed by this browser"}
          </strong>
        </div>
        <div>
          <span>Last successful export</span>
          <strong>
            {backupStatus?.lastSuccessfulExportAt !== null &&
            backupStatus?.lastSuccessfulExportAt !== undefined
              ? formatBackupDate(backupStatus.lastSuccessfulExportAt)
              : "No backup yet"}
          </strong>
        </div>
        <div>
          <span>Database schema</span>
          <strong>Version {PAW_TRENDS_DATABASE_SCHEMA_VERSION}</strong>
        </div>
      </section>

      <section className="paw-danger-zone" aria-labelledby="delete-data-title">
        <div>
          <AlertTriangle aria-hidden="true" />
          <div>
            <h2 id="delete-data-title">Delete all data</h2>
            <p>
              This permanently removes the complete local Paw Trends database.
              It cannot be undone.
            </p>
          </div>
        </div>
        <label htmlFor={deleteConfirmationId}>
          Type <strong>{DELETE_PAW_TRENDS_CONFIRMATION}</strong> to continue
        </label>
        <input
          id={deleteConfirmationId}
          autoComplete="off"
          value={deleteConfirmation}
          onChange={(event) => {
            setDeleteConfirmation(event.target.value);
          }}
        />
        <Button
          type="button"
          variant="destructive"
          disabled={
            isWorking || deleteConfirmation !== DELETE_PAW_TRENDS_CONFIRMATION
          }
          onClick={() => {
            void deleteAllData();
          }}
        >
          Delete all Paw Trends data
        </Button>
      </section>
    </div>
  );
}
