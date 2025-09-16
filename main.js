/** @param {NS} ns */
import { HacknetManager } from "./src/hacknet-manager.js";
import { ServerManager } from "./src/server-manager.js";
import { NetworkMap } from "./src/network-map.js";
import { AttackManager } from "./src/attack-manager.js";

export async function main(ns) {
  ns.disableLog('ALL');
  ns.clearLog();

  const hacknetManager = new HacknetManager(ns);
  const serverManager = new ServerManager(ns);
  const networkMap = new NetworkMap(ns);
  const attackManager = new AttackManager(ns);

  while (true) {
    try {
      // Scan network & gain root access
      await networkMap.scanAndMap();
      await networkMap.tryGainRoot();

      // Manage Hacknet purchases/upgrades
      await hacknetManager.evaluateAndPurchase();

      // Manage private servers
      await serverManager.purchaseOrUpgrade();

      // Get all rooted servers as script sources for deployment
      const rootedServers = Array.from(networkMap.serverMap.entries())
        .filter(([server, info]) => info.rooted)
        .map(([server]) => server);

      // Get all hackable targets (rooted, money > 0, exclude home)
      const targets = rootedServers.filter(srv =>
        ns.getServerMaxMoney(srv) > 0 && srv !== 'home'
      );

      await attackManager.deploy(targets, rootedServers);
    } catch (e) {
      ns.print(`Error in main loop: ${e.message}`);
    }

    await ns.sleep(60000);
  }
}
