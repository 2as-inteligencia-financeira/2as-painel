function notImplemented(feature) {
  throw new Error(`Nibo adapter not implemented yet: ${feature}`);
}

export const niboAdapter = {
  provider: "nibo",
  async getPayables() {
    return notImplemented("getPayables");
  },
};
