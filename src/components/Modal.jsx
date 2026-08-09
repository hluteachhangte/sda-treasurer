import { X } from "lucide-react";
import { Button } from "./Button";

export function Modal({ title, children, onClose, wide = false }) {
  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <div className={`modal ${wide ? "modal-wide" : ""}`}>
        <div className="modal-head">
          <h2>{title}</h2>
          <Button type="button" variant="ghost" onClick={onClose} aria-label="Close">
            <X size={18} />
          </Button>
        </div>
        {children}
      </div>
    </div>
  );
}
