import { granatumAdapter } from "./granatumAdapter.js";
import { sheetsAdapter } from "./sheetsAdapter.js";
import { omieAdapter } from "./omieAdapter.js";
import { contaAzulAdapter } from "./contaAzulAdapter.js";
import { niboAdapter } from "./niboAdapter.js";

const CONNECTORS = {
  granatum: granatumAdapter,
  google_sheets: sheetsAdapter,
  omie: omieAdapter,
  conta_azul: contaAzulAdapter,
  nibo: niboAdapter,
};

export function getConnector(provider) {
  const connector = CONNECTORS[provider];
  if (!connector) throw new Error(`Unsupported connector provider: ${provider}`);
  return connector;
}

export function listConnectors() {
  return Object.keys(CONNECTORS);
}
