export class AttackManager {
  constructor(ns) {
    this.ns = ns;
    this.growScript = "/v2/src/actions/grow.js";
    this.hackScript = "/v2/src/actions/hack.js";
    this.weakenScript = "/v2/src/actions/weaken.js";
  }

  getBestTarget(servers) {
    let best = null;
    let bestVal = 0;
    for (const server of servers) {
      server.refresh();
      const info = server.info;
      if (!info.basic.rooted) continue;
      if (info.basic.hackingLevel > this.ns.getHackingLevel()) continue;

      const val =
        info.money.max *
        this.ns.hackAnalyze(server.name) /
        (this.ns.getHackTime(server.name) / 1000);

      if (val > bestVal) {
        best = server;
        bestVal = val;
      }
    }
    return { target: best, value: bestVal };
  }

  prepPlan(server) {
    const ns = this.ns;
    server.refresh();
    const info = server.info;

    const currentMoney = info.money.current;
    const maxMoney = info.money.max;

    let growThreads = 0;
    if (currentMoney < maxMoney) {
      if (currentMoney === 0) {
        growThreads = Math.ceil(ns.growthAnalyze(server.name, 100));
      } else {
        growThreads = Math.ceil(ns.growthAnalyze(server.name, maxMoney / currentMoney));
      }
    }

    const securityIncreaseFromGrow = growThreads * info.money.growthAnalyzeSecurity;
    const currentSecurity = info.security.current;
    const minSecurity = info.security.min;
    const totalSecurityToWeaken = (currentSecurity - minSecurity) + securityIncreaseFromGrow;

    const securityPerWeaken = ns.weakenAnalyze(1);
    const weakenThreads = Math.ceil(totalSecurityToWeaken / securityPerWeaken);

    return { grow: growThreads, weaken: weakenThreads };
  }

  prepareServer(target, servers, growThreadsNeeded, weakenThreadsNeeded) {
    const ns = this.ns;

    for (const server of servers) {
      let freeRam = server.ram.free;
      if (freeRam <= 0) continue;

      const weakenRam = ns.getScriptRam(this.weakenScript, server.name);
      if (weakenThreadsNeeded > 0 && freeRam >= weakenRam) {
        const weakenThreadsToRun = Math.min(
          weakenThreadsNeeded,
          Math.floor(freeRam / weakenRam)
        );
        if (weakenThreadsToRun > 0) {
          ns.exec(this.weakenScript, server.name, weakenThreadsToRun, target.name);
          weakenThreadsNeeded -= weakenThreadsToRun;
          freeRam -= weakenThreadsToRun * weakenRam;
        }
      }

      const growRam = ns.getScriptRam(this.growScript, server.name);
      if (growThreadsNeeded > 0 && freeRam >= growRam) {
        const growThreadsToRun = Math.min(
          growThreadsNeeded,
          Math.floor(freeRam / growRam)
        );
        if (growThreadsToRun > 0) {
          ns.exec(this.growScript, server.name, growThreadsToRun, target.name);
          growThreadsNeeded -= growThreadsToRun;
          freeRam -= growThreadsToRun * growRam;
        }
      }

      if (growThreadsNeeded <= 0 && weakenThreadsNeeded <= 0) break;
    }

    return { growRemaining: growThreadsNeeded, weakenRemaining: weakenThreadsNeeded };
  }

  async continuousPrepare(target, servers) {
    const ns = this.ns;

    let growRemaining = 0;
    let weakenRemaining = 0;

    while (true) {
      const plan = this.prepPlan(target);
      growRemaining = plan.grow;
      weakenRemaining = plan.weaken;

      if (growRemaining <= 0 && weakenRemaining <= 0) {
        ns.tprint(`Server ${target.name} fully prepped!`);
        break;
      }

      const remaining = this.prepareServer(target, servers, growRemaining, weakenRemaining);
      growRemaining = remaining.growRemaining;
      weakenRemaining = remaining.weakenRemaining;

      await ns.sleep(1000);
    }
  }

