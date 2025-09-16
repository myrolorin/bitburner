/** @param {NS} ns */
export class ServerManager {
  constructor(ns, maxSpendFraction = 0.2) {
    this.ns = ns;
    this.maxSpendFraction = maxSpendFraction;
  }

  async purchaseOrUpgrade() {
    const ns = this.ns;
    const moneyAvailable = ns.getServerMoneyAvailable("home");
    const maxRam = 1048576;

    const servers = ns.getPurchasedServers();
    let bestCandidate = {action: null, cost: Infinity, ram: 0, serverName: null};
    const maxServers = ns.getPurchasedServerLimit();
    if (servers.length < maxServers) {
      let ram = 8;
      while (ram * 2 <= maxRam && ns.getPurchasedServerCost(ram * 2) < moneyAvailable * this.maxSpendFraction) {
        ram *= 2;
      }
      const cost = ns.getPurchasedServerCost(ram);
      if (cost < bestCandidate.cost) {
        bestCandidate = {action: 'buyNew', cost, ram};
      }
    }

    for (const server of servers) {
      const currentRam = ns.getServerMaxRam(server);
      if (currentRam >= maxRam) continue;
      let ram = currentRam * 2;
      while (ram <= maxRam && ns.getPurchasedServerCost(ram) < moneyAvailable * this.maxSpendFraction) {
        const cost = ns.getPurchasedServerCost(ram);
        if (cost < bestCandidate.cost || ram > bestCandidate.ram) {
          bestCandidate = {action: 'upgrade', cost, ram, serverName: server};
        }
        ram *= 2;
      }
    }

    if (bestCandidate.cost > moneyAvailable || bestCandidate.action === null) return;

    if (bestCandidate.action === 'buyNew') {
      const hostname = ns.purchaseServer('pserv-', bestCandidate.ram);
      if (hostname) ns.print(`Purchased new private server ${hostname} with RAM ${bestCandidate.ram}GB for ${bestCandidate.cost}`);
    } else if (bestCandidate.action === 'upgrade') {
      ns.deleteServer(bestCandidate.serverName);
      const hostname = ns.purchaseServer(bestCandidate.serverName, bestCandidate.ram);
      if (hostname) ns.print(`Upgraded server ${bestCandidate.serverName} to RAM ${bestCandidate.ram}GB for ${bestCandidate.cost}`);
    }
  }
}
