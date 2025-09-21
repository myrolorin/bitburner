export class PrivateServer extends Server {
  constructor(ns, name) {
    super(ns, name);
  }

  // Retrieves RAM of this purchased private server
  getRam() {
    return this.info.maxRam;
  }

  // Cost to upgrade RAM from current to double RAM (purchase new)
  getUpgradeCost() {
    const ns = this.ns;
    const newRam = this.getRam() * 2;
    if (newRam > ns.getPurchasedServerMaxRam()) return Infinity;
    return ns.getPurchasedServerCost(newRam);
  }

  // Cost to purchase new 2GB server (lowest tier)
  static getPurchaseCost(ns) {
    return ns.getPurchasedServerCost(2);
  }
}
