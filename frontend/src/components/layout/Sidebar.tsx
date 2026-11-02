import {
  ArrowUpRight,
  ChevronDown,
  CircleHelp,
  Clock3,
  ExternalLink,
  Layers,
  LogOut,
  Send,
  Slack,
  Sparkles,
  Users,
} from "lucide-react";
import { User } from "../../types";
import { getBullBoardUrl } from "../../api/slack";

export interface SidebarProps {
  user: User;
  activeTab: "scheduled" | "sent";
  onTabChange: (tab: "scheduled" | "sent") => void;
  onOpenCampaignModal: () => void;
  onOpenIntegrations: () => void;
  onSignOut: () => void;
  scheduledCount: number;
  sentCount: number;
}

export function Sidebar({
  user,
  activeTab,
  onTabChange,
  onOpenCampaignModal,
  onOpenIntegrations,
  onSignOut,
  scheduledCount,
  sentCount,
}: SidebarProps) {
  const userInitial = user.name ? user.name.slice(0, 1).toUpperCase() : "U";
  const avatarUrl =
    user.avatar ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=e9eafd&color=4949a4`;

  return (
    <aside className="sidebar">
      <a className="brand" href="#dashboard">
        <span className="brand-mark">
          <Send size={18} />
        </span>
        <span>
          reach<span className="brand-accent">inbox</span>
        </span>
      </a>

      <div className="workspace-switch">
        <div className="workspace-icon">{userInitial}</div>
        <div className="workspace-copy">
          <strong>Personal workspace</strong>
          <span>Free plan</span>
        </div>
        <ChevronDown size={15} />
      </div>

      <div className="nav-label">WORKSPACE</div>

      <button
        className={`nav-item ${activeTab === "scheduled" ? "active" : ""}`}
        onClick={() => onTabChange("scheduled")}
      >
        <Clock3 size={17} />
        <span>Scheduled</span>
        {scheduledCount > 0 && <span className="nav-count">{scheduledCount}</span>}
      </button>

      <button
        className={`nav-item ${activeTab === "sent" ? "active" : ""}`}
        onClick={() => onTabChange("sent")}
      >
        <Send size={17} />
        <span>Sent</span>
        {sentCount > 0 && <span className="nav-count">{sentCount}</span>}
      </button>

      <button className="nav-item" onClick={onOpenIntegrations}>
        <Users size={17} />
        <span>Senders</span>
      </button>

      <button className="nav-item" onClick={onOpenIntegrations}>
        <Slack size={17} />
        <span>Integrations</span>
      </button>

      <a
        className="nav-item queue-nav-item"
        href={getBullBoardUrl()}
        target="_blank"
        rel="noopener noreferrer"
        title="Open live BullMQ queue dashboard"
      >
        <Layers size={17} />
        <span>Queue Monitor</span>
        <ExternalLink size={13} className="external-nav-icon" />
      </a>

      <div className="sidebar-spacer" />

      <div className="plan-card">
        <span className="plan-icon">
          <Sparkles size={15} />
        </span>
        <strong>Make every send count</strong>
        <p>Keep your outreach organized and on schedule.</p>
        <button onClick={onOpenCampaignModal}>
          Create a campaign <ArrowUpRight size={14} />
        </button>
      </div>

      <button className="nav-item help-item">
        <CircleHelp size={17} />
        <span>Help center</span>
      </button>

      <div className="profile-row">
        <img src={avatarUrl} alt={user.name} />
        <div className="profile-copy">
          <strong>{user.name}</strong>
          <span>{user.email}</span>
        </div>
        <button className="icon-button" title="Sign out" onClick={onSignOut} aria-label="Sign out">
          <LogOut size={16} />
        </button>
      </div>
    </aside>
  );
}
