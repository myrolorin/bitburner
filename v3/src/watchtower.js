import { copyScripts } from "/v3/src/lib/utils/scripts.js"
import { Logger }      from "/v3/src/lib/utils/logger.js"
import { mapNetwork }  from "/v3/src/lib/utils/servers.js"

/** @param {NS} ns */
export async function main(ns) {
  ns.diableLog('ALL');
  ns.clearLog();

  const logger = new Logger(ns, '[Watchtower] ')
  const servers = mapNetwork(ns)

  while (true) {
    try {
      for (let server of servers) {
        if (!server.rooted() && server.canRoot()) {
          server.gainRoot()
        }
        if (!server.hasScripts()) {
          copyScripts(server.hostname)
          logger.success(`Copied scripts to ${server.hostname}`)
        }
      }
    } catch (e) {
      logger.error(`[Watchtower] ERROR: ${e}`)
    }
  }
}