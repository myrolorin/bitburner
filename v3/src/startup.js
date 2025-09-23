import { LOOP_SCRIPTS } from "/v3/src/lib/const/scripts.js"

/** @param {NS} ns */
export async function main(ns) {
  LOOP_SCRIPTS.forEach(s => ns.exec(s, "home"))
}