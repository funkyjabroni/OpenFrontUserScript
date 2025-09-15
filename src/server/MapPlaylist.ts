import { getServerConfigFromServer } from "../core/configuration/ConfigLoader";
import {
  Duos,
  GameMapType,
  GameMapTypeSchema,
  GameMode,
  Quads,
  Trios,
} from "../core/game/Game";
import { PseudoRandom } from "../core/PseudoRandom";
import { GameConfig, TeamCountConfig } from "../core/Schemas";
import { logger } from "./Logger";

const log = logger.child({});

const config = getServerConfigFromServer();

// How many times each map should appear in the playlist.
// Note: The Partial should eventually be removed for better type safety.
const frequency: Partial<Record<GameMapType, number>> = {
  world: 3,
  europe: 2,
  africa: 2,
  baikal: 2,
  australia: 1,
  northamerica: 1,
  britannia: 1,
  gatewaytotheatlantic: 1,
  iceland: 1,
  southamerica: 1,
  deglaciatedantarctica: 1,
  europeclassic: 1,
  mena: 1,
  pangaea: 1,
  asia: 1,
  mars: 1,
  marsrevised: 1,
  betweentwoseas: 1,
  eastasia: 1,
  blacksea: 1,
  faroeislands: 1,
  falklandislands: 1,
  halkidiki: 1,
  straitofgibraltar: 1,
  italia: 1,
  yenisei: 1,
  pluto: 1,
};

interface MapWithMode {
  map: GameMapType;
  mode: GameMode;
}

const TEAM_COUNTS = [
  2,
  3,
  4,
  5,
  6,
  7,
  Duos,
  Trios,
  Quads,
] as const satisfies TeamCountConfig[];

export class MapPlaylist {
  private mapsPlaylist: MapWithMode[] = [];

  public gameConfig(): GameConfig {
    const { map, mode } = this.getNextMap();

    const playerTeams = mode === "Team" ? this.getTeamCount() : undefined;

    // Create the default public game config (from your GameManager)
    return {
      gameMap: map,
      maxPlayers: config.lobbyMaxPlayers(map, mode, playerTeams),
      gameType: "Public",
      difficulty: "Medium",
      infiniteGold: false,
      infiniteTroops: false,
      instantBuild: false,
      disableNPCs: mode === "Team",
      gameMode: mode,
      playerTeams,
      bots: 400,
      disabledUnits: ["Train", "Factory"],
    } satisfies GameConfig;
  }

  private getTeamCount(): TeamCountConfig {
    return TEAM_COUNTS[Math.floor(Math.random() * TEAM_COUNTS.length)];
  }

  private getNextMap(): MapWithMode {
    if (this.mapsPlaylist.length === 0) {
      const numAttempts = 10000;
      for (let i = 0; i < numAttempts; i++) {
        if (this.shuffleMapsPlaylist()) {
          log.info(`Generated map playlist in ${i} attempts`);
          return this.mapsPlaylist.shift()!;
        }
      }
      log.error("Failed to generate a valid map playlist");
    }
    // Even if it failed, playlist will be partially populated.
    return this.mapsPlaylist.shift()!;
  }

  private shuffleMapsPlaylist(): boolean {
    const maps: GameMapType[] = [];
    GameMapTypeSchema.options.forEach((option) => {
      for (let i = 0; i < (frequency[option] ?? 0); i++) {
        maps.push(option as GameMapType);
      }
    });

    const rand = new PseudoRandom(Date.now());

    const ffa1: GameMapType[] = rand.shuffleArray([...maps]);
    const ffa2: GameMapType[] = rand.shuffleArray([...maps]);
    const team: GameMapType[] = rand.shuffleArray([...maps]);

    this.mapsPlaylist = [];
    for (let i = 0; i < maps.length; i++) {
      if (!this.addNextMap(this.mapsPlaylist, ffa1, "Free For All")) {
        return false;
      }
      if (!this.addNextMap(this.mapsPlaylist, ffa2, "Free For All")) {
        return false;
      }
      if (!this.addNextMap(this.mapsPlaylist, team, "Team")) {
        return false;
      }
    }
    return true;
  }

  private addNextMap(
    playlist: MapWithMode[],
    nextEls: GameMapType[],
    mode: GameMode,
  ): boolean {
    const nonConsecutiveNum = 5;
    const lastEls = playlist
      .slice(playlist.length - nonConsecutiveNum)
      .map((m) => m.map);
    for (let i = 0; i < nextEls.length; i++) {
      const next = nextEls[i];
      if (lastEls.includes(next)) {
        continue;
      }
      nextEls.splice(i, 1);
      playlist.push({ map: next, mode: mode });
      return true;
    }
    return false;
  }
}
