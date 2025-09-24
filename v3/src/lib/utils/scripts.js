import { HGW_SCRIPTS } from "/v3/src/lib/const/scripts.js"
import { Logger }      from "/v3/src/lib/utils/logger.js"

/** @param {NS} ns */
export async function copyScripts(ns, recipient) {
  const logger = new Logger(ns, '[utils/scripts] ')
  const toCopy = [
    HGW_SCRIPTS.hackScript,
    HGW_SCRIPTS.growScript,
    HGW_SCRIPTS.weakenScript
  ]

  for (const file of toCopy) {
    await ns.scp(file, recipient, "home")
  }

  logger.success(`Copied scripts to ${recipient}.`)
}

export function getScriptRam(ns, script, hostname) {
  return ns.getScriptRam(script, hostname)
}