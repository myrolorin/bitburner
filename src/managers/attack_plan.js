import { SCRIPT_RAM } from "/src/utils/attack-helpers.js";

/**
 * AttackPlan: Calculates a prep or HWGW batch plan for a target using cached server info.
 */
export class AttackPlan {
  /**
   * @param {NS} ns
   * @param {string} target
   * @param {object} info - Cached server info from server-map
   * @param {object} config - Config object (for drain-servers, etc)
   */
  constructor(ns, target, info, config = {}) {
    this.ns = ns;
    this.target = target;
    this.info = info;
    this.config = config;
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
    const drain = this.config["drain-servers"];

    // Check if prepped
    const prepped = info.securityLevel <= info.minSecurity + 0.5 && info.moneyAvailable >= info.maxMoney * 0.99;

    if (!prepped) {
      if (info.securityLevel > info.minSecurity + 0.5) {
        const weakenThreads = Math.ceil((info.securityLevel - info.minSecurity) / 0.05);
        this.plan = {
          type: "prep",
          action: "weaken",
          weaken: { threads: weakenThreads, delay: 0 }
        };
        this.totalRam = weakenThreads * SCRIPT_RAM.weaken;
      } else if (!drain && info.moneyAvailable < info.maxMoney * 0.99) {
        // Only prep grow if not draining
        const growThreads = Math.ceil(ns.growthAnalyze(this.target, info.maxMoney / Math.max(info.moneyAvailable, 1)));
        this.plan = {
          type: "prep",
          action: "grow",
          grow: { threads: growThreads, delay: 0 }
        };
        this.totalRam = growThreads * SCRIPT_RAM.grow;
      }
      this.expectedProfit = 0;
      return this;
    }

    // HWGW batch calculation
    const hackFraction = 0.1;
    let hackThreads = Math.floor(ns.hackAnalyzeThreads(this.target, info.maxMoney * hackFraction));
    if (hackThreads < 1) hackThreads = 1;

    const hackSecInc = ns.hackAnalyzeSecurity(hackThreads, this.target);
    const weakenThreads1 = Math.ceil(hackSecInc / 0.05);

    let growThreads = 0, growSecInc = 0, weakenThreads2 = 0, delayGrow = 0, delayWeaken2 = 0;
    if (!drain) {
      growThreads = Math.ceil(ns.growthAnalyze(this.target, 1 / (1 - hackFraction)));
      growSecInc = ns.growthAnalyzeSecurity(growThreads, this.target);
      weakenThreads2 = Math.ceil(growSecInc / 0.05);
      delayGrow = info.weakenTime - info.growTime + 200;
      delayWeaken2 = 400;
    }

    const delayHack = 0;
    const delayWeaken1 = info.weakenTime - info.hackTime + 100;

    this.plan = {
      type: "batch",
      hack:    { threads: hackThreads,   delay: delayHack },
      weaken1: { threads: weakenThreads1, delay: delayWeaken1 },
      ...(drain ? {} : {
        grow:    { threads: growThreads,   delay: delayGrow },
        weaken2: { threads: weakenThreads2, delay: delayWeaken2 }
      })
    };

    this.totalRam =
      hackThreads * SCRIPT_RAM.hack +
      weakenThreads1 * SCRIPT_RAM.weaken +
      (drain ? 0 : (growThreads * SCRIPT_RAM.grow + weakenThreads2 * SCRIPT_RAM.weaken));

    this.expectedProfit = hackThreads * info.maxMoney * hackFraction * (info.hackAnalyzeChance || 1);

    return this;
  }
}