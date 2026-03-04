/**
 * Theme definitions adapted from VoidChat palette system.
 * Each theme maps to GridSnap's --theme-* CSS variable tokens.
 */

export interface ThemeDef {
  id: string;
  name: string;
  swatches: [string, string, string];
  colors: Record<string, string>;
}

const FONTS = {
  mono: "'SF Mono', 'Cascadia Code', 'Fira Code', 'Consolas', monospace",
  sans: "'Inter', system-ui, -apple-system, sans-serif",
};

// ── Carbon (default — warm amber/dark) ──
const carbon: ThemeDef = {
  id: "carbon",
  name: "Carbon",
  swatches: ["#141110", "#D4915E", "#C8BFB6"],
  colors: {
    "--theme-bg-base": "#141110",
    "--theme-bg-surface": "#1C1917",
    "--theme-bg-elevated": "#231F1C",
    "--theme-bg-overlay": "#2C2724",
    "--theme-border-subtle": "#302B27",
    "--theme-border-default": "#3D3630",
    "--theme-text-primary": "#F5F0EB",
    "--theme-text-secondary": "#C8BFB6",
    "--theme-text-muted": "#8A7F76",
    "--theme-text-disabled": "#5C534B",
    "--theme-accent": "#D4915E",
    "--theme-accent-hover": "#E4A673",
    "--theme-accent-subtle": "rgba(212,145,94,0.09)",
    "--theme-status-success": "#7EBF8E",
    "--theme-status-danger": "#C97070",
    "--theme-status-warning": "#C9B870",
    "--theme-status-info": "#7BA3C9",
  },
};

// ── Ocean — cyan/teal ──
const ocean: ThemeDef = {
  id: "ocean",
  name: "Ocean",
  swatches: ["#112830", "#00d0fc", "#5ea5a8"],
  colors: {
    "--theme-bg-base": "#112830",
    "--theme-bg-surface": "#182f37",
    "--theme-bg-elevated": "#1f363e",
    "--theme-bg-overlay": "#2a4149",
    "--theme-border-subtle": "rgba(255,255,255,0.08)",
    "--theme-border-default": "rgba(255,255,255,0.13)",
    "--theme-text-primary": "#f0f4f6",
    "--theme-text-secondary": "#bcc8ce",
    "--theme-text-muted": "#8a9aa2",
    "--theme-text-disabled": "#627178",
    "--theme-accent": "#00d0fc",
    "--theme-accent-hover": "#33dafd",
    "--theme-accent-subtle": "rgba(0,208,252,0.12)",
    "--theme-status-success": "#6fb07a",
    "--theme-status-danger": "#c46b5e",
    "--theme-status-warning": "#e8b040",
    "--theme-status-info": "#5ea5a8",
  },
};

// ── Aurora — deep space + northern lights green ──
const aurora: ThemeDef = {
  id: "aurora",
  name: "Aurora",
  swatches: ["#080c16", "#22d3a0", "#7c6cf0"],
  colors: {
    "--theme-bg-base": "#080c16",
    "--theme-bg-surface": "#0f1520",
    "--theme-bg-elevated": "#172033",
    "--theme-bg-overlay": "#1c2840",
    "--theme-border-subtle": "rgba(255,255,255,0.06)",
    "--theme-border-default": "rgba(255,255,255,0.10)",
    "--theme-text-primary": "#e0eaf0",
    "--theme-text-secondary": "#8eaaba",
    "--theme-text-muted": "#5e7a94",
    "--theme-text-disabled": "#3d5570",
    "--theme-accent": "#22d3a0",
    "--theme-accent-hover": "#40e0b8",
    "--theme-accent-subtle": "rgba(34,211,160,0.10)",
    "--theme-status-success": "#22d3a0",
    "--theme-status-danger": "#e06090",
    "--theme-status-warning": "#f0c040",
    "--theme-status-info": "#7c6cf0",
  },
};

// ── Midnight — neutral gray + blue accent ──
const midnight: ThemeDef = {
  id: "midnight",
  name: "Midnight",
  swatches: ["#111111", "#3b82f6", "#f59e0b"],
  colors: {
    "--theme-bg-base": "#111111",
    "--theme-bg-surface": "#191919",
    "--theme-bg-elevated": "#222222",
    "--theme-bg-overlay": "#2a2a2a",
    "--theme-border-subtle": "rgba(255,255,255,0.06)",
    "--theme-border-default": "rgba(255,255,255,0.10)",
    "--theme-text-primary": "#e8e8e8",
    "--theme-text-secondary": "#a3a3a3",
    "--theme-text-muted": "#737373",
    "--theme-text-disabled": "#525252",
    "--theme-accent": "#3b82f6",
    "--theme-accent-hover": "#5b9af7",
    "--theme-accent-subtle": "rgba(59,130,246,0.10)",
    "--theme-status-success": "#22c55e",
    "--theme-status-danger": "#ef4444",
    "--theme-status-warning": "#f59e0b",
    "--theme-status-info": "#3b82f6",
  },
};

