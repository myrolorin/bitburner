import { ConfigManager } from "src/managers/config.js";
import { Logger }        from "src/utils/logger.js";

/** @param {NS} ns */
export class ServerManager {
  constructor(ns) {
    this.ns = ns;
    this.logger = new Logger(ns, "[ServerManager] ");
    this.configManager = new ConfigManager(ns);
  }

  async evaluateAndPurchase() {
    try {
      const ns = this.ns;
      this.configManager.loadConfig();

      const budget = this.configManager.config["server-budget"];
      const moneyAvailable = ns.getServerMoneyAvailable("home");
      const maxSpend = budget * moneyAvailable;

      const maxRam = 1048576;
      const servers = ns.getPurchasedServers();
      const maxServers = ns.getPurchasedServerLimit();

      let bestCandidate = {action: null, cost: Infinity, ram: 0, serverName: null};

      // New server candidate
      if (servers.length < maxServers) {
        let ram = 8;
        while (ram * 2 <= maxRam && ns.getPurchasedServerCost(ram * 2) < maxSpend) {
          ram *= 2;
        }

        // Ensure ram is affordable
        if (ns.getPurchasedServerCost(ram) > maxSpend) ram /= 2;
        const cost = ns.getPurchasedServerCost(ram);

        if (cost < bestCandidate.cost) {
          bestCandidate = {action: 'buyNew', cost, ram};
        }
      }

      // Upgrade candidates
      for (const server of servers) {
        const currentRam = ns.getServerMaxRam(server);
        if (currentRam >= maxRam) continue;

        let ram = currentRam * 2;

        while (ram <= maxRam && ns.getPurchasedServerCost(ram) < maxSpend) {
          const cost = ns.getPurchasedServerCost(ram);
          if (cost < bestCandidate.cost || ram > bestCandidate.ram) {
            bestCandidate = {action: 'upgrade', cost, ram, serverName: server};
          }
          ram *= 2;
        }
      }

      if (bestCandidate.cost > moneyAvailable || bestCandidate.action === null) return;

      if (bestCandidate.action === 'buyNew') {
        const hostname = ns.purchaseServer('pserv-', bestCandidate.ram);

        if (hostname) {
          this.logger.success(`Purchased new private server ${hostname} with RAM ${bestCandidate.ram}GB for $${ns.nFormat(bestCandidate.cost, "0.0a")}`);
        }
      } else if (bestCandidate.action === 'upgrade') {
        ns.deleteServer(bestCandidate.serverName);
        const hostname = ns.purchaseServer(bestCandidate.serverName, bestCandidate.ram);

        if (hostname) {
          this.logger.success(`Upgraded server ${bestCandidate.serverName} to RAM ${bestCandidate.ram}GB for $${ns.nFormat(bestCandidate.cost, "0.0a")}`);
        }
      }
    } catch (e) {
      this.logger.error(`evaluateAndPurchase failed: ${e && e.stack ? e.stack : e}`);
    }
  }
}