/** @param {NS} ns **/
export class Logger {
  constructor(ns, prefix = "") {
    this.ns = ns;
    this.prefix = prefix;
  }

  info(message) {
    this.ns.tprint(`ℹ️ ${this.prefix} ${message}`);
  }

  success(message) {
    this.ns.print(`✅ ${this.prefix} ${message}`);
  }

  warn(message) {
    this.ns.print(`⚠️ ${this.prefix} ${message}`);
  }

  error(message) {
    this.ns.print(`❌ ${this.prefix} ${message}`);
  }

  debug(message) {
    this.ns.print(`🐞 ${this.prefix} ${message}`);
  }

  log(message) {
    this.ns.print(`📝 ${this.prefix} ${message}`);
  }
}