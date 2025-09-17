import { ConfigManager } from "src/managers/config.js";
import { Logger }        from "src/utils/logger.js";

/** @param {NS} ns */
export class NetworkMap {
  constructor(ns) {
    this.ns = ns;
    this.serverMap = new Map();
    this.logger = new Logger(ns, "[NetworkMap] ");
    this.configManager = new ConfigManager(ns);
  }

  async mapAndRoot() {
    this.configManager.loadConfig();

    try {
      this._mapNetwork();
      this._tryGainRoot();

      configManager.config["server-map"] = Object.fromEntries(this.serverMap);
      configManager.writeConfig();
    } catch (err) {
      this.logger.error(`Failed to map and root network: ${err}`);
    }
  }

  _mapNetwork() {
    try {
      const ns = this.ns;
      const toScan = ['home'];
      const scanned = new Set();

      while (toScan.length > 0) {
        const current = toScan.pop();
        if (scanned.has(current)) continue;
        scanned.add(current);

        const connections = ns.scan(current);
        const info = this._getServerInfo(current);
        info.connections = connections;
        this.serverMap.set(current, info);

        for (const c of connections) {
          if (!scanned.has(c)) toScan.push(c);
        }
      }
    } catch (err) {
      this.logger.error(`_mapNetwork failed: ${err}`);
    }
  }

  _getServerInfo(server) {
    const ns = this.ns;
    return {
      rooted:                ns.hasRootAccess(server),
      maxRam:                ns.getServerMaxRam(server),
      usedRam:               ns.getServerUsedRam(server),
      maxMoney:              ns.getServerMaxMoney(server),
      moneyAvailable:        ns.getServerMoneyAvailable(server),
      minSecurity:           ns.getServerMinSecurityLevel(server),
      securityLevel:         ns.getServerSecurityLevel(server),
      hackTime:              ns.getHackTime(server),
      growTime:              ns.getGrowTime(server),
      weakenTime:            ns.getWeakenTime(server),
      hackAnalyze:           ns.hackAnalyze(server),
      hackAnalyzeChance:     ns.hackAnalyzeChance(server),
      hackAnalyzeThreads:    ns.hackAnalyzeThreads(server, ns.getServerMoneyAvailable(server)),
      growthAnalyze:         ns.growthAnalyze(server, 2),
      growthAnalyzeSecurity: ns.growthAnalyzeSecurity(1, server),
      hackAnalyzeSecurity:   ns.hackAnalyzeSecurity(1, server),
    };
  }

  _tryGainRoot() {
    try {
      const ns = this.ns;
      for (const [server, info] of this.serverMap) {
        if (info.rooted) continue;

        const portBusters = {
          "BruteSSH.exe":  () => ns.brutessh(server),
          "FTPCrack.exe":  () => ns.ftpcrack(server),
          "relaySMTP.exe": () => ns.relaysmtp(server),
          "HTTPWorm.exe":  () => ns.httpworm(server),
          "SQLInject.exe": () => ns.sqlinject(server)
        };
        const ownedBusters = Object.keys(portBusters).filter(b => ns.fileExists(b, "home"));

        const canHack = ns.getHackingLevel() >= ns.getServerRequiredHackingLevel(server) && ownedBusters.length >= ns.getServerNumPortsRequired(server);
        if (!canHack) continue;

        for (const buster of ownedBusters) {
          portBusters[buster]();
        }

        ns.nuke(server);
        this.serverMap.get(server).rooted = true;
        this.logger.success(`Rooted server ${server}.`);
      }
    } catch (err) {
      this.logger.error(`_tryGainRoot failed: ${err}`);
    }
  }
}