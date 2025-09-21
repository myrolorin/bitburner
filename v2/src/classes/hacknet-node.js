export class HacknetNode {
  constructor(ns, index) {
    this.ns = ns;
    this.index = index;
    this.refresh();
  }

  refresh() {
    this.stats = this.ns.hacknet.getNodeStats(this.index);
    this.upgradeCosts = {
      level: this.ns.hacknet.getLevelUpgradeCost(this.index, 1),
      ram: this.ns.hacknet.getRamUpgradeCost(this.index, 1),
      core: this.ns.hacknet.getCoreUpgradeCost(this.index, 1)
    };
    this.player = this.ns.getPlayer(); // Cache player info for formulas use
  }

  upgradeCore() {
    this.ns.hacknet.upgradeCore(this.index, 1);
    this.refresh();
  }

  upgradeRam() {
    this.ns.hacknet.upgradeRam(this.index, 1);
    this.refresh();
  }

  upgradeLevel() {
    this.ns.hacknet.upgradeLevel(this.index, 1);
    this.refresh();
  }

  _formulasApiAvailable() {
    return this.ns.fileExists("Formulas.exe", "home");
  }

  // Simulate production with an incremental upgrade
  _simulateProduction(upgradeType) {
    if (this._formulasApiAvailable()) {
      const f = this.ns.formulas.hacknet;
      const level = (upgradeType === 'level') ? this.stats.level + 1 : this.stats.level;
      const ram = (upgradeType === 'ram') ? this.stats.ram * 2 : this.stats.ram;
      const cores = (upgradeType === 'core') ? this.stats.cores + 1 : this.stats.cores;

      return f.moneyGainRate(level, ram, cores, this.player);
    } else {
      // Approximate fallback production calculation based on formulas found in research
      let level = this.stats.level;
      let ram = this.stats.ram;
      let cores = this.stats.cores;

      // Apply the upgrade approximation
      if (upgradeType === 'level') level += 1;
      else if (upgradeType === 'ram') ram *= 2;
      else if (upgradeType === 'core') cores += 1;

      // Base production formula approximate:
      // Production ~ level * ram * (1 + (cores - 1)/16) * player hacknet multipliers
      const coreMultiplier = 1 + (cores - 1) / 16;
      const baseProd = level * ram * coreMultiplier;

      // Apply player hacknet production multiplier if available
      const playerMult = this.player ? (this.player.hacknet_prod_mult || 1) : 1;

      return baseProd * playerMult;
    }
  }

  // ROI calculation method for given upgrade type
  _getUpgradeROI(upgradeType) {
    if (!['level', 'ram', 'core'].includes(upgradeType)) {
      throw new Error(`Invalid upgrade type: ${upgradeType}`);
    }

    // Check max caps
    if (upgradeType === 'level' && this.stats.level >= 200) return Infinity;
    if (upgradeType === 'ram' && this.stats.ram >= 64) return Infinity;
    if (upgradeType === 'core' && this.stats.cores >= 16) return Infinity;

    const cost = this.upgradeCosts[upgradeType];
    if (cost <= 0) return Infinity; // Avoid division by zero or negative cost

    const currentProduction = this.stats.production;
    const newProduction = this._simulateProduction(upgradeType);
    const productionIncrease = newProduction - currentProduction;

    if (productionIncrease <= 0) return Infinity;

    return cost / productionIncrease;  // ROI in seconds
  }

  get coreROI() {
    return this._getUpgradeROI('core');
  }

  get ramROI() {
    return this._getUpgradeROI('ram');
  }

  get levelROI() {
    return this._getUpgradeROI('level');
  }
}
