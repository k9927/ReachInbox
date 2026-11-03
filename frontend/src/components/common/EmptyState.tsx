import { ReactNode } from "react";

export interface EmptyStateProps {
  icon: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="empty-state-container">
      <span className="empty-icon">{icon}</span>
      <strong>{title}</strong>
      <span>{description}</span>
      {action && <div className="empty-state-action">{action}</div>}
    </div>
  );
}

