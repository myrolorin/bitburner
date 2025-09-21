import { Logger } from "/src/utils/logger.js";

/** @param {NS} ns **/
export class ConfigManager {
  constructor(ns) {
    this.ns = ns;
    this.configFile = "/bin/config.txt";
    this.logger = new Logger(ns, "[ConfigManager] ");

    // Default config values
    this.config = {
      "drain-servers": false,
      "pause-purchases": false,
      "hacknet-budget": 0.1,
      "server-budget": 0.2,
    };

    this.loadConfig();
  }

  loadConfig() {
    const ns = this.ns;
    try {
      const configText = ns.read(this.configFile);
      if (configText) {
        const parsedConfig = JSON.parse(configText);
        this.config = {
          ...this.config,
          ...parsedConfig,
        };
        this.logger.info("Configuration loaded: " + JSON.stringify(this.config));
      } else {
        this.logger.warn("Config file is empty, using defaults.");
      }
    } catch (e) {
      this.logger.error("Error loading config file, using defaults. Error: " + e.message);
    }
  }

  writeConfig() {
    const ns = this.ns;
    try {
      const configText = JSON.stringify(this.config, null, 2);
      ns.write(this.configFile, configText, "w");
      this.logger.info("Configuration saved: " + configText);
    } catch (e) {
      this.logger.error("Error writing config file: " + e.message);
    }
  }

  // Helper method to update one key
  updateKey(key, value) {
    this.config[key] = value;
    this.writeConfig();
  }
}
