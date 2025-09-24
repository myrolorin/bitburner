import { getScriptRam } from "/v3/src/lib/utils/scripts.js"
import { Logger }       from "/v3/src/lib/utils/logger.js"
import { PORT_BUSTERS } from "/v3/src/lib/const/port-busters.js"
import { HGW_SCRIPTS }  from "/v3/src/lib/const/scripts.js"
/** @param {NS} ns */
export class Server {
  constructor(ns, hostname) {
    this.ns = ns
    this.hostname = hostname
  }

  maxRam() {
    return this.ns.getServerMaxRam(this.hostname)
  }

  usedRam() {
    return this.ns.getServerUsedRam(this.hostname)
  }

  freeRam() {
    return this.maxRam() - this.usedRam()
  }

  maxHackThreads() {
    return Math.floor(this.freeRam() / getScriptRam(this.ns, HGW_SCRIPTS.hackScript, this.hostname))
  }

  maxGrowThreads() {
    return Math.floor(this.freeRam() / getScriptRam(this.ns, HGW_SCRIPTS.growScript, this.hostname))
  }

  maxWeakenThreads() {
    return Math.floor(this.freeRam() / getScriptRam(this.ns, HGW_SCRIPTS.weakenScript, this.hostname))
  }

  rooted() {
    return this.ns.hasRootAccess(this.hostname)
  }

  hackingLevel() {
    return this.ns.getServerRequiredHackingLevel(this.hostname)
  }

  portsRequired() {
    return this.ns.getServerNumPortsRequired(this.hostname)
  }

  ownedBusters() {
    return Object.keys(PORT_BUSTERS).filter(b => this.ns.fileExists(b, "home"))
  }

  canRoot() {
    return !this.rooted()
      && this.hackingLevel() <= this.ns.getHackingLevel()
      && this.ownedBusters().length >= this.portsRequired()
  }

  gainRoot() {
    if (!this.canRoot()) return

    const logger = new Logger(this.ns, "[lib/server] ")
    const busters = this.ownedBusters()
    for (const b of busters) {
      PORT_BUSTERS[b](this.ns, this.hostname)
    }

    this.ns.nuke(this.hostname)
    logger.success(`Rooted ${this.hostname}.`)
  }

  fileExists(file) {
    return this.ns.fileExists(file, this.hostname)
  }

  hasScripts() {
    return this.fileExists(HGW_SCRIPTS.hackScript)
        && this.fileExists(HGW_SCRIPTS.growScript)
        && this.fileExists(HGW_SCRIPTS.weakenScript)
  }

  canHost() {
    return this.rooted() && this.maxRam() > 0
  }

  hackTime() {
    return this.ns.getHackTime(this.hostname)
  }

  growTime() {
    return this.ns.getGrowTime(this.hostname)
  }

  weakenTime() {
    return this.ns.getWeakenTime(this.hostname)
  }

  async hack(target, threads, delay = 0) {
    await this.ns.exec(HGW_SCRIPTS.hackScript, this.hostname, threads, target, delay)
  }

  async grow(target, threads, delay = 0) {
    await this.ns.exec(HGW_SCRIPTS.growScript, this.hostname, threads, target, delay)
  }

  async weaken(target, threads, delay = 0) {
    await this.ns.exec(HGW_SCRIPTS.weakenScript, this.hostname, threads, target, delay)
  }

  maxMoney() {
    return this.ns.getServerMaxMoney(this.hostname)
  }

  currentMoney() {
    return this.ns.getServerMoneyAvailable(this.hostname)
  }

  minSecurity() {
    return this.ns.getServerMinSecurityLevel(this.hostname)
  }

  currentSecurity() {
    return this.ns.getServerSecurityLevel(this.hostname)
  }


  targetScore() {
    if (!this.rooted()) return 0
    if (this.hackingLevel() > (this.ns.getHackingLevel() / 2)) return 0
    return this.maxMoney() / this.minSecurity() / this.hackTime()
  }
}
