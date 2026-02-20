import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
} from "@mui/material";

export interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  body: React.ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  onConfirm: () => void | Promise<void>;
  confirmColor?: "primary" | "error" | "inherit";
  loading?: boolean;
}

/**
 * Reusable confirmation dialog for destructive or consequential actions.
 * Use for delete-key, delete-run, clear-runs, etc.
 */
export default function ConfirmDialog({
  open,
  onClose,
  title,
  body,
  confirmLabel,
  cancelLabel = "Cancel",
  onConfirm,
  confirmColor = "error",
  loading = false,
}: ConfirmDialogProps) {
  const handleConfirm = () => {
    void onConfirm();
  };

  return (
    <Dialog open={open} onClose={loading ? undefined : onClose}>
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        {typeof body === "string" ? (
          <DialogContentText>{body}</DialogContentText>
        ) : (
          body
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={loading}>
          {cancelLabel}
        </Button>
        <Button
          onClick={handleConfirm}
          color={confirmColor}
          variant="contained"
          disabled={loading}
        >
          {confirmLabel}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
