import { Server } from "/v2/classes/server.js";
import { Logger } from "v2/src/utils/logger.js";

/** @param {NS} ns **/
const serverMap = new Map();

function getRootedServers() {
  return Array.from(serverMap.values()).filter(s => s.info.basic.rooted);
}

function _mapNetwork(ns) {
  const toScan = ['home'];
  const scanned = new Set();

  while (toScan.length > 0) {
    const current = toScan.pop();
    if (scanned.has(current)) continue;

    scanned.add(current);

    // Create Server instance
    const server = new Server(ns, current);

    // Copy scripts to rooted servers on init to ensure they're there
    if (server.info.rooted) server.copyScripts();

    // Add to map
    serverMap.set(current, server);

    // Add connections to scan queue
    for (const neighbor of server.info.connections) {
      if (!scanned.has(neighbor)) {
        toScan.push(neighbor);
      }
    }
  }
}

export async function main(ns) {
  ns.disableLog('sleep');
  ns.clearLog();

  const logger = new Logger(ns, "[Watchtower] ")

  _mapNetwork(ns);

  while (true) {
    try {
      for (let server of serverMap.values()) {
        if (!server.info.basic.rooted) server.tryGainRoot();
        server.refresh();
      }

      // Save rooted servers list once after scan
      const rootedServers = getRootedServers().map(s => s.name);
      await ns.write("/v2/data/rootedServers.txt", JSON.stringify(rootedServers), "w");

    } catch (error) {
      logger.error(`Error in main loop: ${error}`);
    }
    await ns.sleep(1000);
  }
}