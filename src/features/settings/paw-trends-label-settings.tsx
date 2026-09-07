import { ArrowRightLeft, Pencil, Plus, Trash2 } from "lucide-react";
import { useEffect, useId, useState } from "react";
import type { SyntheticEvent } from "react";

import { Button } from "@/components/ui/button";
import type {
  PawTrendsProbeStore,
  PawTrendsReusableLabelCategory,
  PawTrendsReusableLabelReference,
  PawTrendsSetupRecord,
} from "@/persistence/paw-trends-probe-store";
import { PAW_TRENDS_REUSABLE_LABEL_CATEGORIES } from "@/persistence/paw-trends-probe-store";

interface PawTrendsLabelAction {
  category: PawTrendsReusableLabelCategory;
  label: string;
  mode: "merge" | "rename";
}

const getPawTrendsLabelReferenceKey = (
  category: PawTrendsReusableLabelCategory,
  label: string
): string => `${category}:${label}`;

const formatPawTrendsReferenceDate = (localDate: string): string => {
  const [year, month, day] = localDate.split("-").map(Number);
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(year, month - 1, day));
};

const getPawTrendsLabelReferences = async (
  store: PawTrendsProbeStore,
  setup: PawTrendsSetupRecord
): Promise<Record<string, PawTrendsReusableLabelReference[]>> => {
  const entries = await Promise.all(
    PAW_TRENDS_REUSABLE_LABEL_CATEGORIES.flatMap((category) =>
      setup.labels[category].map(
        async (label) =>
          [
            getPawTrendsLabelReferenceKey(category, label),
            await store.listReusableLabelReferences(category, label),
          ] as const
      )
    )
  );
  return Object.fromEntries(entries);
};

