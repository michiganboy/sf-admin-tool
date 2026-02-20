import * as React from "react";
import { Button, Card, CardContent, Stack, TextField, Typography, Box } from "@mui/material";
import type { ComponentType } from "react";
import ModuleDetailsShell from "./shared/ModuleDetailsShell";
import { useStartRun } from "./shared/useStartRun";
import ModuleRunForm from "./shared/_runForm";

export interface ModuleSdk {
  React: typeof React;
  MUI: {
    Button: typeof Button;
    Card: typeof Card;
    CardContent: typeof CardContent;
    Stack: typeof Stack;
    TextField: typeof TextField;
    Typography: typeof Typography;
    Box: typeof Box;
  };
  ModuleDetailsShell: typeof ModuleDetailsShell;
  ModuleRunForm: typeof ModuleRunForm;
  useStartRun: typeof useStartRun;
  toast: {
    success: (message: string) => void;
    error: (message: string) => void;
    info: (message: string) => void;
  };
  apiBaseUrl: string;
}

export interface HostSdkOptions {
  toast: {
    success: (message: string) => void;
    error: (message: string) => void;
    info: (message: string) => void;
  };
}

export function createHostSdk(options: HostSdkOptions): ModuleSdk {
  return {
    React,
    MUI: {
      Button,
      Card,
      CardContent,
      Stack,
      TextField,
      Typography,
      Box,
    },
    ModuleDetailsShell,
    ModuleRunForm,
    useStartRun,
    toast: {
      success: options.toast.success,
      error: options.toast.error,
      info: options.toast.info,
    },
    apiBaseUrl: "/api",
  };
}

export type CreateModuleFunction = (sdk: ModuleSdk) => {
  id: string;
  name: string;
  description: string;
  category: "admin" | "hygiene" | "diagnostics";
  sectionCategory?: string;
  tags?: string[];
  render: {
    DetailsPage: ComponentType<{
      onBack: () => void;
      onNavigateToRun?: (runId: string) => void;
    }>;
  };
};
