import { HacknetNode } from "/v2/src/classes/hacknet-node.js";

export class HacknetManager {
  constructor(ns) {
    this.ns = ns;
    this.nodes = [];
    this.refreshNodes();
  }

  refreshNodes() {
    this.nodes = [];
    const count = this.numNodes();
    for (let i = 0; i < count; i++) {
      this.nodes.push(new HacknetNode(this.ns, i));
    }
  }

  maxNumNodes() {
    return this.ns.hacknet.maxNumNodes();
  }

  numNodes() {
    return this.ns.hacknet.numNodes();
  }

  purchaseCost() {
    return this.ns.hacknet.getPurchaseNodeCost();
  }

  purchaseNode() {
    const index = this.ns.hacknet.purchaseNode();
    if (index !== -1) {
      const newNode = new HacknetNode(this.ns, index);
      this.nodes.push(newNode);
      return newNode;
    }
    return null;
  }

  calculatePurchaseROI() {
    const baseProduction = 4.097; // Base production of new node at level=1, ram=1, cores=1
    const cost = this._purchaseCost();
    if (cost === 0) return Infinity;
    return cost / baseProduction;
  }

  async evaluateAndPurchase(budget) {
    this.refreshNodes();

    // Gather all possible upgrade actions (with cost and ROI)
    let upgradeOptions = [];

    // Gather upgrade actions for each node and upgrade type
    for (const node of this.nodes) {
      // Only consider valid upgrades (your HacknetNode ROI getters return Infinity if at max)
      const upgrades = [
        { type: 'level', roi: node.levelROI, cost: node.upgradeCosts.level },
        { type: 'ram', roi: node.ramROI, cost: node.upgradeCosts.ram },
        { type: 'core', roi: node.coreROI, cost: node.upgradeCosts.core }
      ];
      for (const upg of upgrades) {
        if (upg.roi !== Infinity && upg.cost <= budget) {
          upgradeOptions.push({ node, ...upg });
        }
      }
    }

    // Consider purchase of a new node if possible
    if (this.numNodes() < this.maxNumNodes()) {
      const purchaseCost = this.purchaseCost();
      if (purchaseCost !== 0 && purchaseCost <= budget) {
        const purchaseROI = this.calculatePurchaseROI();
        upgradeOptions.push({ node: null, type: 'newNode', roi: purchaseROI, cost: purchaseCost });
      }
    }

    // Sort upgrade options by ROI ascending (smaller ROI seconds = better)
    upgradeOptions.sort((a, b) => a.roi - b.roi);

    let spent = 0;

    // Perform each upgrade/purchase while budget allows
    for (const option of upgradeOptions) {
      if (spent + option.cost > budget) {
        // Skip if no budget left
        continue;
      }

      if (option.type === 'newNode') {
        const newNode = this.purchaseNode();
        if (newNode) {
          this.ns.print(`Purchased new hacknet node for $${option.cost.toFixed(2)}`);
          spent += option.cost;
        }
      } else {
        // Upgrade node by type
        switch (option.type) {
          case 'level':
            option.node.upgradeLevel();
            this.ns.print(`Upgraded node ${option.node.index} level for $${option.cost.toFixed(2)}`);
            spent += option.cost;
            break;
          case 'ram':
            option.node.upgradeRam();
            this.ns.print(`Upgraded node ${option.node.index} RAM for $${option.cost.toFixed(2)}`);
            spent += option.cost;
            break;
          case 'core':
            option.node.upgradeCore();
            this.ns.print(`Upgraded node ${option.node.index} cores for $${option.cost.toFixed(2)}`);
            spent += option.cost;
            break;
        }
      }

      // Refresh node list and upgrade costs after each purchase/upgrade
      this.refreshNodes();

      // If budget exhausted, break early
      if (spent >= budget) break;
    }

    return spent;
  }
}
