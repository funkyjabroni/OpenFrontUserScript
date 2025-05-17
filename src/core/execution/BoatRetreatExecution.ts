import { Execution, Game, Player, PlayerID } from "../game/Game";

export class BoatRetreatExecution implements Execution {
  private active = true;
  private retreatOrdered = false;
  private player: Player;
  private startTick: number;
  private mg: Game;
  constructor(
    private playerID: PlayerID,
    private targetID: number,
  ) {}

  init(mg: Game, ticks: number): void {
    if (!mg.hasPlayer(this.playerID)) {
      console.warn(
        `BoatRetreatExecution: Player ${this.player.id()} not found`,
      );
      return;
    }
    this.mg = mg;

    this.player = mg.player(this.playerID);
    this.startTick = mg.ticks();
  }

  tick(ticks: number): void {
    if (!this.retreatOrdered) {
      this.player.orderBoatRetreat(this.targetID);
      this.retreatOrdered = true;
      this.active = false;
    }
  }

  owner(): Player {
    return this.player;
  }

  isActive(): boolean {
    return this.active;
  }

  activeDuringSpawnPhase(): boolean {
    return false;
  }
}
