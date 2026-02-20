import * as React from "react";
import { Snackbar } from "@mui/material";

type Severity = "success" | "info" | "error";

interface ToastState {
  open: boolean;
  message: string;
  severity: Severity;
}

const ToastStateContext = React.createContext<{
  toast: (message: string, severity?: Severity) => void;
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
} | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = React.useState<ToastState>({
    open: false,
    message: "",
    severity: "info",
  });

  const show = React.useCallback((message: string, severity: Severity = "info") => {
    setState({ open: true, message, severity });
  }, []);

  const api = React.useMemo(
    () => ({
      toast: show,
      success: (message: string) => show(message, "success"),
      error: (message: string) => show(message, "error"),
      info: (message: string) => show(message, "info"),
    }),
    [show]
  );

  const handleClose = React.useCallback(() => {
    setState((s) => ({ ...s, open: false }));
  }, []);

  return (
    <ToastStateContext.Provider value={api}>
      {children}
      <Snackbar
        open={state.open}
        autoHideDuration={6000}
        onClose={handleClose}
        message={state.message}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
        sx={
          state.severity === "error"
            ? { "& .MuiSnackbarContent-root": { bgcolor: "error.dark" } }
            : undefined
        }
      />
    </ToastStateContext.Provider>
  );
}

export function useToast() {
  const ctx = React.useContext(ToastStateContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}
