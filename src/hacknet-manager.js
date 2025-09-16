/** @param {NS} ns */
export class HacknetManager {
  constructor(ns, maxSpendFraction = 0.1) {
    this.ns = ns;
    this.maxSpendFrac = maxSpendFraction;
  }

  async evaluateAndPurchase() {
    const ns = this.ns;
    const moneyAvailable = ns.getServerMoneyAvailable("home");

    let bestUpgrade = null;
    let bestROIDelta = 0;

    const numNodes = ns.hacknet.numNodes();
    const maxNodes = ns.hacknet.getMaxNumNodes();

    // Calculate ROI for upgrades on existing nodes
    for (let i = 0; i < numNodes; i++) {
      const stats = ns.hacknet.getNodeStats(i);
      const prodMultiplier = ns.getPlayer().hacknet_prod_mult || 1;

      const upgrades = [
        { type: 'level', cost: ns.hacknet.getLevelUpgradeCost(i, 1), gain: stats.production * 0.01 * prodMultiplier },
        { type: 'ram', cost: ns.hacknet.getRamUpgradeCost(i, 1), gain: stats.production * 0.60 * prodMultiplier },
        { type: 'core', cost: ns.hacknet.getCoreUpgradeCost(i, 1), gain: stats.production * 0.30 * prodMultiplier },
      ];

      for (const upgrade of upgrades) {
        if (upgrade.cost > 0 && upgrade.gain > 0) {
          const roi = upgrade.gain / upgrade.cost;
          if (roi > bestROIDelta && upgrade.cost < moneyAvailable * this.maxSpendFrac) {
            bestROIDelta = roi;
            bestUpgrade = { nodeIndex: i, upgradeType: upgrade.type, cost: upgrade.cost };
          }
        }
      }
    }

    // Calculate ROI for buying new nodes
    if (numNodes < maxNodes) {
      const nextNodeCost = ns.hacknet.getPurchaseNodeCost();
      if (nextNodeCost > 0 && nextNodeCost < moneyAvailable * this.maxSpendFrac) {
        const baseProduction = ns.hacknet.getNodeStats(numNodes)?.production || 1;
        const roi = baseProduction / nextNodeCost;
        if (roi > bestROIDelta) {
          bestROIDelta = roi;
          bestUpgrade = { nodeIndex: null, upgradeType: 'newNode', cost: nextNodeCost };
        }
      }
    }

    // Purchase the best upgrade or new node
    if (bestUpgrade) {
      if (bestUpgrade.upgradeType === 'newNode') {
        ns.hacknet.purchaseNode();
        ns.print(`Purchased new Hacknet node for ${bestUpgrade.cost.toFixed(2)}`);
      } else if (bestUpgrade.upgradeType === 'level') {
        ns.hacknet.upgradeLevel(bestUpgrade.nodeIndex, 1);
        ns.print(`Upgraded Hacknet node ${bestUpgrade.nodeIndex} level for ${bestUpgrade.cost.toFixed(2)}`);
      } else if (bestUpgrade.upgradeType === 'ram') {
        ns.hacknet.upgradeRam(bestUpgrade.nodeIndex, 1);
        ns.print(`Upgraded Hacknet node ${bestUpgrade.nodeIndex} RAM for ${bestUpgrade.cost.toFixed(2)}`);
      } else if (bestUpgrade.upgradeType === 'core') {
        ns.hacknet.upgradeCore(bestUpgrade.nodeIndex, 1);
        ns.print(`Upgraded Hacknet node ${bestUpgrade.nodeIndex} cores for ${bestUpgrade.cost.toFixed(2)}`);
      }
    }
  }
}