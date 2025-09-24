import { Server } from "/v3/src/lib/server.js"

/** @param {NS} ns */
export function getHosts(servers) {
  return servers.filter(s => s.canHost())
}

export function getTargets(servers) {
  return servers.filter(s => s.rooted())
}

export function chooseBestTarget(servers) {
  if (!servers || servers.length === 0) return null

  let bestServer = servers[0]
  let bestScore = bestServer.targetScore()

  for (let server of servers) {
    const currentScore = server.targetScore()
    if (currentScore > bestScore) {
      bestScore = currentScore
      bestServer = server
    }
  }

  return bestServer
}

export function mapNetwork(ns) {
  const serverMap = new Map()
  const toScan = ['home']
  const scanned = new Set()

  while (toScan.length > 0) {
    const current = toScan.pop()
    if (scanned.has(current)) continue
    scanned.add(current)

    const server = new Server(ns, current)
    serverMap.set(current, server)

    let neighbors = ns.scan(server.hostname)
    for (const neighbor of neighbors) {
      if (!scanned.has(neighbor)) {
        toScan.push(neighbor)
      }
    }
  }

  return Array.from(serverMap.values())
}