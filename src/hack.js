/** @param {NS} ns **/
export async function main(ns) {
  if (ns.args.length < 1) {
    ns.tprint("Usage: run hack.js <target>");
    return;
  }
  const target = ns.args[0];

  while(true) {
    if (ns.getServerMoneyAvailable(target) > 0) {
      await ns.hack(target);
    }
    await ns.sleep(100);
  }
}
