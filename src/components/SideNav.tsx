import {
  Box,
  Divider,
  Drawer,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
} from "@mui/material";
import DashboardIcon from "@mui/icons-material/Dashboard";
import ExtensionIcon from "@mui/icons-material/Extension";
import HistoryIcon from "@mui/icons-material/History";
import SettingsIcon from "@mui/icons-material/Settings";

export type NavKey = "dashboard" | "modules" | "runs" | "settings";

const defaultDrawerWidth = 260;

export interface SideNavProps {
  active: NavKey;
  onChange: (next: NavKey) => void;
  drawerWidth?: number;
}

/** Permanent drawer with Dashboard, Modules, Runs, and Settings nav items. */
export default function SideNav({
  active,
  onChange,
  drawerWidth = defaultDrawerWidth,
}: SideNavProps) {
  return (
    <Drawer
      variant="permanent"
      sx={{
        width: drawerWidth,
        flexShrink: 0,
        [`& .MuiDrawer-paper`]: {
          width: drawerWidth,
          boxSizing: "border-box",
          display: "flex",
          flexDirection: "column",
          bgcolor: "background.paper",
        },
      }}
    >
      <Toolbar />
      <Box sx={{ flex: 1, overflow: "auto", display: "flex", flexDirection: "column", minHeight: 0 }}>
        <List disablePadding>
          <ListItemButton
            selected={active === "dashboard"}
            onClick={() => onChange("dashboard")}
          >
            <ListItemIcon>
              <DashboardIcon />
            </ListItemIcon>
            <ListItemText primary="Dashboard" />
          </ListItemButton>

          <ListItemButton
            selected={active === "modules"}
            onClick={() => onChange("modules")}
          >
            <ListItemIcon>
              <ExtensionIcon />
            </ListItemIcon>
            <ListItemText primary="Modules" />
          </ListItemButton>

          <ListItemButton
            selected={active === "runs"}
            onClick={() => onChange("runs")}
          >
            <ListItemIcon>
              <HistoryIcon />
            </ListItemIcon>
            <ListItemText primary="Runs" />
          </ListItemButton>
        </List>
      </Box>
      <Divider />
      <List disablePadding sx={{ flexShrink: 0 }}>
        <ListItemButton
          selected={active === "settings"}
          onClick={() => onChange("settings")}
        >
          <ListItemIcon>
            <SettingsIcon />
          </ListItemIcon>
          <ListItemText primary="Settings" />
        </ListItemButton>
      </List>
    </Drawer>
  );
}
