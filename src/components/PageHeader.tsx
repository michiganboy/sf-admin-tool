import * as React from "react";
import { Box, Typography } from "@mui/material";

export interface PageHeaderProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

/** Top-of-page header with optional subtitle and right-aligned actions. */
export default function PageHeader({ title, subtitle, actions }: PageHeaderProps) {
  return (
    <Box
      sx={{
        mt: 1.5,
        mb: 3,
        pb: 2,
        borderBottom: 1,
        borderColor: "divider",
      }}
    >
      <Box
        sx={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 2,
          flexWrap: "wrap",
        }}
      >
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="h4" component="h1">
            {title}
          </Typography>
          {subtitle != null ? (
            <Typography color="text.secondary" sx={{ mt: 1 }}>
              {subtitle}
            </Typography>
          ) : null}
        </Box>
        {actions != null ? <Box sx={{ flexShrink: 0 }}>{actions}</Box> : null}
      </Box>
    </Box>
  );
}