// ── Deep Teal — improved contrast teal ──
const deepTeal: ThemeDef = {
  id: "deepTeal",
  name: "Deep Teal",
  swatches: ["#091416", "#20dbb0", "#50b4d0"],
  colors: {
    "--theme-bg-base": "#091416",
    "--theme-bg-surface": "#0e1e22",
    "--theme-bg-elevated": "#15292e",
    "--theme-bg-overlay": "#1b3339",
    "--theme-border-subtle": "rgba(255,255,255,0.06)",
    "--theme-border-default": "rgba(255,255,255,0.10)",
    "--theme-text-primary": "#daf0ee",
    "--theme-text-secondary": "#8ec0ba",
    "--theme-text-muted": "#5e9490",
    "--theme-text-disabled": "#3d6e6a",
    "--theme-accent": "#20dbb0",
    "--theme-accent-hover": "#40e8c0",
    "--theme-accent-subtle": "rgba(32,219,176,0.10)",
    "--theme-status-success": "#20dbb0",
    "--theme-status-danger": "#f07068",
    "--theme-status-warning": "#e8c040",
    "--theme-status-info": "#50b4d0",
  },
};

// ── Crisp Light — clean daylight mode ──
const crispLight: ThemeDef = {
  id: "crispLight",
  name: "Light",
  swatches: ["#F1F5F9", "#2563EB", "#F59E0B"],
  colors: {
    "--theme-bg-base": "#F1F5F9",
    "--theme-bg-surface": "#FFFFFF",
    "--theme-bg-elevated": "#E2E8F0",
    "--theme-bg-overlay": "#DBEAFE",
    "--theme-border-subtle": "rgba(0,0,0,0.08)",
    "--theme-border-default": "rgba(0,0,0,0.14)",
    "--theme-text-primary": "#0F172A",
    "--theme-text-secondary": "#334155",
    "--theme-text-muted": "#475569",
    "--theme-text-disabled": "#94A3B8",
    "--theme-accent": "#2563EB",
    "--theme-accent-hover": "#3B82F6",
    "--theme-accent-subtle": "rgba(37,99,235,0.08)",
    "--theme-status-success": "#16A34A",
    "--theme-status-danger": "#DC2626",
    "--theme-status-warning": "#D97706",
    "--theme-status-info": "#3B82F6",
  },
};

// ── Velvet Night — Dracula-inspired dark purple ──
const velvetNight: ThemeDef = {
  id: "velvetNight",
  name: "Velvet",
  swatches: ["#1A1829", "#A855F7", "#EC4899"],
  colors: {
    "--theme-bg-base": "#1A1829",
    "--theme-bg-surface": "#221F36",
    "--theme-bg-elevated": "#2D2942",
    "--theme-bg-overlay": "#36324E",
    "--theme-border-subtle": "rgba(255,255,255,0.06)",
    "--theme-border-default": "rgba(255,255,255,0.10)",
    "--theme-text-primary": "#E2DDF0",
    "--theme-text-secondary": "#BDB6D4",
    "--theme-text-muted": "#A59EBD",
    "--theme-text-disabled": "#787296",
    "--theme-accent": "#A855F7",
    "--theme-accent-hover": "#B97CF8",
    "--theme-accent-subtle": "rgba(168,85,247,0.10)",
    "--theme-status-success": "#22c55e",
    "--theme-status-danger": "#EC4899",
    "--theme-status-warning": "#F59E0B",
    "--theme-status-info": "#C084FC",
  },
};

// ── Nordic Frost — Nord-inspired glacier ──
const nordicFrost: ThemeDef = {
  id: "nordicFrost",
  name: "Nordic",
  swatches: ["#2E3440", "#88C0D0", "#A3BE8C"],
  colors: {
    "--theme-bg-base": "#2E3440",
    "--theme-bg-surface": "#3B4252",
    "--theme-bg-elevated": "#434C5E",
    "--theme-bg-overlay": "#4C566A",
    "--theme-border-subtle": "rgba(255,255,255,0.06)",
    "--theme-border-default": "rgba(255,255,255,0.10)",
    "--theme-text-primary": "#ECEFF4",
    "--theme-text-secondary": "#D8DEE9",
    "--theme-text-muted": "#B0B8C6",
    "--theme-text-disabled": "#99A1B3",
    "--theme-accent": "#88C0D0",
    "--theme-accent-hover": "#9DD0DE",
    "--theme-accent-subtle": "rgba(136,192,208,0.12)",
    "--theme-status-success": "#A3BE8C",
    "--theme-status-danger": "#BF616A",
    "--theme-status-warning": "#EBCB8B",
    "--theme-status-info": "#81A1C1",
  },
};

