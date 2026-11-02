import { FormEvent, useState } from "react";
import { AlertCircle, LoaderCircle, Plus, ShieldCheck, X } from "lucide-react";
import { createSender } from "../../api/senders";

export interface SenderModalProps {
  onClose: () => void;
  onSuccess: () => void | Promise<void>;
}

export function SenderModal({ onClose, onSuccess }: SenderModalProps) {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const [customSmtp, setCustomSmtp] = useState(false);
  const [smtpHost, setSmtpHost] = useState("");
  const [smtpPort, setSmtpPort] = useState("587");
  const [smtpSecure, setSmtpSecure] = useState(false);
  const [smtpUsername, setSmtpUsername] = useState("");
  const [smtpPassword, setSmtpPassword] = useState("");

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");

    try {
      await createSender({
        email,
        name: name.trim() || undefined,
        ...(customSmtp
          ? {
              smtpHost: smtpHost.trim(),
              smtpPort: Number(smtpPort),
              smtpSecure,
              smtpUsername: smtpUsername.trim(),
              smtpPassword,
            }
          : {}),
      });
      await onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add sender identity");
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
      <section className="modal small-modal">
        <div className="modal-heading">
          <div>
            <span className="eyebrow">SENDER ACCOUNTS</span>
            <h2>Add a sender</h2>
            <p>Add a from address and optional custom SMTP account.</p>
          </div>
          <button className="icon-button" onClick={onClose} aria-label="Close modal">
            <X size={19} />
          </button>
        </div>

        <form className="campaign-form" onSubmit={handleSubmit}>
          <label className="field-label">
            <span>Display name</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Alex Morgan"
            />
          </label>

          <label className="field-label">
            <span>Email address</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="alex@company.com"
            />
          </label>

          <label className="smtp-toggle">
            <input
              type="checkbox"
              checked={customSmtp}
              onChange={(e) => setCustomSmtp(e.target.checked)}
            />
            <span>Use sender-specific SMTP credentials</span>
          </label>

          {customSmtp ? (
            <>
              <div className="field-row">
                <label className="field-label">
                  <span>SMTP host</span>
                  <input
                    value={smtpHost}
                    onChange={(e) => setSmtpHost(e.target.value)}
                    required
                    placeholder="smtp.example.com"
                  />
                </label>
                <label className="field-label">
                  <span>Port</span>
                  <input
                    type="number"
                    value={smtpPort}
                    min={1}
                    max={65535}
                    onChange={(e) => setSmtpPort(e.target.value)}
                    required
                  />
                </label>
              </div>

              <label className="smtp-toggle">
                <input
                  type="checkbox"
                  checked={smtpSecure}
                  onChange={(e) => setSmtpSecure(e.target.checked)}
                />
                <span>Use TLS from connection start (usually port 465)</span>
              </label>

              <label className="field-label">
                <span>SMTP username</span>
                <input
                  autoComplete="off"
                  value={smtpUsername}
                  onChange={(e) => setSmtpUsername(e.target.value)}
                  required
                  placeholder="SMTP account username"
                />
              </label>

              <label className="field-label">
                <span>SMTP password</span>
                <input
                  type="password"
                  autoComplete="new-password"
                  value={smtpPassword}
                  onChange={(e) => setSmtpPassword(e.target.value)}
                  required
                  placeholder="Encrypted with AES-256-GCM"
                />
              </label>

              <div className="sender-disclaimer">
                <ShieldCheck size={15} />
                <span>SMTP credentials are encrypted at rest with AES-256-GCM.</span>
              </div>
            </>
          ) : (
            <div className="sender-disclaimer">
              <AlertCircle size={15} />
              <span>Uses the shared Ethereal SMTP test account for delivery simulation.</span>
            </div>
          )}

          {error && (
            <div className="inline-error">
              <AlertCircle size={15} />
              <span>{error}</span>
            </div>
          )}

          <div className="modal-footer">
            <span />
            <button type="button" className="button button-outline" onClick={onClose}>
              Cancel
            </button>
            <button className="button button-primary" disabled={busy}>
              {busy ? <LoaderCircle className="spin" size={16} /> : <Plus size={16} />}
              <span>Add sender</span>
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
