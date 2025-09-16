/** @param {NS} ns */
export class HacknetManager {
  constructor(ns, maxSpendFraction = 0.1) {
    this.ns = ns;
    this.maxSpendFraction = maxSpendFraction;
  }

  async evaluateAndPurchase() {
    const ns = this.ns;
    const moneyAvailable = ns.getServerMoneyAvailable("home");

    const nodeStats = [];
    const numNodes = ns.hacknet.numNodes();
    for (let i = 0; i < numNodes; i++) {
      const stats = ns.hacknet.getNodeStats(i);
      stats.nodeIndex = i;
      nodeStats.push(stats);
    }

    let bestUpgrade = null;

    for (const node of nodeStats) {
      const upgrades = [
        {type: 'level', cost: node.levelUpgradeCost, gain: node.levelIncrease},
        {type: 'ram', cost: node.ramUpgradeCost, gain: node.ramIncrease},
        {type: 'core', cost: node.coreUpgradeCost, gain: node.coreIncrease}
      ];

      for (const upgrade of upgrades) {
        if (upgrade.cost > 0 && upgrade.gain > 0) {
          const roi = upgrade.gain / upgrade.cost;
          if (!bestUpgrade || roi > bestUpgrade.roi) {
            bestUpgrade = {nodeIndex: node.nodeIndex, upgradeType: upgrade.type, cost: upgrade.cost, roi};
          }
        }
      }
    }

    const newNodeCost = ns.hacknet.getPurchaseNodeCost();
    if (numNodes < ns.hacknet.getMaxNumNodes() && newNodeCost > 0) {
      const baseNewNodeGain = 1;
      const newNodeROI = baseNewNodeGain / newNodeCost;
      if (!bestUpgrade || newNodeROI > bestUpgrade.roi) {
        bestUpgrade = {nodeIndex: null, upgradeType: 'newNode', cost: newNodeCost, roi: newNodeROI};
      }
    }

    if (bestUpgrade && bestUpgrade.cost < moneyAvailable * this.maxSpendFraction) {
      if (bestUpgrade.upgradeType === 'newNode') {
        ns.hacknet.purchaseNode();
        ns.print(`Purchased new Hacknet node at cost ${bestUpgrade.cost.toFixed(2)}`);
      } else {
        ns.hacknet.upgradeLevel(bestUpgrade.nodeIndex, 1);
        ns.print(`Upgraded Hacknet node ${bestUpgrade.nodeIndex} ${bestUpgrade.upgradeType} at cost ${bestUpgrade.cost.toFixed(2)}`);
      }
    }
  }
}
