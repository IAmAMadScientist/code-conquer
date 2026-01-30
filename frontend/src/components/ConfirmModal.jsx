import React from "react";
import { Button } from "./ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";

/**
 * Mobile-first confirmation modal.
 * Avoids window.confirm (which looks/behaves badly on mobile).
 */
export default function ConfirmModal({
  open,
  title = "Confirm",
  message,
  confirmText = "OK",
  cancelText = "Cancel",
  danger = false,
  onConfirm,
  onClose,
}) {
  return (
    <Dialog open={!!open} onOpenChange={(v) => (!v ? onClose?.() : null)}>
      <DialogContent className="p-s5">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {message ? <DialogDescription className="whitespace-pre-line">{message}</DialogDescription> : null}
        </DialogHeader>

        <DialogFooter>
          <Button variant={danger ? "danger" : "secondary"} onClick={onConfirm} className="min-h-[48px]">
            {confirmText}
          </Button>
          <Button variant="ghost" onClick={onClose} className="min-h-[48px]">
            {cancelText}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
