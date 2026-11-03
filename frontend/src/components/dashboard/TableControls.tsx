import { Clock3, Search, Send } from "lucide-react";

export interface TableControlsProps {
  activeTab: "scheduled" | "sent";
  onTabChange: (tab: "scheduled" | "sent") => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  scheduledCount: number;
  sentCount: number;
}

export function TableControls({
  activeTab,
  onTabChange,
  searchQuery,
  onSearchChange,
  scheduledCount,
  sentCount,
}: TableControlsProps) {
  return (
    <div className="table-controls">
      <div className="tabs">
        <button
          className={activeTab === "scheduled" ? "selected" : ""}
          onClick={() => onTabChange("scheduled")}
        >
          <Clock3 size={15} />
          <span>Scheduled</span>
          {scheduledCount > 0 && <span>{scheduledCount}</span>}
        </button>

        <button
          className={activeTab === "sent" ? "selected" : ""}
          onClick={() => onTabChange("sent")}
        >
          <Send size={15} />
          <span>Sent</span>
          {sentCount > 0 && <span>{sentCount}</span>}
        </button>
      </div>

      <label className="search-box">
        <Search size={16} />
        <input
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search emails..."
        />
        <kbd>⌘ K</kbd>
      </label>
    </div>
  );
}

