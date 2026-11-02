import { EmailStatusType } from "../../types";

export interface StatusPillProps {
  status: EmailStatusType | string;
}

export function StatusPill({ status }: StatusPillProps) {
  const normalized = status.toUpperCase();
  let label = "Scheduled";
  let statusClass = "scheduled";

  if (normalized === "SENT") {
    label = "Sent";
    statusClass = "sent";
  } else if (normalized === "PROCESSING") {
    label = "Sending";
    statusClass = "processing";
  } else if (normalized === "FAILED") {
    label = "Failed";
    statusClass = "failed";
  }

  return (
    <span className={`email-status ${statusClass}`}>
      <span aria-hidden="true" />
      {label}
    </span>
  );
}
