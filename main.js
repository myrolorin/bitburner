import { BatchOrchestrator }    from "./src/orchestrators/batch.js";
import { Logger }               from "./src/utils/logger.js";
import { NetworkMap }           from "./src/managers/network.js";
import { PurchaseOrchestrator } from "./src/orchestrators/purchase.js";

/** @param {NS} ns **/
export async function main(ns) {
  ns.disableLog('ALL');
  ns.clearLog();
  const logger = new Logger(ns, "[MAIN] ");
  const networkMap = new NetworkMap(ns);
  const purchaseOrchestrator = new PurchaseOrchestrator(ns);
  const batchOrchestrator = new BatchOrchestrator(ns);

  while (true) {
    try {
      await networkMap.mapAndRoot();
      await purchaseOrchestrator.evaluateAndPurchase();
      await batchOrchestrator.deploy();

    } catch (e) {
      logger.error(`Main loop error: ${e}`);
    }

    await ns.sleep(6000);
  }
}
