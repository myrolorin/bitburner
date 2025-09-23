export const PORT_BUSTERS = {
  "BruteSSH.exe":  () => ns.brutessh(hostname),
  "FTPCrack.exe":  () => ns.ftpcrack(hostname),
  "relaySMTP.exe": () => ns.relaysmtp(hostname),
  "HTTPWorm.exe":  () => ns.httpworm(hostname),
  "SQLInject.exe": () => ns.sqlinject(hostname)
};