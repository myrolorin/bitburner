export class AttackManager {
  constructor(ns) {
    this.ns = ns;
  }

  async deploy(targets, rootedServers) {
    const ns = this.ns;
    const weakenScript = "/src/weaken.js";
    const growScript = "/src/grow.js";
    const hackScript = "/src/hack.js";

    // Sort targets by max money descending for priority
    targets.sort((a, b) => ns.getServerMaxMoney(b) - ns.getServerMaxMoney(a));

    for (const target of targets) {
      const maxMoney = ns.getServerMaxMoney(target);
      if (maxMoney === 0) continue;

      let moneyAvail = ns.getServerMoneyAvailable(target);
      let secLvl = ns.getServerSecurityLevel(target);
      const minSec = ns.getServerMinSecurityLevel(target);

      // Calculate how many weaken threads needed to get security down to min
      const secDiff = secLvl - minSec;
      const weakenThreadsNeeded = secDiff > 0 ? Math.ceil(secDiff / 0.05) : 0;

      // Calculate grow threads needed to restore money to max if below 99%
      const moneyRatio = moneyAvail / maxMoney;
      const growThreadsNeeded = moneyRatio < 0.99 ?
        Math.ceil(ns.growthAnalyze(target, maxMoney / Math.max(moneyAvail, 1))) : 0;

      // Calculate hack threads needed to steal ~25% or 50% of current money (adjust as needed)
      const hackFraction = 0.5;
      const hackThreadsNeeded = Math.ceil(ns.hackAnalyzeThreads(target, moneyAvail * hackFraction));

      // Helper function to deploy scripts on the network efficiently
      const deployScripts = (scriptName, threadsNeeded) => {
        let remainingThreads = threadsNeeded;

        // Iterate over rooted servers with free RAM
        for (const server of rootedServers) {
          if (remainingThreads <= 0) break;
          const maxRam = ns.getServerMaxRam(server);
          const usedRam = ns.getServerUsedRam(server);
          const freeRam = maxRam - usedRam;
          if (freeRam < 0) continue;

          const ramPerThread = ns.getScriptRam(scriptName);
          const maxThreadsOnServer = Math.floor(freeRam / ramPerThread);
          if (maxThreadsOnServer < 1) continue;

          const threadsToRun = Math.min(maxThreadsOnServer, remainingThreads);

          // Avoid stacking same script + args on this server multiple times
          // Can add more robust tracking or kill existing as needed
          if (!ns.isRunning(scriptName, server, target)) {
            ns.exec(scriptName, server, threadsToRun, target);
            ns.print(`Running ${scriptName} on ${server} targeting ${target} with ${threadsToRun} threads`);
            remainingThreads -= threadsToRun;
          }
        }
        return remainingThreads;
      };

      // Deploy in order: weaken → grow → hack, skipping actions that don't need threads
      if (weakenThreadsNeeded > 0) {
        const leftAfterWeaken = deployScripts(weakenScript, weakenThreadsNeeded);
        if (leftAfterWeaken > 0) ns.print(`Not enough RAM to weaken all required threads on ${target}`);
        continue; // Weaken first, wait for next cycle for grow/hack
      }

      if (growThreadsNeeded > 0) {
        const leftAfterGrow = deployScripts(growScript, growThreadsNeeded);
        if (leftAfterGrow > 0) ns.print(`Not enough RAM to grow all required threads on ${target}`);
        continue; // Grow second before hacking
      }

      if (hackThreadsNeeded > 0) {
        const leftAfterHack = deployScripts(hackScript, hackThreadsNeeded);
        if (leftAfterHack > 0) ns.print(`Not enough RAM to hack all required threads on ${target}`);
      }
    }
  }
}
