export class Server {
  constructor(ns, name) {
    this.ns = ns;
    this.name = name;
    this.info = this._getServerInfo(name);
  }

  refresh() {
    this.info = this._getServerInfo(this.name);
  }

  tryGainRoot() {
    const ns = this.ns;
    const info = this.info.basic

    if (info.rooted) return;

    const portBusters = {
      "BruteSSH.exe":  () => ns.brutessh(this.name),
      "FTPCrack.exe":  () => ns.ftpcrack(this.name),
      "relaySMTP.exe": () => ns.relaysmtp(this.name),
      "HTTPWorm.exe":  () => ns.httpworm(this.name),
      "SQLInject.exe": () => ns.sqlinject(this.name)
    };
    const ownedBusters = Object.keys(portBusters).filter(b => ns.fileExists(b, "home"));

    if (ns.getHackingLevel() >= info.hackingLevel && ownedBusters.length >= info.portsRequired) {
      for (const buster of ownedBusters) {
        portBusters[buster]();
      }

      ns.nuke(this.name);
      this.info.rooted = true;
      ns.print(`Rooted server ${this.name}.`);

      this.copyScripts();
    }
  }

  copyScripts() {
    const ns = this.ns;
    ns.scp(["hack.js", "grow.js", "weaken.js"], this.name, "home");
    ns.print(`Copied scripts to ${this.name}.`);
  }

  _getServerInfo(server) {
    const ns = this.ns;

    return {
      basic: {
        rooted:                ns.hasRootAccess(server),
        hackingLevel:          ns.getServerRequiredHackingLevel(server),
        portsRequired:         ns.getServerNumPortsRequired(server),
        connections:           ns.scan(server)
      },
      ram: {
        max:                   ns.getServerMaxRam(server),
        used:                  ns.getServerUsedRam(server),
        free:                  ns.getServerMaxRam(server) - ns.getServerUsedRam(server),
      },
      money: {
        max:                   ns.getServerMaxMoney(server),
        current:               ns.getServerMoneyAvailable(server),
        growTime:              ns.getGrowTime(server),
        growthAnalyzeSecurity: ns.growthAnalyzeSecurity(1, server)
      },
      security: {
        min:                   ns.getServerMinSecurityLevel(server),
        current:               ns.getServerSecurityLevel(server),
        weakenTime:            ns.getWeakenTime(server)
      },
      hack: {
        hackTime:              ns.getHackTime(server),
        hackAnalyze:           ns.hackAnalyze(server),
        hackAnalyzeChance:     ns.hackAnalyzeChance(server)
      },
    };
  }
}