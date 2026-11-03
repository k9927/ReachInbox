import { ChangeEvent, FormEvent, useMemo, useState } from "react";
import { AlertCircle, ChevronDown, Clock3, FileUp, LoaderCircle, ShieldCheck, Users, X } from "lucide-react";
import { Sender } from "../../types";
import { parseRecipientsFile, scheduleCampaign } from "../../api/emails";

export interface ComposeModalProps {
  senders: Sender[];
  onClose: () => void;
  onAddSender: () => void;
  onSuccess: () => void | Promise<void>;
}

export function ComposeModal({
  senders,
  onClose,
  onAddSender,
  onSuccess,
}: ComposeModalProps) {
  const [senderId, setSenderId] = useState(senders[0]?.id || "");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [startAt, setStartAt] = useState(() => {
    const d = new Date(Date.now() + 5 * 60_000);
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().slice(0, 16);
  });
  const [delay, setDelay] = useState(30);
  const [hourlyLimit, setHourlyLimit] = useState(30);
  const [idempotencyKey] = useState(() => crypto.randomUUID());
  const [recipientsText, setRecipientsText] = useState("");
  const [invalid, setInvalid] = useState<Array<{ row: number; value: string; reason: string }>>([]);
  const [fileLabel, setFileLabel] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const rawList = useMemo(
    () =>
      [...new Set(recipientsText.split(/[\s,;]+/).map((s) => s.trim().toLowerCase()).filter(Boolean))],
    [recipientsText]
  );
  const validRecipients = useMemo(
    () => rawList.filter((item) => emailRegex.test(item)),
    [rawList]
  );

  async function handleFileUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setBusy(true);
    setError("");
    setFileLabel(file.name);

    try {
      const result = await parseRecipientsFile(file);
      setRecipientsText(result.valid.join("\n"));
      setInvalid(result.invalid);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not parse recipient file");
    } finally {
      setBusy(false);
      event.target.value = "";
    }
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError("");

    if (!senderId) {
      setError("Please select or add a sender identity before scheduling.");
      return;
    }

    if (validRecipients.length === 0) {
      setError("Please add at least one valid recipient email address.");
      return;
    }

    const scheduledDate = new Date(startAt);
    if (scheduledDate.getTime() <= Date.now()) {
      setError("Start time must be in the future.");
      return;
    }

    setBusy(true);
    try {
      await scheduleCampaign(
        {
          senderId,
          subject,
          body,
          recipients: validRecipients,
          startAt: scheduledDate.toISOString(),
          delayMs: delay * 1000,
          hourlyLimit,
        },
        idempotencyKey
      );
      await onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not schedule campaign");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="modal-backdrop"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <section className="modal campaign-modal">
        <div className="modal-heading">
          <div>
            <span className="eyebrow">CAMPAIGN SETUP</span>
            <h2>Create a campaign</h2>
            <p>Choose a sender, add recipients, and set your delivery pace.</p>
          </div>
          <button className="icon-button" onClick={onClose} aria-label="Close modal">
            <X size={19} />
          </button>
        </div>

        {senders.length === 0 ? (
          <div className="empty-senders">
            <span className="empty-icon">
              <Users size={22} />
            </span>
            <strong>Connect a sender to get started</strong>
            <p>A sender identity is required before you can schedule emails.</p>
            <button className="button button-primary" onClick={onAddSender}>
              Add a sender
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="campaign-form">
            <label className="field-label">
              <span>Sender account</span>
              <select
                value={senderId}
                onChange={(e) => setSenderId(e.target.value)}
                required
              >
                {senders.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name ? `${s.name} · ` : ""}
                    {s.email}
                  </option>
                ))}
              </select>
              <ChevronDown className="select-chevron" size={16} />
            </label>

            <div className="field-label">
              <span>Recipients (Leads)</span>
              <div className="recipient-input-wrap">
                <textarea
                  value={recipientsText}
                  onChange={(e) => {
                    setRecipientsText(e.target.value);
                    setInvalid([]);
                  }}
                  placeholder="Paste emails separated by commas, spaces, or lines:
alex@company.com
sam@company.com"
                  rows={4}
                  required
                />
                <label className="upload-button">
                  <FileUp size={15} />
                  <span>Import CSV/TXT</span>
                  <input
                    type="file"
                    accept=".csv,.txt,text/csv,text/plain"
                    onChange={handleFileUpload}
                  />
                </label>
              </div>

              <div className="recipient-stats">
                <span>
                  <i className="green-dot" />
                  <strong>{validRecipients.length}</strong> valid leads detected
                </span>
                {rawList.length > validRecipients.length && (
                  <span>
                    <i className="red-dot" />
                    {rawList.length - validRecipients.length} invalid
                  </span>
                )}
                {fileLabel && <span className="file-name">{fileLabel}</span>}
              </div>

              {invalid.length > 0 && (
                <div className="invalid-list">
                  {invalid.slice(0, 3).map((item) => (
                    <span key={`${item.row}:${item.value}`}>
                      Row {item.row}: {item.value} — {item.reason}
                    </span>
                  ))}
                </div>
              )}
            </div>

            <label className="field-label">
              <span>Subject</span>
              <input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                maxLength={500}
                required
                placeholder="A quick note about your outreach strategy…"
              />
            </label>

            <label className="field-label">
              <span>Email body</span>
              <textarea
                className="body-input"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                required
                placeholder="Write your email body here…"
                rows={5}
              />
            </label>

            <div className="field-row">
              <label className="field-label">
                <span>Start date & time</span>
                <input
                  type="datetime-local"
                  value={startAt}
                  onChange={(e) => setStartAt(e.target.value)}
                  required
                />
              </label>

              <label className="field-label">
                <span>Delay between emails</span>
                <select
                  value={delay}
                  onChange={(e) => setDelay(Number(e.target.value))}
                >
                  <option value={2}>2 seconds</option>
                  <option value={10}>10 seconds</option>
                  <option value={30}>30 seconds</option>
                  <option value={60}>1 minute</option>
                  <option value={120}>2 minutes</option>
                  <option value={300}>5 minutes</option>
                </select>
              </label>
            </div>

            <label className="field-label">
              <span>Hourly sending limit</span>
              <div className="limit-input">
                <input
                  type="number"
                  min={1}
                  max={10000}
                  value={hourlyLimit}
                  onChange={(e) => setHourlyLimit(Number(e.target.value))}
                  required
                />
                <span>emails / hour</span>
                <span className="limit-hint">
                  <ShieldCheck size={14} />
                  Applied per sender
                </span>
              </div>
            </label>

            {error && (
              <div className="inline-error">
                <AlertCircle size={15} />
                <span>{error}</span>
              </div>
            )}

            <div className="modal-footer">
              <span>
                <ShieldCheck size={15} />
                Enforced by BullMQ persistent workers
              </span>
              <button
                type="button"
                className="button button-outline"
                onClick={onClose}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="button button-primary"
                disabled={busy}
              >
                {busy ? (
                  <LoaderCircle className="spin" size={16} />
                ) : (
                  <Clock3 size={16} />
                )}
                <span>Schedule emails</span>
              </button>
            </div>
          </form>
        )}
      </section>
    </div>
  );
}