/** Manages category-scoped reusable labels and previews historical changes. */
export function PawTrendsLabelSettings({
  onSetupChange,
  setupRecord,
  store,
}: {
  onSetupChange: (setup: PawTrendsSetupRecord) => void;
  setupRecord: PawTrendsSetupRecord;
  store: PawTrendsProbeStore;
}) {
  const statusId = useId();
  const [references, setReferences] = useState<
    Record<string, PawTrendsReusableLabelReference[]>
  >({});
  const [newLabels, setNewLabels] = useState<
    Partial<Record<PawTrendsReusableLabelCategory, string>>
  >({});
  const [activeAction, setActiveAction] = useState<PawTrendsLabelAction | null>(
    null
  );
  const [actionValue, setActionValue] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    let isCurrent = true;
    const loadReferences = async () => {
      const savedReferences = await getPawTrendsLabelReferences(
        store,
        setupRecord
      );
      if (isCurrent) {
        setReferences(savedReferences);
      }
    };
    void loadReferences();
    return () => {
      isCurrent = false;
    };
  }, [setupRecord, store]);

  const finishLabelChange = async (
    updatedSetup: PawTrendsSetupRecord,
    message: string
  ) => {
    onSetupChange(updatedSetup);
    setActiveAction(null);
    setActionValue("");
    setErrorMessage(null);
    setStatusMessage(message);
    setReferences(await getPawTrendsLabelReferences(store, updatedSetup));
  };

  const addLabel = async (
    event: SyntheticEvent<HTMLFormElement>,
    category: PawTrendsReusableLabelCategory
  ) => {
    event.preventDefault();
    const requestedLabel = (newLabels[category] ?? "").trim();
    const duplicateLabel = setupRecord.labels[category].find(
      (label) =>
        label.toLocaleLowerCase() === requestedLabel.toLocaleLowerCase()
    );
    if (duplicateLabel !== undefined) {
      setErrorMessage(
        `${category} already has a label named ${duplicateLabel}.`
      );
      return;
    }
    setIsSaving(true);
    setErrorMessage(null);
    try {
      const updatedSetup = await store.saveReusableLabel(
        category,
        requestedLabel
      );
      setNewLabels((current) => ({ ...current, [category]: "" }));
      await finishLabelChange(updatedSetup, `${category} label added.`);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "The label could not be added."
      );
    } finally {
      setIsSaving(false);
    }
  };

  const deleteLabel = async (
    category: PawTrendsReusableLabelCategory,
    label: string
  ) => {
    setIsSaving(true);
    setErrorMessage(null);
    try {
      const updatedSetup = await store.deleteReusableLabel(category, label);
      await finishLabelChange(updatedSetup, `${label} deleted.`);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "The label could not be deleted."
      );
    } finally {
      setIsSaving(false);
    }
  };

  const submitLabelAction = async (event: SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (activeAction === null) {
      return;
    }
    setIsSaving(true);
    setErrorMessage(null);
    try {
      const updatedSetup =
        activeAction.mode === "rename"
          ? await store.renameReusableLabel(
              activeAction.category,
              activeAction.label,
              actionValue
            )
          : await store.mergeReusableLabels(
              activeAction.category,
              activeAction.label,
              actionValue
            );
      await finishLabelChange(
        updatedSetup,
        activeAction.mode === "rename"
          ? `${activeAction.label} renamed.`
          : `${activeAction.label} merged into ${actionValue}.`
      );
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "The label could not be changed."
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <section
      className="paw-label-settings"
      aria-labelledby="label-settings-title"
    >
      <div className="paw-settings-section-heading">
        <div>
          <h2 id="label-settings-title">Reusable labels</h2>
          <p>Rename or merge labels without losing their History references.</p>
        </div>
        <span>{Object.values(setupRecord.labels).flat().length} saved</span>
      </div>

      <p className="paw-visually-hidden" id={statusId} aria-live="polite">
        {statusMessage}
      </p>
      {errorMessage === null ? null : (
        <p className="paw-form-error" role="alert">
          {errorMessage}
        </p>
      )}

      <div className="paw-label-settings-groups">
        {PAW_TRENDS_REUSABLE_LABEL_CATEGORIES.map((category) => (
          <section className="paw-label-settings-group" key={category}>
            <div className="paw-label-settings-group-heading">
              <h3>{category}</h3>
              <span>{setupRecord.labels[category].length}</span>
            </div>
            {setupRecord.labels[category].length === 0 ? (
              <p className="paw-label-settings-empty">No labels yet.</p>
            ) : (
              <ul className="paw-label-settings-list">
                {setupRecord.labels[category].map((label) => {
                  const labelReferences =
                    references[
                      getPawTrendsLabelReferenceKey(category, label)
                    ] ?? [];
                  const isUsed = labelReferences.length > 0;
                  const isActive =
                    activeAction?.category === category &&
                    activeAction.label === label;
                  const mergeTargets = setupRecord.labels[category].filter(
                    (candidate) => candidate !== label
                  );
                  let submitLabel = "Merge labels";
                  if (isSaving) {
                    submitLabel = "Saving…";
                  } else if (activeAction?.mode === "rename") {
                    submitLabel = "Save name";
                  }
                  return (
                    <li key={label}>
                      <div className="paw-label-settings-row">
                        <div>
                          <strong>{label}</strong>
                          <span>
                            {isUsed
                              ? `${labelReferences.length} historical ${labelReferences.length === 1 ? "record" : "records"}`
                              : "Unused"}
                          </span>
                        </div>
                        <div className="paw-label-settings-actions">
                          <Button
                            size="sm"
                            type="button"
                            variant="ghost"
                            onClick={() => {
                              setActiveAction({
                                category,
                                label,
                                mode: "rename",
                              });
                              setActionValue(label);
                              setErrorMessage(null);
                            }}
                          >
                            <Pencil aria-hidden="true" />
                            Rename
                          </Button>
                          <Button
                            disabled={mergeTargets.length === 0}
                            size="sm"
                            type="button"
                            variant="ghost"
                            onClick={() => {
                              setActiveAction({
                                category,
                                label,
                                mode: "merge",
                              });
                              setActionValue(mergeTargets[0] ?? "");
                              setErrorMessage(null);
                            }}
                          >
                            <ArrowRightLeft aria-hidden="true" />
                            Merge
                          </Button>
                          <Button
                            aria-describedby={isUsed ? statusId : undefined}
                            aria-label={`Delete ${label}`}
                            disabled={isUsed || isSaving}
                            size="icon-sm"
                            type="button"
                            variant="destructive"
                            onClick={() => {
                              void deleteLabel(category, label);
                            }}
                          >
                            <Trash2 aria-hidden="true" />
                          </Button>
                        </div>
                      </div>

                      {isActive ? (
                        <form
                          className="paw-label-action-panel"
                          onSubmit={(event) => {
                            void submitLabelAction(event);
                          }}
                        >
                          {activeAction.mode === "rename" ? (
                            <label>
                              New name
                              <input
                                autoFocus
                                className="paw-text-input"
                                maxLength={80}
                                required
                                value={actionValue}
                                onChange={(event) => {
                                  setActionValue(event.target.value);
                                }}
                              />
                            </label>
                          ) : (
                            <>
                              <label>
                                Keep this label
                                <select
                                  value={actionValue}
                                  onChange={(event) => {
                                    setActionValue(event.target.value);
                                  }}
                                >
                                  {mergeTargets.map((target) => (
                                    <option key={target} value={target}>
                                      {target}
                                    </option>
                                  ))}
                                </select>
                              </label>
                              <div className="paw-merge-preview">
                                <strong>History preview</strong>
                                {labelReferences.length === 0 ? (
                                  <p>No historical records will change.</p>
                                ) : (
                                  <ul>
                                    {labelReferences.map((reference) => (
                                      <li
                                        key={`${reference.kind}:${reference.id}`}
                                      >
                                        {reference.kind} ·{" "}
                                        {formatPawTrendsReferenceDate(
                                          reference.localDate
                                        )}
                                      </li>
                                    ))}
                                  </ul>
                                )}
                              </div>
                            </>
                          )}
                          <div className="paw-label-action-buttons">
                            <Button disabled={isSaving} type="submit">
                              {submitLabel}
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => {
                                setActiveAction(null);
                                setErrorMessage(null);
                              }}
                            >
                              Cancel
                            </Button>
                          </div>
                        </form>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            )}
            <form
              className="paw-add-label-row paw-label-settings-add"
              onSubmit={(event) => {
                void addLabel(event, category);
              }}
            >
              <input
                aria-label={`New ${category} label`}
                className="paw-text-input"
                maxLength={80}
                placeholder={`Add ${category.toLocaleLowerCase()}`}
                value={newLabels[category] ?? ""}
                onChange={(event) => {
                  setNewLabels((current) => ({
                    ...current,
                    [category]: event.target.value,
                  }));
                }}
              />
              <Button
                aria-label={`Add ${category} label`}
                disabled={isSaving}
                size="icon-lg"
                type="submit"
                variant="outline"
              >
                <Plus aria-hidden="true" />
              </Button>
            </form>
          </section>
        ))}
      </div>
    </section>
  );
}
