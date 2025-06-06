import cluster from "cluster";
import * as dotenv from "dotenv";
import { GameEnv } from "../core/configuration/Config";
import { getServerConfigFromServer } from "../core/configuration/ConfigLoader";
import { Cloudflare, TunnelConfig } from "./Cloudflare";
import { startMaster } from "./Master";
import { startWorker } from "./Worker";

const config = getServerConfigFromServer();

dotenv.config();

// Main entry point of the application
async function main() {
  // Check if this is the primary (master) process
  if (cluster.isPrimary) {
    if (config.env() !== GameEnv.Dev) {
      await setupTunnels();
    }
    console.log("Starting master process...");
    await startMaster();
  } else {
    // This is a worker process
    console.log("Starting worker process...");
    await startWorker();
  }
}

// Start the application
main().catch((error) => {
  console.error("Failed to start server:", error);
  process.exit(1);
});

async function setupTunnels() {
  const cloudflare = new Cloudflare(
    config.cloudflareAccountId(),
    config.cloudflareApiToken(),
    config.cloudflareConfigDir(),
  );

  const domainToService = new Map<string, string>().set(
    config.subdomain(),
    `http://localhost:3000`,
  );

  for (let i = 0; i < config.numWorkers(); i++) {
    domainToService.set(
      `w${i}-${config.subdomain()}`,
      `http://localhost:${3000 + i + 1}`,
    );
  }

  const tunnel = await cloudflare.createTunnel({
    subdomain: config.subdomain(),
    domain: config.domain(),
    subdomainToService: domainToService,
  } as TunnelConfig);

  await cloudflare.startCloudflared(tunnel.configPath);
}
