import * as React from "react";
import { Box, Typography } from "@mui/material";

export interface SettingsSectionHeaderProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

/** Section header for Settings tabs: title, optional subtitle, optional right-aligned actions. */
export default function SettingsSectionHeader({ title, subtitle, actions }: SettingsSectionHeaderProps) {
  return (
    <Box
      sx={{
        mt: 2,
        mb: 2,
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "space-between",
        gap: 2,
        flexWrap: "wrap",
      }}
    >
      <Box sx={{ minWidth: 0 }}>
        <Typography variant="h6" component="h2" sx={{ mb: subtitle ? 0.5 : 0 }}>
          {title}
        </Typography>
        {subtitle != null ? (
          <Typography variant="body2" color="text.secondary">
            {subtitle}
          </Typography>
        ) : null}
      </Box>
      {actions != null ? <Box sx={{ flexShrink: 0 }}>{actions}</Box> : null}
    </Box>
  );
}
