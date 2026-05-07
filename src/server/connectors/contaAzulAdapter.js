function notImplemented(feature) {
  throw new Error(`Conta Azul adapter not implemented yet: ${feature}`);
}

export const contaAzulAdapter = {
  provider: "conta_azul",
  async getPayables() {
    return notImplemented("getPayables");
  },
};
