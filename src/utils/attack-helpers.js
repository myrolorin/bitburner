export const SCRIPT_RAM = {
  hack: 1.7,
  grow: 1.75,
  weaken: 1.75,
};

/**
 * Filter targets by action times and max money.
 * @param {NS} ns
 * @param {Array<string>} targets
 * @param {number} maxActionTime
 * @param {Object} serverMap
 * @returns {Array<string>}
 */
export function filterFastTargets(ns, targets, maxActionTime, serverMap) {
  return targets.filter(t => {
    const info = serverMap[t];
    return (
      info.weakenTime <= maxActionTime &&
      info.growTime <= maxActionTime &&
      info.hackTime <= maxActionTime &&
      info.maxMoney > 0
    );
  });
}

/**
 * Pick the best target (highest max money).
 * @param {Array<string>} targets
 * @param {Object} serverMap
 * @returns {string}
 */
export function pickBestTarget(targets, serverMap) {
  return targets
    .sort((a, b) => serverMap[b].maxMoney - serverMap[a].maxMoney)[0];
}

/**
 * Find the rooted server with the most free RAM.
 * @param {NS} ns
 * @param {Array<string>} rootedServers
 * @returns {string|null}
 */
export function findBestServer(ns, rootedServers) {
  const best = rootedServers
    .map(s => ({ name: s, free: ns.getServerMaxRam(s) - ns.getServerUsedRam(s) }))
    .sort((a, b) => b.free - a.free)[0];
  return best ? best.name : null;
}