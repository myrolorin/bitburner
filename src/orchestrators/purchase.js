import { ConfigManager } from "/src/managers/config.js";
import { HacknetManager } from "/src/managers/hacknet.js";
import { ServerManager } from "/src/managers/server.js";

/** @param {NS} ns **/
export class PurchaseOrchestrator {
  constructor(ns) {
    this.ns = ns;
    this.configManager = new ConfigManager(ns);
    this.hacknetManager = new HacknetManager(ns);
    this.serverManager = new ServerManager(ns);
  }

  async evaluateAndPurchase() {
    this.configManager.loadConfig();
    if (this.configManager.config["pause-purchases"]) return;

    await this.hacknetManager.evaluateAndPurchase();
    await this.serverManager.evaluateAndPurchase();
  }
}