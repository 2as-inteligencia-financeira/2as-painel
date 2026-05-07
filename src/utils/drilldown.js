const KEY_PREFIX = "painel-drilldown:";

export function setDrilldownIntent(route, intent = {}) {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(
      `${KEY_PREFIX}${route}`,
      JSON.stringify({ ...intent, ts: Date.now() })
    );
  } catch {
    // Navigation still works if sessionStorage is unavailable.
  }
  window.dispatchEvent(new CustomEvent("painel:navigate", { detail: route }));
}

export function consumeDrilldownIntent(route) {
  if (typeof window === "undefined") return null;
  const key = `${KEY_PREFIX}${route}`;
  const raw = window.sessionStorage.getItem(key);
  if (!raw) return null;
  window.sessionStorage.removeItem(key);
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}
