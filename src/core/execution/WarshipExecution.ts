import {
  Cell,
  Execution,
  Game,
  Player,
  Unit,
  PlayerID,
  TerrainType,
  UnitType,
} from "../game/Game";
import { PathFinder } from "../pathfinding/PathFinding";
import { PathFindResultType } from "../pathfinding/AStar";
import { PseudoRandom } from "../PseudoRandom";
import { distSort, distSortUnit } from "../Util";
import { consolex } from "../Consolex";
import { TileRef } from "../game/GameMap";
import { ShellExecution } from "./ShellExecution";

export class WarshipExecution implements Execution {
  private random: PseudoRandom;

  private _owner: Player;
  private active = true;
  private warship: Unit = null;
  private mg: Game = null;

  private target: Unit = null;
  private pathfinder: PathFinder;

  private patrolTile: TileRef;

  // TODO: put in config
  private searchRange = 100;

  private shellAttackRate = 5;
  private lastShellAttack = 0;

  private alreadySentShell = new Set<Unit>();

  constructor(
    private playerID: PlayerID,
    private patrolCenterTile: TileRef,
  ) {}

  init(mg: Game, ticks: number): void {
    if (!mg.hasPlayer(this.playerID)) {
      console.log(`WarshipExecution: player ${this.playerID} not found`);
      this.active = false;
      return;
    }
    this.pathfinder = PathFinder.Mini(mg, 5000, false);
    this._owner = mg.player(this.playerID);
    this.mg = mg;
    this.patrolTile = this.patrolCenterTile;
    this.random = new PseudoRandom(mg.ticks());
  }

  // Only for warships with "moveTarget" set
  goToMoveTarget(target: TileRef): boolean {
    // Patrol unless we are hunting down a tradeship
    const result = this.pathfinder.nextTile(this.warship.tile(), target);
    switch (result.type) {
      case PathFindResultType.Completed:
        this.warship.setMoveTarget(null);
        return;
      case PathFindResultType.NextTile:
        this.warship.move(result.tile);
        break;
      case PathFindResultType.Pending:
        break;
      case PathFindResultType.PathNotFound:
        consolex.log(`path not found to target`);
        break;
    }
  }

  private shoot() {
    if (this.mg.ticks() - this.lastShellAttack > this.shellAttackRate) {
      this.lastShellAttack = this.mg.ticks();
      this.mg.addExecution(
        new ShellExecution(
          this.warship.tile(),
          this.warship.owner(),
          this.warship,
          this.target,
        ),
      );
      if (!this.target.hasHealth()) {
        // Don't send multiple shells to target that can be oneshotted
        this.alreadySentShell.add(this.target);
        this.target = null;
        return;
      }
    }
  }

  private patrol() {
    this.warship.setWarshipTarget(this.target);
    if (this.target == null || this.target.type() != UnitType.TradeShip) {
      // Patrol unless we are hunting down a tradeship
      const result = this.pathfinder.nextTile(
        this.warship.tile(),
        this.patrolTile,
      );
      switch (result.type) {
        case PathFindResultType.Completed:
          this.patrolTile = this.randomTile();
          break;
        case PathFindResultType.NextTile:
          this.warship.move(result.tile);
          break;
        case PathFindResultType.Pending:
          return;
        case PathFindResultType.PathNotFound:
          consolex.log(`path not found to patrol tile`);
          this.patrolTile = this.randomTile();
          break;
      }
    }
  }

  tick(ticks: number): void {
    if (this.warship == null) {
      const spawn = this._owner.canBuild(UnitType.Warship, this.patrolTile);
      if (spawn == false) {
        this.active = false;
        return;
      }
      this.warship = this._owner.buildUnit(UnitType.Warship, 0, spawn);
      return;
    }
    if (!this.warship.isActive()) {
      this.active = false;
      return;
    }
    if (this.target != null && !this.target.isActive()) {
      this.target = null;
    }
    const ships = this.mg
      .units(UnitType.TransportShip, UnitType.Warship, UnitType.TradeShip)
      .filter((u) => this.mg.manhattanDist(u.tile(), this.warship.tile()) < 130)
      .filter((u) => u.owner() != this.warship.owner())
      .filter((u) => u != this.warship)
      .filter((u) => !u.owner().isAlliedWith(this.warship.owner()))
      .filter((u) => !this.alreadySentShell.has(u))
      .filter((u) => {
        const portOwner = u.dstPort() ? u.dstPort().owner() : null;
        return u.type() != UnitType.TradeShip || portOwner != this.owner();
      });

    this.target =
      ships.sort((a, b) => {
        // First compare by Warship type
        if (a.type() === UnitType.Warship && b.type() !== UnitType.Warship) {
          return -1;
        }
        if (a.type() !== UnitType.Warship && b.type() === UnitType.Warship) {
          return 1;
        }
        // Then favor transport ship
        if (
          a.type() === UnitType.TransportShip &&
          b.type() !== UnitType.TransportShip
        ) {
          return -1;
        }
        if (
          a.type() !== UnitType.TransportShip &&
          b.type() === UnitType.TransportShip
        ) {
          return 1;
        }
        // If both are same type, sort by distance
        return distSortUnit(this.mg, this.warship)(a, b);
      })[0] ?? null;

    if (this.warship.moveTarget()) {
      this.goToMoveTarget(this.warship.moveTarget());
      // If we have a "move target" then we cannot target trade ships as it
      // requires moving.
      if (this.target && this.target.type() == UnitType.TradeShip) {
        this.target = null;
      }
    } else if (!this.target || this.target.type() != UnitType.TradeShip) {
      this.patrol();
    }

    if (
      this.target == null ||
      !this.target.isActive() ||
      this.target.owner() == this._owner
    ) {
      // In case another destroyer captured or destroyed target
      this.target = null;
      return;
    }

    this.warship.setWarshipTarget(this.target);

    // If we have a move target we do not want to go after trading ships
    if (!this.target) {
      return;
    }

    if (this.target.type() != UnitType.TradeShip) {
      this.shoot();
      return;
    }

    for (let i = 0; i < 2; i++) {
      // target is trade ship so capture it.
      const result = this.pathfinder.nextTile(
        this.warship.tile(),
        this.target.tile(),
        5,
      );
      switch (result.type) {
        case PathFindResultType.Completed:
          this.owner().captureUnit(this.target);
          this.target = null;
          return;
        case PathFindResultType.NextTile:
          this.warship.move(result.tile);
          break;
        case PathFindResultType.Pending:
          break;
        case PathFindResultType.PathNotFound:
          consolex.log(`path not found to target`);
          break;
      }
    }
  }

  owner(): Player {
    return this._owner;
  }

  isActive(): boolean {
    return this.active;
  }

  activeDuringSpawnPhase(): boolean {
    return false;
  }

  randomTile(): TileRef {
    while (true) {
      const x =
        this.mg.x(this.patrolCenterTile) +
        this.random.nextInt(-this.searchRange / 2, this.searchRange / 2);
      const y =
        this.mg.y(this.patrolCenterTile) +
        this.random.nextInt(-this.searchRange / 2, this.searchRange / 2);
      if (!this.mg.isValidCoord(x, y)) {
        continue;
      }
      const tile = this.mg.ref(x, y);
      if (!this.mg.isOcean(tile)) {
        continue;
      }
      return tile;
    }
  }
}
