const DARK = {
  bg:    "#050505",
  surf:  "#0f0f0f",
  card:  "#161616",
  brd:   "#1e1e1e",
  brd2:  "#2a2a2a",
  txt:   "#ffffff",
  sub:   "#aaaaaa",
  muted: "#666666",
  dim:   "#444444",
  blue:  "#f59e0b",
  blue2: "#fbbf24",
  grn:   "#22c55e",
  red:   "#ef4444",
  amb:   "#f59e0b",
  purp:  "#2fb7c6",
  rec:   "#22c55e",
  desp:  "#ef4444",
  orc:   "#3a3a3a",
};

const LIGHT = {
  bg:    "#f0f0ea",   // warm parchment — fundo da página
  surf:  "#fafaf7",   // off-white quente — topbar, sidebar
  card:  "#ffffff",   // branco limpo — cards de conteúdo
  brd:   "#e2e2dc",   // borda quente
  brd2:  "#d0d0ca",   // borda secundária
  txt:   "#0a0a0a",
  sub:   "#333333",   // texto secundário mais definido
  muted: "#606060",   // texto de apoio
  dim:   "#999999",   // ghost / decorativo
  blue:  "#d97706",   // âmbar para texto (contraste em fundo claro)
  blue2: "#d97706",   // âmbar consistente (era #b45309, marrom demais)
  grn:   "#16803c",
  red:   "#dc2626",
  amb:   "#f59e0b",   // âmbar vivo para elementos decorativos
  purp:  "#087f8f",
  rec:   "#16803c",
  desp:  "#dc2626",
  orc:   "#8d8379",
};

const CHARTS = {
  dark: {
    grid: "#1e1e1e",
    tick: "#666666",
    zero: "#333333",
  },
  light: {
    grid: "#e4e4e0",
    tick: "#666666",
    zero: "#999999",
  },
};

export const THEMES = { dark: DARK, light: LIGHT };

// Design tokens - match index.css :root vars
export const T = {
  ...DARK,
  mode: "dark",
  // helpers
  corV: v => v >= 0 ? T.grn : T.red,
  corDesp: p => p <= 100 ? T.grn : T.red, // desp: bom abaixo do orc
  corRec: p => p >= 80 ? T.grn : T.red, // rec: bom acima do orc
};

// Chart grid / axis
export const CA = { ...CHARTS.dark };

export function applyThemeMode(mode) {
  const nextMode = mode === "light" ? "light" : "dark";
  Object.assign(T, THEMES[nextMode], { mode: nextMode });
  Object.assign(CA, CHARTS[nextMode]);

  if (typeof document !== "undefined") {
    const root = document.documentElement;
    root.dataset.theme = nextMode;
    Object.entries(THEMES[nextMode]).forEach(([key, value]) => {
      root.style.setProperty(`--${key}`, value);
    });
    Object.entries(CHARTS[nextMode]).forEach(([key, value]) => {
      root.style.setProperty(`--chart-${key}`, value);
    });
  }

  return nextMode;
}

export function getInitialThemeMode() {
  if (typeof window === "undefined") return "dark";
  return window.localStorage.getItem("painel-theme") === "light" ? "light" : "dark";
}

// Shared font — DM Mono for data labels and numeric values
export const MONO = "'DM Mono', monospace";
