/** @param {NS} ns **/
export async function main(ns) {
  if (ns.args.length < 1) {
    ns.tprint("Usage: run grow.js <target>");
    return;
  }
  const target = ns.args[0];

  while(true) {
    if (ns.getServerMoneyAvailable(target) < ns.getServerMaxMoney(target)) {
      await ns.grow(target);
    }
    await ns.sleep(100);
  }
}
