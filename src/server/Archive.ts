import { getServerConfigFromServer } from "../core/configuration/ConfigLoader";
import { GameID, GameRecord, GameRecordSchema, ID } from "../core/Schemas";
import { logger } from "./Logger";

const config = getServerConfigFromServer();

const log = logger.child({ component: "Archive" });

export async function archive(gameRecord: GameRecord) {
  try {
    gameRecord.gitCommit = config.gitCommit();
    const url = `${config.jwtIssuer()}/game/${gameRecord.info.gameID}`;
    const response = await fetch(url, {
      method: "POST",
      body: JSON.stringify(gameRecord),
      headers: {
        "Content-Type": "application/json",
        "x-api-key": config.apiKey(),
      },
    });
    if (!response.ok) {
      log.error(`error archiving game record: ${response.statusText}`, {
        gameID: gameRecord.info.gameID,
      });
      return;
    }
  } catch (error) {
    log.error(`error archiving game record: ${error}`, {
      gameID: gameRecord.info.gameID,
    });
    return;
  }
}

export async function readGameRecord(
  gameId: GameID,
): Promise<GameRecord | null> {
  try {
    if (!ID.safeParse(gameId).success) {
      log.error(`invalid game ID: ${gameId}`);
      return null;
    }
    const url = `${config.jwtIssuer()}/game/${gameId}`;
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });
    const record = await response.json();
    if (!response.ok) {
      log.error(`error reading game record: ${response.statusText}`, {
        gameID: gameId,
      });
      return null;
    }
    return GameRecordSchema.parse(record);
  } catch (error) {
    log.error(`error reading game record: ${error}`, {
      gameID: gameId,
    });
    return null;
  }
}
