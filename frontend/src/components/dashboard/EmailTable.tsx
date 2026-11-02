import { Inbox, LoaderCircle, Plus } from "lucide-react";
import { EmailItem } from "../../types";
import { StatusPill } from "../common/StatusPill";

export interface EmailTableProps {
  emails: EmailItem[];
  activeTab: "scheduled" | "sent";
  loading: boolean;
  searchQuery: string;
  onOpenCampaignModal: () => void;
}

export function EmailTable({
  emails,
  activeTab,
  loading,
  searchQuery,
  onOpenCampaignModal,
}: EmailTableProps) {
  function formatDate(isoString: string) {
    const d = new Date(isoString);
    return {
      date: d.toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
      }),
      time: d.toLocaleTimeString(undefined, {
        hour: "numeric",
        minute: "2-digit",
      }),
    };
  }

  return (
    <div className="table-scroll">
      <table>
        <thead>
          <tr>
            <th>RECIPIENT</th>
            <th>SUBJECT</th>
            <th>SENDER</th>
            <th>{activeTab === "sent" ? "SENT AT" : "SCHEDULED FOR"}</th>
            <th>STATUS</th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr>
              <td colSpan={5} className="empty-state">
                <LoaderCircle className="spin" size={20} />
                Loading your emails…
              </td>
            </tr>
          ) : emails.length > 0 ? (
            emails.map((email) => {
              const targetTime =
                activeTab === "sent" ? email.sentAt || email.scheduledAt : email.scheduledAt;
              const formatted = formatDate(targetTime);
              const senderDisplayName = email.sender.name || email.sender.email;
              const senderInitial = (email.sender.name || email.sender.email)[0]?.toUpperCase() || "S";
              const recipientInitial = email.recipient[0]?.toUpperCase() || "R";

              return (
                <tr key={email.id}>
                  <td>
                    <div className="recipient-cell">
                      <span className="recipient-avatar">{recipientInitial}</span>
                      <span>{email.recipient}</span>
                    </div>
                  </td>
                  <td className="subject-cell" title={email.subject}>
                    {email.subject}
                  </td>
                  <td>
                    <div className="sender-cell">
                      <span className="sender-dot">{senderInitial}</span>
                      <span>{senderDisplayName}</span>
                    </div>
                  </td>
                  <td className="date-cell">
                    <strong>{formatted.date}</strong>
                    <span>{formatted.time}</span>
                  </td>
                  <td>
                    <StatusPill status={email.status} />
                  </td>
                </tr>
              );
            })
          ) : (
            <tr>
              <td colSpan={5} className="empty-state">
                <span className="empty-icon">
                  <Inbox size={21} />
                </span>
                <strong>
                  {searchQuery ? "No matching emails" : `No ${activeTab} emails yet`}
                </strong>
                <span>
                  {searchQuery
                    ? "Try another recipient, sender, or subject query."
                    : "When you create a campaign, your scheduled and sent messages appear here."}
                </span>
                {!searchQuery && (
                  <button
                    className="button button-primary small"
                    onClick={onOpenCampaignModal}
                  >
                    <Plus size={15} />
                    <span>Create your first campaign</span>
                  </button>
                )}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
