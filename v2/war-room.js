import { AttackManager } from "/v2/src/managers/attack.js";
import { Server } from "/v2/src/classes/server.js";
import { Logger } from "v2/src/utils/logger.js";

/** @param {NS} ns **/
export async function main(ns) {
  const attackManager = new AttackManager(ns);
  const logger = new Logger(ns, "[War Room ");

  while (true) {
    const data = await ns.read("/v2/data/rootedServers.txt");
    const rootedNames = JSON.parse(data || "[]");

    // Instantiate Server objects for current rooted servers
    const servers = rootedNames.map(name => new Server(ns, name));

    if (servers.length === 0) {
      logger.info("No rooted servers available, waiting...");
      await ns.sleep(5000);
      continue;
    }

    try {
      // Launch the attack loop that continuously prepares and batches attacks on best target
      await attackManager.attackLoop(servers);
    } catch (error) {
      logger.error(`Error in attackManager.attackLoop: ${error}`);
      await ns.sleep(5000);
    }
  }
}
