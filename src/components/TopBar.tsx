import { useState } from "react";
import {
  AppBar,
  IconButton,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Toolbar,
  Tooltip,
  Typography,
} from "@mui/material";
import DarkModeIcon from "@mui/icons-material/DarkMode";
import LightModeIcon from "@mui/icons-material/LightMode";
import SettingsBrightnessIcon from "@mui/icons-material/SettingsBrightness";
import { useColorMode, type ColorMode } from "../contexts/ColorModeContext";

export interface TopBarProps {
  title: string;
}

const MODE_OPTIONS: { value: ColorMode; label: string; Icon: typeof LightModeIcon }[] = [
  { value: "light", label: "Light", Icon: LightModeIcon },
  { value: "dark", label: "Dark", Icon: DarkModeIcon },
  { value: "system", label: "System", Icon: SettingsBrightnessIcon },
];

/** App bar: title and theme (light/dark/system) menu. */
export default function TopBar({ title }: TopBarProps) {
  const { mode, setMode } = useColorMode();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);

  const current = MODE_OPTIONS.find((o) => o.value === mode) ?? MODE_OPTIONS[2];
  const ModeIcon = current.Icon;

  const handleOpen = (e: React.MouseEvent<HTMLElement>) => setAnchorEl(e.currentTarget);
  const handleClose = () => setAnchorEl(null);
  const handleSelect = (value: ColorMode) => {
    setMode(value);
    handleClose();
  };

  return (
    <AppBar position="fixed" sx={{ zIndex: (t) => t.zIndex.drawer + 1 }}>
      <Toolbar>
        <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
          {title}
        </Typography>
        <Tooltip title="Theme">
          <IconButton
            color="inherit"
            onClick={handleOpen}
            aria-label="Theme"
            aria-controls={open ? "theme-menu" : undefined}
            aria-haspopup="true"
            aria-expanded={open ? "true" : undefined}
          >
            <ModeIcon />
          </IconButton>
        </Tooltip>
        <Menu
          id="theme-menu"
          anchorEl={anchorEl}
          open={open}
          onClose={handleClose}
          slotProps={{ list: { "aria-labelledby": "theme-button" } }}
          anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
          transformOrigin={{ vertical: "top", horizontal: "right" }}
        >
          {MODE_OPTIONS.map(({ value, label, Icon }) => (
            <MenuItem
              key={value}
              selected={mode === value}
              onClick={() => handleSelect(value)}
            >
              <ListItemIcon>
                <Icon fontSize="small" />
              </ListItemIcon>
              <ListItemText>{label}</ListItemText>
            </MenuItem>
          ))}
        </Menu>
      </Toolbar>
    </AppBar>
  );
}
