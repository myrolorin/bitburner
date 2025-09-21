import { HacknetManager } from "/v2/src/managers/hacknet.js";
import { PrivateServerManager } from "/v2/src/managers/private-server.js";
import { Logger } from "v2/src/utils/logger.js";

/** @param {NS} ns */
export async function main(ns) {
  const hacknetManager = new HacknetManager(ns);
  const serverManager = new PrivateServerManager(ns);
  const logger = new Logger(ns, "[Treasury] ");

  while (true) {
    try {
      const currentMoney = ns.getServerMoneyAvailable("home");
      const hacknetBudget = currentMoney * 0.1;
      const serverBudget = currentMoney * 0.2;

      await hacknetManager.evaluateAndPurchase(hacknetBudget);
      await serverManager.evaluateAndPurchase(serverBudget);
    } catch(e) {
      logger.error(`Error in main loop: ${e}`);
    }

    await ns.sleep(60000);
  }
}
