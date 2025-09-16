/** @param {NS} ns */
export class NetworkMap {
  constructor(ns) {
    this.ns = ns;
    this.serverMap = new Map();
  }

  async scanAndMap() {
    const ns = this.ns;
    const toScan = ['home'];
    const scanned = new Set();

    while (toScan.length > 0) {
      const current = toScan.pop();
      if (scanned.has(current)) continue;
      scanned.add(current);

      const connections = ns.scan(current);
      this.serverMap.set(current, {connections, rooted: ns.hasRootAccess(current), requiredHackingLevel: ns.getServerRequiredHackingLevel(current)});

      for (const c of connections) {
        if (!scanned.has(c)) toScan.push(c);
      }
    }
  }

  async tryGainRoot() {
    const ns = this.ns;
    for (const [server, info] of this.serverMap) {
      if (info.rooted) continue;

      const canHack = ns.getHackingLevel() >= ns.getServerRequiredHackingLevel(server);
      if (!canHack) continue;

      const portsRequired = ns.getServerNumPortsRequired(server);
      let portCracks = 0;
      if (ns.fileExists("BruteSSH.exe", "home")) {
        ns.brutessh(server);
        portCracks++;
      }
      if (ns.fileExists("FTPCrack.exe", "home")) {
        ns.ftpcrack(server);
        portCracks++;
      }
      if (ns.fileExists("relaySMTP.exe", "home")) {
        ns.relaysmtp(server);
        portCracks++;
      }
      if (ns.fileExists("HTTPWorm.exe", "home")) {
        ns.httpworm(server);
        portCracks++;
      }
      if (ns.fileExists("SQLInject.exe", "home")) {
        ns.sqlinject(server);
        portCracks++;
      }

      if (portCracks >= portsRequired) {
        ns.nuke(server);
        this.serverMap.get(server).rooted = true;
        ns.print(`Rooted server ${server}`);
      }
    }
  }
}
