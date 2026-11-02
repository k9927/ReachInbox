import { ReactNode, useEffect } from "react";
import { X } from "lucide-react";

export interface ModalProps {
  title: string;
  subtitle?: string;
  eyebrow?: string;
  onClose: () => void;
  children: ReactNode;
  size?: "small" | "campaign" | "normal";
}

export function Modal({
  title,
  subtitle,
  eyebrow,
  onClose,
  children,
  size = "normal",
}: ModalProps) {
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const sizeClass = size === "small" ? "small-modal" : size === "campaign" ? "campaign-modal" : "";

  return (
    <div
      className="modal-backdrop"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <section className={`modal ${sizeClass}`.trim()} role="dialog" aria-modal="true">
        <div className="modal-heading">
          <div>
            {eyebrow && <span className="eyebrow">{eyebrow}</span>}
            <h2>{title}</h2>
            {subtitle && <p>{subtitle}</p>}
          </div>
          <button className="icon-button" onClick={onClose} aria-label="Close modal">
            <X size={19} />
          </button>
        </div>
        {children}
      </section>
    </div>
  );
}
