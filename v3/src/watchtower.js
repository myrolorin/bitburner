import { copyScripts } from "/v3/src/lib/utils/scripts.js"
import { Logger }      from "/v3/src/lib/utils/logger.js"
import { mapNetwork }  from "/v3/src/lib/utils/servers.js"

/** @param {NS} ns */
export async function main(ns) {
  ns.disableLog('ALL');
  ns.clearLog();

  const logger = new Logger(ns, '[Watchtower] ')
  const servers = mapNetwork(ns)
  const sleepTime = 60000

  while (true) {
    try {
      for (let server of servers) {
        if (!server.rooted() && server.canRoot()) {
          server.gainRoot()
        }
        if (!server.hasScripts()) {
          await copyScripts(ns, server.hostname)
          logger.success(`Copied scripts to ${server.hostname}`)
        }
      }
    } catch (e) {
      logger.error(`[Watchtower] ERROR: ${e}`)
    }

    await ns.sleep(sleepTime)
  }
}