// ── Obsidian Rose — luxury dark with gold + rose accents ──
const obsidianRose: ThemeDef = {
  id: "obsidianRose",
  name: "Rose",
  swatches: ["#110F14", "#D4A574", "#D46B8C"],
  colors: {
    "--theme-bg-base": "#110F14",
    "--theme-bg-surface": "#1A171F",
    "--theme-bg-elevated": "#23202A",
    "--theme-bg-overlay": "#2C2834",
    "--theme-border-subtle": "rgba(255,255,255,0.06)",
    "--theme-border-default": "rgba(255,255,255,0.10)",
    "--theme-text-primary": "#EDE9F3",
    "--theme-text-secondary": "#C4BCCE",
    "--theme-text-muted": "#9B93AB",
    "--theme-text-disabled": "#6B6479",
    "--theme-accent": "#D4A574",
    "--theme-accent-hover": "#E0B88A",
    "--theme-accent-subtle": "rgba(212,165,116,0.10)",
    "--theme-status-success": "#22c55e",
    "--theme-status-danger": "#D46B8C",
    "--theme-status-warning": "#E8B89D",
    "--theme-status-info": "#E8B89D",
  },
};

// ── Sage Terminal — green-black retro terminal ──
const sageTerminal: ThemeDef = {
  id: "sageTerminal",
  name: "Terminal",
  swatches: ["#0A0F0A", "#4ADE80", "#FCD34D"],
  colors: {
    "--theme-bg-base": "#0A0F0A",
    "--theme-bg-surface": "#111A11",
    "--theme-bg-elevated": "#1A261A",
    "--theme-bg-overlay": "#223022",
    "--theme-border-subtle": "rgba(255,255,255,0.06)",
    "--theme-border-default": "rgba(255,255,255,0.10)",
    "--theme-text-primary": "#D0E8D0",
    "--theme-text-secondary": "#98C098",
    "--theme-text-muted": "#6E9A6E",
    "--theme-text-disabled": "#4A7040",
    "--theme-accent": "#4ADE80",
    "--theme-accent-hover": "#6BE898",
    "--theme-accent-subtle": "rgba(74,222,128,0.10)",
    "--theme-status-success": "#4ADE80",
    "--theme-status-danger": "#F87171",
    "--theme-status-warning": "#FCD34D",
    "--theme-status-info": "#86EFAC",
  },
};

// ── Slate Ocean — deep navy-gray, professional ──
const slateOcean: ThemeDef = {
  id: "slateOcean",
  name: "Slate",
  swatches: ["#0C1220", "#38BDF8", "#FB923C"],
  colors: {
    "--theme-bg-base": "#0C1220",
    "--theme-bg-surface": "#131C2E",
    "--theme-bg-elevated": "#1B2740",
    "--theme-bg-overlay": "#23314D",
    "--theme-border-subtle": "rgba(255,255,255,0.06)",
    "--theme-border-default": "rgba(255,255,255,0.10)",
    "--theme-text-primary": "#E3E8F0",
    "--theme-text-secondary": "#A8B6C8",
    "--theme-text-muted": "#7B8FAA",
    "--theme-text-disabled": "#4E6380",
    "--theme-accent": "#38BDF8",
    "--theme-accent-hover": "#5CCDF9",
    "--theme-accent-subtle": "rgba(56,189,248,0.10)",
    "--theme-status-success": "#22c55e",
    "--theme-status-danger": "#ef4444",
    "--theme-status-warning": "#FB923C",
    "--theme-status-info": "#60A5FA",
  },
};

// ── Exports ──

export const THEMES: ThemeDef[] = [
  carbon, midnight, ocean, aurora, deepTeal,
  crispLight, velvetNight, nordicFrost,
  obsidianRose, sageTerminal, slateOcean,
];

export const THEME_MAP: Record<string, ThemeDef> = Object.fromEntries(
  THEMES.map((t) => [t.id, t])
);

export const DEFAULT_THEME = "carbon";

/**
 * Apply a theme by setting --theme-* CSS variables on :root.
 * Falls back to carbon if theme ID is unknown.
 */
export function applyTheme(id: string): void {
  const theme = THEME_MAP[id] ?? THEME_MAP[DEFAULT_THEME];
  if (!theme) return;

  const root = document.documentElement;
  for (const [key, value] of Object.entries(theme.colors)) {
    root.style.setProperty(key, value);
  }
  // Also add font stacks (shared across all themes)
  root.style.setProperty("--theme-font-mono", FONTS.mono);
  root.style.setProperty("--theme-font-sans", FONTS.sans);
}
