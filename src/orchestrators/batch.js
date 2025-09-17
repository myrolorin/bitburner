import { Logger } from "/src/utils/logger.js";
import { ConfigManager } from "/src/managers/config.js";
import { filterFastTargets, pickBestTarget, findBestServer, SCRIPT_RAM } from "/src/utils/attack-helpers.js";
import { AttackPlan } from "/src/managers/attack-plan.js";

/**
 * BatchOrchestrator: Plans and deploys HWGW batches using cached server info.
 */
export class BatchOrchestrator {
  constructor(ns) {
    this.ns = ns;
    this.logger = new Logger(ns, "[BatchOrchestrator] ");
    this.configManager = new ConfigManager(ns);
    this.weakenScript = "/src/actions/weaken.js";
    this.growScript = "/src/actions/grow.js";
    this.hackScript = "/src/actions/hack.js";
  }

  async deploy() {
    try {
      this.configManager.loadConfig();
      const serverMap = this.configManager.config["server-map"];
      if (!serverMap) {
        this.logger.error("No server map found in config.");
        return;
      }

      // 1. Get rooted servers with RAM
      const rootedServers = Object.entries(serverMap)
        .filter(([_, info]) => info.rooted && info.maxRam > 0)
        .map(([name, _]) => name);

      // 2. Get viable targets (rooted, money, fast)
      const MAX_ACTION_TIME = 2 * 60 * 1000;
      const allTargets = Object.entries(serverMap)
        .filter(([_, info]) => info.rooted && info.maxMoney > 0)
        .map(([name, _]) => name);
      const targets = filterFastTargets(this.ns, allTargets, MAX_ACTION_TIME, serverMap);

      if (targets.length === 0) {
        this.logger.warn("No viable targets found.");
        return;
      }

      // 3. Generate attack plans
      const plans = [];
      for (const target of targets) {
        const info = serverMap[target];
        const planObj = new AttackPlan(this.ns, target, info, this.configManager.config).build();
        if (planObj && planObj.plan) plans.push(planObj);
      }

      // 4. Sort plans by expected profit/sec
      plans.sort((a, b) => b.expectedProfit - a.expectedProfit);

      // 5. Deploy plans to rooted servers
      await this.deployPlans(plans, rootedServers);

    } catch (e) {
      this.logger.error(`BatchOrchestrator.deploy failed: ${e && e.stack ? e.stack : e}`);
    }
  }

  /**
   * Deploys attack plans to rooted servers, maximizing RAM usage.
   * @param {Array<AttackPlan>} plans
   * @param {Array<string>} rootedServers
   */
  async deployPlans(plans, rootedServers) {
    const ns = this.ns;
    // Track free RAM on each server
    const serverFreeRam = {};
    for (const server of rootedServers) {
      serverFreeRam[server] = ns.getServerMaxRam(server) - ns.getServerUsedRam(server);
    }

    for (const planObj of plans) {
      const plan = planObj.plan;
      let ramNeeded = planObj.totalRam;
      let assigned = false;

      // Try to find a single server with enough RAM
      for (const server of rootedServers) {
        if (serverFreeRam[server] >= ramNeeded) {
          await this.deployPlanToServer(plan, planObj.target, server);
          serverFreeRam[server] -= ramNeeded;
          assigned = true;
          break;
        }
      }

      // If not enough RAM on one server, try to split across servers (for prep only)
      if (!assigned && plan.type === "prep" && plan.action === "weaken") {
        let threadsLeft = plan.weaken.threads;
        for (const server of rootedServers) {
          if (threadsLeft <= 0) break;
          const maxThreads = Math.floor(serverFreeRam[server] / SCRIPT_RAM.weaken);
          if (maxThreads < 1) continue;
          const toRun = Math.min(maxThreads, threadsLeft);
          await ns.scp(this.weakenScript, server);
          ns.exec(this.weakenScript, server, toRun, planObj.target, 0);
          serverFreeRam[server] -= toRun * SCRIPT_RAM.weaken;
          threadsLeft -= toRun;
        }
        assigned = true;
      }
      if (!assigned && plan.type === "prep" && plan.action === "grow") {
        let threadsLeft = plan.grow.threads;
        for (const server of rootedServers) {
          if (threadsLeft <= 0) break;
          const maxThreads = Math.floor(serverFreeRam[server] / SCRIPT_RAM.grow);
          if (maxThreads < 1) continue;
          const toRun = Math.min(maxThreads, threadsLeft);
          await ns.scp(this.growScript, server);
          ns.exec(this.growScript, server, toRun, planObj.target, 0);
          serverFreeRam[server] -= toRun * SCRIPT_RAM.grow;
          threadsLeft -= toRun;
        }
        assigned = true;
      }

      // If not enough RAM for batch, skip
      if (!assigned && plan.type === "batch") {
        this.logger.warn(`Not enough RAM for batch on ${planObj.target}, skipping.`);
      }
    }
  }

  /**
   * Deploys a full batch or prep to a single server.
   * @param {object} plan
   * @param {string} target
   * @param {string} server
   */
  async deployPlanToServer(plan, target, server) {
    const ns = this.ns;
    if (plan.type === "prep" && plan.action === "weaken") {
      await ns.scp(this.weakenScript, server);
      ns.exec(this.weakenScript, server, plan.weaken.threads, target, 0);
      this.logger.info(`Prepping (weaken) ${target} on ${server} (${plan.weaken.threads} threads)`);
      return;
    }
    if (plan.type === "prep" && plan.action === "grow") {
      await ns.scp(this.growScript, server);
      ns.exec(this.growScript, server, plan.grow.threads, target, 0);
      this.logger.info(`Prepping (grow) ${target} on ${server} (${plan.grow.threads} threads)`);
      return;
    }
    if (plan.type === "batch") {
      await ns.scp([this.hackScript, this.growScript, this.weakenScript], server);
      ns.exec(this.hackScript, server, plan.hack.threads, target, plan.hack.delay);
      ns.exec(this.weakenScript, server, plan.weaken1.threads, target, plan.weaken1.delay);
      ns.exec(this.growScript, server, plan.grow.threads, target, plan.grow.delay);
      ns.exec(this.weakenScript, server, plan.weaken2.threads, target, plan.weaken2.delay);
      this.logger.success(`Launched HWGW batch on ${target} from ${server}`);
    }
  }
}