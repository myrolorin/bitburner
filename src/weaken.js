/** @param {NS} ns **/
export async function main(ns) {
  if (ns.args.length < 1) {
    ns.tprint("Usage: run weaken.js <target>");
    return;
  }
  const target = ns.args[0];

  while(true) {
    if (ns.getServerSecurityLevel(target) > ns.getServerMinSecurityLevel(target)) {
      await ns.weaken(target);
    }
    await ns.sleep(100);
  }
}
