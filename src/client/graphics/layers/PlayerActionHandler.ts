import { PlayerActions, PlayerID } from "../../../core/game/Game";
import {
  SendAllianceRequestIntentEvent,
  SendAttackIntentEvent,
  SendBoatAttackIntentEvent,
  SendBreakAllianceIntentEvent,
  SendDeleteUnitIntentEvent,
  SendDonateGoldIntentEvent,
  SendDonateTroopsIntentEvent,
  SendEmbargoIntentEvent,
  SendEmojiIntentEvent,
  SendQuickChatEvent,
  SendSpawnIntentEvent,
  SendTargetPlayerIntentEvent,
  TurnDebtEvent,
} from "../../Transport";
import { EventBus } from "../../../core/EventBus";
import { PlayerView } from "../../../core/game/GameView";
import { TileRef } from "../../../core/game/GameMap";
import { UIState } from "../UIState";

export class PlayerActionHandler {
  private isInTurnDebt = false;

  constructor(
    private readonly eventBus: EventBus,
    private readonly uiState: UIState,
  ) {
    this.eventBus.on(TurnDebtEvent, (e) => {
      this.isInTurnDebt = e.isInTurnDebt;
    });
  }

  private actionsBlocked(): boolean {
    return this.isInTurnDebt;
  }

  async getPlayerActions(
    player: PlayerView,
    tile: TileRef,
  ): Promise<PlayerActions> {
    return await player.actions(tile);
  }

  handleAttack(player: PlayerView, targetId: string | null) {
    if (this.actionsBlocked()) return;
    this.eventBus.emit(
      new SendAttackIntentEvent(
        targetId,
        this.uiState.attackRatio * player.troops(),
      ),
    );
  }

  handleBoatAttack(
    player: PlayerView,
    targetId: PlayerID | null,
    targetTile: TileRef,
    spawnTile: TileRef | null,
  ) {
    if (this.actionsBlocked()) return;
    this.eventBus.emit(
      new SendBoatAttackIntentEvent(
        targetId,
        targetTile,
        this.uiState.attackRatio * player.troops(),
        spawnTile,
      ),
    );
  }

  async findBestTransportShipSpawn(
    player: PlayerView,
    tile: TileRef,
  ): Promise<TileRef | false> {
    return await player.bestTransportShipSpawn(tile);
  }

  handleSpawn(tile: TileRef) {
    if (this.actionsBlocked()) return;
    this.eventBus.emit(new SendSpawnIntentEvent(tile));
  }

  handleAllianceRequest(player: PlayerView, recipient: PlayerView) {
    if (this.actionsBlocked()) return;
    this.eventBus.emit(new SendAllianceRequestIntentEvent(player, recipient));
  }

  handleBreakAlliance(player: PlayerView, recipient: PlayerView) {
    if (this.actionsBlocked()) return;
    this.eventBus.emit(new SendBreakAllianceIntentEvent(player, recipient));
  }

  handleTargetPlayer(targetId: string | null) {
    if (!targetId || this.actionsBlocked()) return;
    this.eventBus.emit(new SendTargetPlayerIntentEvent(targetId));
  }

  handleDonateGold(recipient: PlayerView) {
    if (this.actionsBlocked()) return;
    this.eventBus.emit(new SendDonateGoldIntentEvent(recipient, null));
  }

  handleDonateTroops(recipient: PlayerView) {
    if (this.actionsBlocked()) return;
    this.eventBus.emit(new SendDonateTroopsIntentEvent(recipient, null));
  }

  handleEmbargo(recipient: PlayerView, action: "start" | "stop") {
    if (this.actionsBlocked()) return;
    this.eventBus.emit(new SendEmbargoIntentEvent(recipient, action));
  }

  handleEmoji(targetPlayer: PlayerView | "AllPlayers", emojiIndex: number) {
    this.eventBus.emit(new SendEmojiIntentEvent(targetPlayer, emojiIndex));
  }

  handleQuickChat(recipient: PlayerView, chatKey: string, target?: PlayerID) {
    this.eventBus.emit(new SendQuickChatEvent(recipient, chatKey, target));
  }

  handleDeleteUnit(unitId: number) {
    if (this.actionsBlocked()) return;
    this.eventBus.emit(new SendDeleteUnitIntentEvent(unitId));
  }
}
