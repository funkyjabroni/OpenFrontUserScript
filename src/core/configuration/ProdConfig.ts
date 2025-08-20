import { GameEnv } from "./Config";
import { DefaultServerConfig } from "./DefaultConfig";

export const prodConfig = new (class extends DefaultServerConfig {
  numWorkers(): number {
    return 20;
  }
  env(): GameEnv {
    return "Prod";
  }
  jwtAudience(): string {
    return "openfront.io";
  }
})();
