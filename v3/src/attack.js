import "/v3/src/lib/utils/servers.js"
import { Logger } from "/v3/src/lib/utils/logger.js"

/** @param {NS} ns */
// very basic implementation to get going
export async function main(ns) {
  const logger = new Logger(ns, "[Attack] ")
  const sleepTime = 1000
  const servers = mapNetwork()

  while (true) {
    try {
      const hosts = getHosts(servers)
      const target = getBestTarget(servers)
      let threads = 0

      for (const host of hosts) {
        if (host.minSecurity() < host.currentSecurity()) {
          threads = host.maxWeakenThreads()
          if (threads <= 0) continue

          await host.weaken(target, threads, 0)
        } else if (host.currentMoney() < host.maxMoney()) {
          threads = host.maxGrowThreads()
          if (threads <= 0) continue

          await host.grow(target, threads, 0)
        } else {
          threads = host.maxHackThreads()
          if (threads <= 0) continue

          await host.hack(target, threads, 0)
        }
      }
    } catch (e) {
      logger.error(e)
    }

    await ns.sleep(sleepTime)
  }
}