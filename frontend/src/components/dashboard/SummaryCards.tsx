import { Activity, ArrowUpRight, Mail, ShieldCheck } from "lucide-react";

export interface SummaryCardsProps {
  activeTab: "scheduled" | "sent";
  totalEmails: number;
  sendersCount: number;
  loading: boolean;
}

export function SummaryCards({
  activeTab,
  totalEmails,
  sendersCount,
  loading,
}: SummaryCardsProps) {
  return (
    <div className="summary-grid">
      <div className="summary-card">
        <div className="summary-top">
          <span className="summary-icon purple">
            <Mail size={17} />
          </span>
          <span className="summary-label">
            {activeTab === "scheduled" ? "Scheduled emails" : "Sent emails"}
          </span>
          <span className="summary-trend">
            <ArrowUpRight size={13} /> LIVE
          </span>
        </div>
        <strong className="summary-value">
          {loading ? "—" : totalEmails.toLocaleString()}
        </strong>
        <span className="summary-foot">
          {activeTab === "scheduled"
            ? "Messages waiting to be sent"
            : "Messages delivered through ReachInbox"}
        </span>
      </div>

      <div className="summary-card">
        <div className="summary-top">
          <span className="summary-icon green">
            <ShieldCheck size={17} />
          </span>
          <span className="summary-label">Connected senders</span>
          <span className="summary-trend">{sendersCount} ACTIVE</span>
        </div>
        <strong className="summary-value">
          {sendersCount.toString().padStart(2, "0")}
        </strong>
        <span className="summary-foot">Sender identities in your workspace</span>
      </div>

      <div className="summary-card">
        <div className="summary-top">
          <span className="summary-icon orange">
            <Activity size={17} />
          </span>
          <span className="summary-label">Delivery safety</span>
          <span className="status-pill">
            <span />
            Protected
          </span>
        </div>
        <strong className="summary-value">Rate limited</strong>
        <span className="summary-foot">Per-sender hourly limits & throttle enforced</span>
      </div>
    </div>
  );
}
