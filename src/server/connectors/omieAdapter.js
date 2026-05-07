function notImplemented(feature) {
  throw new Error(`Omie adapter not implemented yet: ${feature}`);
}

export const omieAdapter = {
  provider: "omie",
  async getPayables() {
    return notImplemented("getPayables");
  },
};
