import { useEffect, useState } from "react";
import {
  AlertCircle,
  ArrowUpRight,
  ExternalLink,
  Layers,
  Mail,
  Plus,
  ShieldCheck,
  Slack,
  X,
} from "lucide-react";
import { Sender, SlackChannel, SlackStatus } from "../../types";
import {
  disconnectSlack,
  fetchSlackChannels,
  getBullBoardUrl,
  getSlackConnectUrl,
  updateSlackChannel,
} from "../../api/slack";
import { deleteSender } from "../../api/senders";

export interface IntegrationsPanelProps {
  senders: Sender[];
  slack: SlackStatus | null;
  onClose: () => void;
  onAddSender: () => void;
  onRefresh: () => void | Promise<void>;
  onNotice: (message: string) => void;
}

export function IntegrationsPanel({
  senders,
  slack,
  onClose,
  onAddSender,
  onRefresh,
  onNotice,
}: IntegrationsPanelProps) {
  const [channel, setChannel] = useState(slack?.account?.channelId || "");
  const [channelsList, setChannelsList] = useState<SlackChannel[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setChannel(slack?.account?.channelId || "");
    if (slack?.connected) {
      fetchSlackChannels()
        .then(setChannelsList)
        .catch(() => setChannelsList([]));
    }
  }, [slack]);

  async function handleSaveChannel() {
    setBusy(true);
    setError("");
    try {
      await updateSlackChannel(channel.trim());
      await onRefresh();
      onNotice("Slack notification channel saved.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save channel");
    } finally {
      setBusy(false);
    }
  }

  async function handleDisconnectSlack() {
    setBusy(true);
    setError("");
    try {
      await disconnectSlack();
      await onRefresh();
      onNotice("Slack workspace disconnected.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not disconnect Slack");
    } finally {
      setBusy(false);
    }
  }

  async function handleRemoveSender(id: string) {
    setBusy(true);
    setError("");
    try {
      await deleteSender(id);
      await onRefresh();
      onNotice("Sender identity removed.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not remove sender");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="panel-backdrop"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <aside className="settings-panel">
        <div className="panel-head">
          <div>
            <span className="eyebrow">WORKSPACE SETTINGS</span>
            <h2>Senders & integrations</h2>
            <p>Manage who sends your messages, queue monitors, and where alerts go.</p>
          </div>
          <button className="icon-button" onClick={onClose} aria-label="Close settings">
            <X size={19} />
          </button>
        </div>

        {error && (
          <div className="inline-error">
            <AlertCircle size={15} />
            <span>{error}</span>
          </div>
        )}

        {/* Sender Accounts */}
        <section className="settings-section">
          <div className="section-heading">
            <div>
              <span className="summary-icon purple">
                <Mail size={16} />
              </span>
              <div>
                <h3>Sender accounts</h3>
                <p>Choose the from address for each campaign.</p>
              </div>
            </div>
            <button className="button button-outline small" onClick={onAddSender}>
              <Plus size={14} />
              <span>Add sender</span>
            </button>
          </div>

          {senders.length > 0 ? (
            <div className="sender-list">
              {senders.map((sender) => (
                <div className="sender-row" key={sender.id}>
                  <span className="sender-dot large">
                    {(sender.name || sender.email)[0]?.toUpperCase()}
                  </span>
                  <div>
                    <strong>{sender.name || sender.email}</strong>
                    <span>{sender.email}</span>
                  </div>
                  <button
                    className="text-button danger"
                    disabled={busy}
                    onClick={() => handleRemoveSender(sender.id)}
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="settings-empty">
              No sender accounts yet. Add a sender to schedule your first campaign.
            </div>
          )}

          <div className="settings-info">
            <AlertCircle size={14} />
            <span>
              Supports shared Ethereal SMTP delivery or encrypted sender-specific credentials.
            </span>
          </div>
        </section>

        {/* Slack Integration */}
        <section className="settings-section">
          <div className="section-heading">
            <div>
              <span className="slack-logo">
                <Slack size={17} />
              </span>
              <div>
                <h3>Slack notifications</h3>
                <p>Get an alert the moment a sender reaches its hourly limit.</p>
              </div>
            </div>
            <span className={`connection-badge ${slack?.connected ? "connected" : ""}`}>
              <span />
              {slack?.connected ? "Connected" : "Not connected"}
            </span>
          </div>

          {slack?.connected ? (
            <>
              <div className="slack-workspace">
                <span className="workspace-icon slack-icon">
                  <Slack size={16} />
                </span>
                <div>
                  <strong>{slack.account?.teamName || "Connected workspace"}</strong>
                  <span>Connected via Slack OAuth</span>
                </div>
                <button
                  className="text-button danger"
                  disabled={busy}
                  onClick={handleDisconnectSlack}
                >
                  Disconnect
                </button>
              </div>

              <div className="channel-label">
                <label className="field-label">
                  <span>Notification channel</span>
                  {channelsList.length > 0 ? (
                    <select
                      value={channel}
                      onChange={(e) => setChannel(e.target.value)}
                    >
                      <option value="">Select a channel…</option>
                      {channelsList.map((ch) => (
                        <option key={ch.id} value={ch.id}>
                          #{ch.name} {ch.isPrivate ? "(private)" : ""} ({ch.id})
                        </option>
                      ))}
                    </select>
                  ) : null}
                  <div className="channel-row">
                    <input
                      value={channel}
                      onChange={(e) => setChannel(e.target.value)}
                      placeholder="Or enter Channel ID (e.g. C0123456789)"
                    />
                    <button
                      className="button button-outline small"
                      disabled={busy || !channel.trim()}
                      onClick={handleSaveChannel}
                    >
                      {busy ? "Saving…" : "Save"}
                    </button>
                  </div>
                </label>
                <span className="field-hint">
                  Ensure the ReachInbox bot is invited to the selected channel.
                </span>
              </div>
            </>
          ) : (
            <>
              <p className="slack-explain">
                Connect your Slack workspace to receive instant notifications whenever a sender reaches
                its hourly cap. Safe disconnect and reconnect without redeploy.
              </p>
              <a className="button button-slack" href={getSlackConnectUrl()}>
                <Slack size={17} />
                <span>Connect Slack</span>
                <ArrowUpRight size={15} />
              </a>
            </>
          )}
        </section>

        {/* Live BullMQ Queue Monitor */}
        <section className="settings-section">
          <div className="section-heading">
            <div>
              <span className="summary-icon purple">
                <Layers size={16} />
              </span>
              <div>
                <h3>BullMQ Queue Monitor</h3>
                <p>Live visibility into active, delayed, and completed jobs.</p>
              </div>
            </div>
            <a
              className="button button-outline small"
              href={getBullBoardUrl()}
              target="_blank"
              rel="noopener noreferrer"
            >
              <span>Open Dashboard</span>
              <ExternalLink size={12} />
            </a>
          </div>
          <div className="settings-info">
            <ShieldCheck size={14} />
            <span>
              Real-time BullMQ board is served at <code>/admin/queues</code>.
            </span>
          </div>
        </section>

        <div className="panel-bottom">
          <span>
            <ShieldCheck size={15} />
            Integrations are securely isolated per user account.
          </span>
          <button className="button button-outline" onClick={onClose}>
            Done
          </button>
        </div>
      </aside>
    </div>
  );
}

