import { ChevronRight, CircleHelp, ExternalLink, Layers, Settings2 } from "lucide-react";
import { User } from "../../types";
import { getBullBoardUrl } from "../../api/slack";

export interface TopHeaderProps {
  user: User;
  onSignOut: () => void;
  onToggleMobileMenu: () => void;
}

export function TopHeader({ user, onSignOut, onToggleMobileMenu }: TopHeaderProps) {
  const avatarUrl =
    user.avatar ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=e9eafd&color=4949a4`;

  return (
    <header className="topbar">
      <div className="breadcrumb">
        <span>Workspace</span>
        <ChevronRight size={14} />
        <strong>Email activity</strong>
      </div>

      <div className="top-actions">
        <a
          href={getBullBoardUrl()}
          target="_blank"
          rel="noopener noreferrer"
          className="button button-outline small header-queue-button"
          title="Open live BullMQ queue dashboard"
        >
          <Layers size={14} />
          <span>BullMQ Monitor</span>
          <ExternalLink size={12} />
        </a>

        <button className="icon-button top-help" aria-label="Help">
          <CircleHelp size={18} />
        </button>

        <button className="avatar-button" onClick={onSignOut} title={`Signed in as ${user.email} (Click to sign out)`}>
          <img src={avatarUrl} alt={user.name} />
        </button>

        <button className="mobile-menu" onClick={onToggleMobileMenu} aria-label="Open settings">
          <Settings2 size={19} />
        </button>
      </div>
    </header>
  );
}

