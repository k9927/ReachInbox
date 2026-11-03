import { Clock3, X } from "lucide-react";
import { EmailItem } from "../../types";
import { StatusPill } from "../common/StatusPill";

export interface EmailDetailModalProps {
  email: EmailItem;
  onClose: () => void;
}

export function EmailDetailModal({ email, onClose }: EmailDetailModalProps) {
  const isSent = email.status === "SENT";
  const formattedScheduled = new Date(email.scheduledAt).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
  const formattedSent = email.sentAt
    ? new Date(email.sentAt).toLocaleString(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
      })
    : null;

  return (
    <div
      className="modal-backdrop"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <section className="modal small-modal email-detail-modal">
        <div className="modal-heading">
          <div>
            <span className="eyebrow">MESSAGE DETAILS</span>
            <h2>{email.subject}</h2>
            <p>Inspection view for scheduled and delivered emails.</p>
          </div>
          <button className="icon-button" onClick={onClose} aria-label="Close modal">
            <X size={19} />
          </button>
        </div>

        <div className="email-detail-body">
          <div className="detail-meta-grid">
            <div className="detail-row">
              <span className="detail-label">Status</span>
              <StatusPill status={email.status} />
            </div>

            <div className="detail-row">
              <span className="detail-label">To (Recipient)</span>
              <div className="recipient-cell">
                <span className="recipient-avatar">
                  {email.recipient[0]?.toUpperCase()}
                </span>
                <strong>{email.recipient}</strong>
              </div>
            </div>

            <div className="detail-row">
              <span className="detail-label">From (Sender)</span>
              <div className="sender-cell">
                <span className="sender-dot">
                  {(email.sender.name || email.sender.email)[0]?.toUpperCase()}
                </span>
                <span>
                  {email.sender.name ? `${email.sender.name} · ` : ""}
                  {email.sender.email}
                </span>
              </div>
            </div>

            <div className="detail-row">
              <span className="detail-label">
                {isSent ? "Delivered At" : "Scheduled For"}
              </span>
              <span className="detail-time">
                <Clock3 size={13} />
                {isSent ? formattedSent : formattedScheduled}
              </span>
            </div>
          </div>

          <div className="detail-content-box">
            <span className="detail-label">Email Message Content</span>
            <div className="detail-message-body">
              {email.body ? (
                <p>{email.body}</p>
              ) : (
                <p className="detail-empty-body">No body content stored.</p>
              )}
            </div>
          </div>

          {email.error && (
            <div className="inline-error">
              <span>{email.error}</span>
            </div>
          )}
        </div>

        <div className="modal-footer">
          <span />
          <button type="button" className="button button-primary small" onClick={onClose}>
            Close
          </button>
        </div>
      </section>
    </div>
  );
}
