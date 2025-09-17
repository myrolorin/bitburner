/**
 * AttackPlan: Calculates a prep or HWGW batch plan for a target using cached server info.
 */
export class AttackPlan {
  /**
   * @param {NS} ns
   * @param {string} target
   * @param {object} info - Cached server info from server-map
   */
  constructor(ns, target, info) {
    this.ns = ns;
    this.target = target;
    this.info = info;
    this.plan = null;         // Will hold the plan object (prep or batch)
    this.totalRam = 0;
    this.expectedProfit = 0;
  }

  /**
   * Build the attack plan (prep or HWGW batch) for this target.
   * Sets this.plan, this.totalRam, this.expectedProfit.
   * @returns {AttackPlan} this
   */
  build() {
    const info = this.info;
    const ns = this.ns;

    // Script RAMs (can be dynamic if you want)
    const ramHack = 1.7;
    const ramGrow = 1.75;
    const ramWeaken = 1.75;

    // Check if prepped
    const prepped = info.securityLevel <= info.minSecurity + 0.5 && info.moneyAvailable >= info.maxMoney * 0.99;

    if (!prepped) {
      // Prep: weaken if needed, else grow
      if (info.securityLevel > info.minSecurity + 0.5) {
        const weakenThreads = Math.ceil((info.securityLevel - info.minSecurity) / 0.05);
        this.plan = { type: "prep", action: "weaken", threads: weakenThreads, delay: 0 };
        this.totalRam = weakenThreads * ramWeaken;
      } else if (info.moneyAvailable < info.maxMoney * 0.99) {
        const growThreads = Math.ceil(ns.growthAnalyze(this.target, info.maxMoney / Math.max(info.moneyAvailable, 1)));
        this.plan = { type: "prep", action: "grow", threads: growThreads, delay: 0 };
        this.totalRam = growThreads * ramGrow;
      }
      this.expectedProfit = 0;
      return this;
    }

    // HWGW batch calculation
    const hackFraction = 0.1; // Steal 10% per batch
    let hackThreads = Math.floor(ns.hackAnalyzeThreads(this.target, info.maxMoney * hackFraction));
    if (hackThreads < 1) hackThreads = 1;

    const hackSecInc = ns.hackAnalyzeSecurity(hackThreads, this.target);
    const growThreads = Math.ceil(ns.growthAnalyze(this.target, 1 / (1 - hackFraction)));
    const growSecInc = ns.growthAnalyzeSecurity(growThreads, this.target);

    const weakenThreads1 = Math.ceil(hackSecInc / 0.05);
    const weakenThreads2 = Math.ceil(growSecInc / 0.05);

    // Timings (from info)
    const weakenTime = info.weakenTime;
    const growTime = info.growTime;
    const hackTime = info.hackTime;

    // Delays so actions land in order: hack -> weaken -> grow -> weaken
    const delayHack = 0;
    const delayWeaken1 = weakenTime - hackTime + 100;
    const delayGrow = weakenTime - growTime + 200;
    const delayWeaken2 = 400;

    this.plan = {
      type: "batch",
      hack:    { threads: hackThreads,   delay: delayHack },
      weaken1: { threads: weakenThreads1, delay: delayWeaken1 },
      grow:    { threads: growThreads,   delay: delayGrow },
      weaken2: { threads: weakenThreads2, delay: delayWeaken2 }
    };

    this.totalRam =
      hackThreads * ramHack +
      growThreads * ramGrow +
      weakenThreads1 * ramWeaken +
      weakenThreads2 * ramWeaken;

    // Expected profit per batch (approx)
    this.expectedProfit = hackThreads * info.maxMoney * hackFraction * (info.hackAnalyzeChance || 1);

    return this;
  }
}