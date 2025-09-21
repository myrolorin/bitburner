import { PrivateServer } from "/v2/src/classes/private-server.js";

export class PrivateServerManager {
  constructor(ns) {
    this.ns = ns;
    this.serverNames = [
      'Bigfoot', 'Loch Ness Monster', 'Chupacabra', 'Mothman', 'Jersey Devil',
      'Kraken', 'Yeti', 'Thunderbird', 'Mokele-Mbembe', 'Bunyip',
      'Dover Demon', 'Mongolian Death Worm', 'Loveland Frogman', 'Wendigo', 'Ogopogo',
      'Flatwoods Monster', 'Beast of Bodmin Moor', 'Skinwalker', 'Pukwudgie', 'Raystown Ray',
      'Van Meter Visitor', 'Squonk', 'Wampus Cat', 'Snallygaster', 'Smoke Wolf'
    ];
  }

  getServers() {
    return this.ns.getPurchasedServers().map(name => new PrivateServer(this.ns, name));
  }

  maxServers() {
    return this.ns.getPurchasedServerLimit();
  }

  async evaluateAndPurchase(budget) {
    const ns = this.ns;

    let servers = this.getServers();

    // Sort servers by RAM ascending so smallest upgrade attempts first
    servers.sort((a, b) => a.getRam() - b.getRam());

    // Try upgrading existing servers
    for (const server of servers) {
      const upgradeCost = server.getUpgradeCost();
      if (upgradeCost <= budget) {
        ns.print(`Upgrading server ${server.name} for $${upgradeCost}`);
        ns.deleteServer(server.name);

        const newServerName = server.name;
        await ns.purchaseServer(newServerName, server.getRam() * 2);

        return;
      }
    }

    // Purchase new server
    if (servers.length < this.maxServers()) {
      const purchaseCost = PrivateServer.getPurchaseCost(ns);
      if (purchaseCost <= budget) {
        // Find the next available name
        const ownedNames = new Set(servers.map(s => s.name));
        const nextName = this.serverNames.find(name => !ownedNames.has(name));
        if (!nextName) {
          ns.print("No names to use for new server");
          return;
        }
        ns.print(`Purchasing new server ${nextName} for $${purchaseCost}`);
        await ns.purchaseServer(nextName, 2);
        return;
      }
    }
  }
}