  async runBatchScript(servers, script, threadsNeeded, target, delay) {
    const ns = this.ns;
    for (const server of servers) {
      let freeRam = server.ram.free;
      if (freeRam <= 0) continue;

      const scriptRam = ns.getScriptRam(script, server.name);
      const threadsCanRun = Math.min(
        threadsNeeded,
        Math.floor(freeRam / scriptRam)
      );
      if (threadsCanRun > 0) {
        ns.exec(script, server.name, threadsCanRun, target, delay);
        threadsNeeded -= threadsCanRun;
        freeRam -= threadsCanRun * scriptRam;
      }
      if (threadsNeeded <= 0) break;
    }
    return threadsNeeded;
  }

  async executeMaximizedBatch(target, servers) {
    const ns = this.ns;

    const hackRam = ns.getScriptRam(this.hackScript, 'home');
    const growRam = ns.getScriptRam(this.growScript, 'home');
    const weakenRam = ns.getScriptRam(this.weakenScript, 'home');

    let totalFreeRam = servers.reduce((acc, s) => acc + s.ram.free, 0);

    let hackThreads = Math.floor((totalFreeRam / 10) / hackRam);
    if (hackThreads < 1) {
      ns.tprint("Not enough RAM for hack threads, waiting...");
      await ns.sleep(1000);
      return;
    }

    const hackAnalyze = ns.hackAnalyze(target.name);
    const hackSecurityInc = hackThreads * ns.hackAnalyzeSecurity(1, target.name);

    let weakenThreads1 = Math.ceil(hackSecurityInc / ns.weakenAnalyze(1));
    let growThreads = Math.ceil(ns.growthAnalyze(target.name, 1 / (1 - hackAnalyze * hackThreads)));
    let weakenThreads2 = Math.ceil((growThreads * ns.growthAnalyzeSecurity(1, target.name)) / ns.weakenAnalyze(1));

    const totalRamNeeded =
      hackThreads * hackRam +
      growThreads * growRam +
      (weakenThreads1 + weakenThreads2) * weakenRam;

    if (totalRamNeeded > totalFreeRam) {
      const scale = totalFreeRam / totalRamNeeded;
      hackThreads = Math.floor(hackThreads * scale);
      growThreads = Math.floor(growThreads * scale);
      const totalWeakenThreads = weakenThreads1 + weakenThreads2;
      const weakenThreadsScaled = Math.floor(totalWeakenThreads * scale);

      weakenThreads1 = Math.floor(weakenThreadsScaled / 2);
      weakenThreads2 = weakenThreadsScaled - weakenThreads1;
    }

    const hackTime = ns.getHackTime(target.name);
    const weakenTime = ns.getWeakenTime(target.name);
    const growTime = ns.getGrowTime(target.name);
    const delayBuffer = 50;
    const weaken1Delay = 0;
    const hackDelay = weakenTime - hackTime - delayBuffer;
    const growDelay = weakenTime - growTime + delayBuffer;
    const weaken2Delay = delayBuffer;

    let remaining;

    remaining = await this.runBatchScript(servers, this.weakenScript, weakenThreads1, target.name, weaken1Delay);
    if (remaining > 0) ns.print(`Warning: RAM insufficient for all weaken1 threads.`);

    remaining = await this.runBatchScript(servers, this.hackScript, hackThreads, target.name, hackDelay);
    if (remaining > 0) ns.print(`Warning: RAM insufficient for all hack threads.`);

    remaining = await this.runBatchScript(servers, this.growScript, growThreads, target.name, growDelay);
    if (remaining > 0) ns.print(`Warning: RAM insufficient for all grow threads.`);

    remaining = await this.runBatchScript(servers, this.weakenScript, weakenThreads2, target.name, weaken2Delay);
    if (remaining > 0) ns.print(`Warning: RAM insufficient for all weaken2 threads.`);

    await ns.sleep(weakenTime + 100);
  }

  async attackLoop(servers) {
    const ns = this.ns;

    while (true) {
      const { target } = this.getBestTarget(servers);
      if (!target) {
        ns.tprint("No valid targets found, sleeping");
        await ns.sleep(5000);
        continue;
      }

      ns.tprint(`Preparing target ${target.name}`);
      await this.continuousPrepare(target, servers);
      ns.tprint(`Target ${target.name} prepared. Launching batches.`);

      while (true) {
        await this.executeMaximizedBatch(target, servers);
      }
    }
  }
}
