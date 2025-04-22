import { PathFindResultType } from "../pathfinding/AStar";
import { PathFinder } from "../pathfinding/PathFinding";
import { Game, Player, UnitType } from "./Game";
import { andFN, GameMap, manhattanDistFN, TileRef } from "./GameMap";

export function canBuildTransportShip(
  game: Game,
  player: Player,
  tile: TileRef,
): TileRef | false {
  if (
    player.units(UnitType.TransportShip).length >= game.config().boatMaxNumber()
  ) {
    return false;
  }

  const dst = targetTransportTile(game, tile);
  if (dst == null) {
    return false;
  }

  const other = game.owner(tile);
  if (other == player) {
    return false;
  }
  if (other.isPlayer() && player.isFriendly(other)) {
    return false;
  }

  if (game.isOceanShore(dst)) {
    let myPlayerBordersOcean = false;
    for (const bt of player.borderTiles()) {
      if (game.isOceanShore(bt)) {
        myPlayerBordersOcean = true;
        break;
      }
    }

    let otherPlayerBordersOcean = false;
    if (!game.hasOwner(tile)) {
      otherPlayerBordersOcean = true;
    } else {
      for (const bt of (other as Player).borderTiles()) {
        if (game.isOceanShore(bt)) {
          otherPlayerBordersOcean = true;
          break;
        }
      }
    }

    if (myPlayerBordersOcean && otherPlayerBordersOcean) {
      return transportShipSpawn(game, player, dst);
    } else {
      return false;
    }
  }

  // Now we are boating in a lake, so do a bfs from target until we find
  // a border tile owned by the player

  const tiles = game.bfs(
    dst,
    andFN(
      manhattanDistFN(dst, 300),
      (_, t: TileRef) => game.isLake(t) || game.isShore(t),
    ),
  );

  const sorted = Array.from(tiles).sort(
    (a, b) => game.manhattanDist(dst, a) - game.manhattanDist(dst, b),
  );

  for (const t of sorted) {
    if (game.owner(t) == player) {
      return transportShipSpawn(game, player, t);
    }
  }
  return false;
}

function transportShipSpawn(
  game: Game,
  player: Player,
  targetTile: TileRef,
): TileRef | false {
  if (!game.isShore(targetTile)) {
    return false;
  }
  const spawn = closestShoreFromPlayer(game, player, targetTile);
  if (spawn == null) {
    return false;
  }
  return spawn;
}

export function sourceDstOceanShore(
  gm: Game,
  src: Player,
  tile: TileRef,
): [TileRef | null, TileRef | null] {
  const dst = gm.owner(tile);
  const srcTile = closestShoreFromPlayer(gm, src, tile);
  let dstTile: TileRef | null = null;
  if (dst.isPlayer()) {
    dstTile = closestShoreFromPlayer(gm, dst as Player, tile);
  } else {
    dstTile = closestShoreTN(gm, tile, 50);
  }
  return [srcTile, dstTile];
}

export function targetTransportTile(gm: Game, tile: TileRef): TileRef | null {
  const dst = gm.playerBySmallID(gm.ownerID(tile));
  let dstTile: TileRef | null = null;
  if (dst.isPlayer()) {
    dstTile = closestShoreFromPlayer(gm, dst as Player, tile);
  } else {
    dstTile = closestShoreTN(gm, tile, 50);
  }
  return dstTile;
}

export function closestShoreFromPlayer(
  gm: GameMap,
  player: Player,
  target: TileRef,
): TileRef | null {
  const shoreTiles = Array.from(player.borderTiles()).filter((t) =>
    gm.isShore(t),
  );
  if (shoreTiles.length == 0) {
    return null;
  }

  return shoreTiles.reduce((closest, current) => {
    const closestDistance = gm.manhattanDist(target, closest);
    const currentDistance = gm.manhattanDist(target, current);
    return currentDistance < closestDistance ? current : closest;
  });
}

/**
 * Finds the best shore tile for deployment among the player's shore tiles for the shortest route.
 * Calculates paths from 4 extremum tiles and the Manhattan-closest tile.
 */
export function bestShoreDeploymentSource(
  gm: Game,
  player: Player,
  target: TileRef,
): TileRef | null {
  target = targetTransportTile(gm, target);
  if (target == null) {
    return null;
  }
  let closestManhattanDistance = Infinity;
  let minX = Infinity,
    minY = Infinity,
    maxX = -Infinity,
    maxY = -Infinity;

  let bestByManhattan: TileRef = null;
  const extremumTiles: Record<string, TileRef> = {
    minX: null,
    minY: null,
    maxX: null,
    maxY: null,
  };

  for (const tile of player.borderTiles()) {
    if (!gm.isShore(tile)) continue;

    const distance = gm.manhattanDist(tile, target);
    const cell = gm.cell(tile);

    // Manhattan-closest tile
    if (distance < closestManhattanDistance) {
      closestManhattanDistance = distance;
      bestByManhattan = tile;
    }

    // Extremum tiles
    if (cell.x < minX) {
      minX = cell.x;
      extremumTiles.minX = tile;
    } else if (cell.y < minY) {
      minY = cell.y;
      extremumTiles.minY = tile;
    } else if (cell.x > maxX) {
      maxX = cell.x;
      extremumTiles.maxX = tile;
    } else if (cell.y > maxY) {
      maxY = cell.y;
      extremumTiles.maxY = tile;
    }
  }

  const candidates = [
    bestByManhattan,
    extremumTiles.minX,
    extremumTiles.minY,
    extremumTiles.maxX,
    extremumTiles.maxY,
  ].filter(Boolean);

  if (!candidates.length) {
    return null;
  }

  // Find the shortest actual path distance
  let closestShoreTile: TileRef | null = null;
  let closestDistance = Infinity;

  for (const shoreTile of candidates) {
    const pathDistance = calculatePathDistance(gm, shoreTile, target);

    if (pathDistance !== null && pathDistance < closestDistance) {
      closestDistance = pathDistance;
      closestShoreTile = shoreTile;
    }
  }

  // Fall back to the Manhattan-closest tile if no path was found
  return closestShoreTile || bestByManhattan;
}

/**
 * Calculates the distance between two tiles using A*
 * Returns null if no path is found
 */
function calculatePathDistance(
  gm: Game,
  start: TileRef,
  target: TileRef,
): number | null {
  let currentTile = start;
  let tileDistance = 0;
  const pathFinder = PathFinder.Mini(gm, 20_000, false);

  while (true) {
    const result = pathFinder.nextTile(currentTile, target);

    if (result.type === PathFindResultType.Completed) {
      return tileDistance;
    } else if (result.type === PathFindResultType.NextTile) {
      currentTile = result.tile;
      tileDistance++;
    } else if (
      result.type === PathFindResultType.PathNotFound ||
      result.type === PathFindResultType.Pending
    ) {
      return null;
    } else {
      // @ts-expect-error type is never
      throw new Error(`Unexpected pathfinding result type: ${result.type}`);
    }
  }
}

function closestShoreTN(
  gm: GameMap,
  tile: TileRef,
  searchDist: number,
): TileRef {
  const tn = Array.from(
    gm.bfs(
      tile,
      andFN((_, t) => !gm.hasOwner(t), manhattanDistFN(tile, searchDist)),
    ),
  )
    .filter((t) => gm.isShore(t))
    .sort((a, b) => gm.manhattanDist(tile, a) - gm.manhattanDist(tile, b));
  if (tn.length == 0) {
    return null;
  }
  return tn[0];
}
