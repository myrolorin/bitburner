import { mapNetwork, getHosts, chooseBestTarget } from "/v3/src/lib/utils/servers.js"
import { Logger } from "/v3/src/lib/utils/logger.js"

/** @param {NS} ns */
// very basic implementation to get going
export async function main(ns) {
  ns.clearLog()
  const logger = new Logger(ns, "[Attack] ")

  const sleepTime = 1000
  const servers = mapNetwork(ns)

  while (true) {
    try {
      const hosts = getHosts(servers)
      const target = chooseBestTarget(servers)
      let threads = 0

      for (const host of hosts) {
        if (host.minSecurity() < host.currentSecurity()) {
          threads = host.maxWeakenThreads()
          if (threads <= 0) continue

          await host.weaken(target.hostname, threads)
        } else if (host.currentMoney() < host.maxMoney()) {
          threads = host.maxGrowThreads()
          if (threads <= 0) continue

          await host.grow(target.hostname, threads)
        } else {
          threads = host.maxHackThreads()
          if (threads <= 0) continue

          await host.hack(target.hostname, threads)
        }
      }
    } catch (e) {
      logger.error(e)
    }
    await ns.sleep(sleepTime)
  }
}