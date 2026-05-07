import {
  DEFAULT_EMPRESA_ID,
  getEmpresaById,
  getPerfilDemo,
  isEmpresaDemo,
  resolveEmpresaId,
} from "./empresas";

const STORAGE_KEY = "painel-empresa-ativa";
const EVENT_NAME = "painel:empresa";

export function getActiveEmpresaId() {
  if (typeof window === "undefined") return DEFAULT_EMPRESA_ID;
  const stored = window.localStorage.getItem(STORAGE_KEY);
  return resolveEmpresaId(stored);
}

export function getActiveEmpresa() {
  return getEmpresaById(getActiveEmpresaId());
}

export function hasSelectedEmpresa() {
  return typeof window !== "undefined" && Boolean(window.localStorage.getItem(STORAGE_KEY));
}

export function setActiveEmpresaId(id) {
  const empresa = getEmpresaById(id);
  if (typeof window !== "undefined") {
    window.localStorage.setItem(STORAGE_KEY, empresa.id);
    window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: empresa.id }));
  }
  return empresa.id;
}

export function onActiveEmpresaChange(callback) {
  if (typeof window === "undefined") return () => {};
  const handler = event => callback(getEmpresaById(event.detail).id);
  window.addEventListener(EVENT_NAME, handler);
  return () => window.removeEventListener(EVENT_NAME, handler);
}

export function isActiveEmpresaDemo() {
  return isEmpresaDemo(getActiveEmpresaId());
}

export function getActivePerfilDemo() {
  return getPerfilDemo(getActiveEmpresaId());
}
