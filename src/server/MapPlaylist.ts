import { getServerConfigFromServer } from "../core/configuration/ConfigLoader";
import {
  Duos,
  GameMapType,
  GameMapTypeSchema,
  GameMode,
  GameType,
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
  World: 3,
  Europe: 2,
  Africa: 2,
  Baikal: 2,
  Australia: 1,
  "North America": 1,
  Britannia: 1,
  "Gateway to the Atlantic": 1,
  Iceland: 1,
  "South America": 1,
  "Deglaciated Antarctica": 1,
  "Europe Classic": 1,
  Mena: 1,
  Pangaea: 1,
  Asia: 1,
  Mars: 1,
  "Mars Revised": 1,
  "Between Two Seas": 1,
  "East Asia": 1,
  "Black Sea": 1,
  "Faroe Islands": 1,
  "Falkland Islands": 1,
  Halkidiki: 1,
  "Strait of Gibraltar": 1,
  Italia: 1,
  Yenisei: 1,
  Pluto: 1,
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

    const playerTeams =
      mode === GameMode.Team ? this.getTeamCount() : undefined;

    // Create the default public game config (from your GameManager)
    return {
      gameMap: map,
      maxPlayers: config.lobbyMaxPlayers(map, mode, playerTeams),
      gameType: GameType.Public,
      difficulty: "Medium",
      infiniteGold: false,
      infiniteTroops: false,
      instantBuild: false,
      disableNPCs: mode === GameMode.Team,
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
      if (!this.addNextMap(this.mapsPlaylist, ffa1, GameMode.FFA)) {
        return false;
      }
      if (!this.addNextMap(this.mapsPlaylist, ffa2, GameMode.FFA)) {
        return false;
      }
      if (!this.addNextMap(this.mapsPlaylist, team, GameMode.Team)) {
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
