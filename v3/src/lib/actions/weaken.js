/** @param {NS} ns **/
export async function main(ns) {
  const [target, delay = 0] = ns.args;
  if (delay > 0) await ns.sleep(delay);
  await ns.weaken(target);
}