import { z } from "zod";
import { Config } from "../configuration/Config";
import { AllPlayersStats, ClientID } from "../Schemas";
import { GameMap, TileRef } from "./GameMap";
import {
  GameUpdate,
  GameUpdateType,
  PlayerUpdate,
  UnitUpdate,
} from "./GameUpdates";
import { RailNetwork } from "./RailNetwork";
import { Stats } from "./Stats";
import { UnitPredicate } from "./UnitGrid";

export type PlayerID = string;
export type Tick = number;
export type Gold = bigint;

export const AllPlayers = "AllPlayers" as const;

// export type GameUpdates = Record<GameUpdateType, GameUpdate[]>;
// Create a type that maps GameUpdateType to its corresponding update type
type UpdateTypeMap<T extends GameUpdateType> = Extract<GameUpdate, { type: T }>;

// Then use it to create the record type
export type GameUpdates = {
  [K in GameUpdateType]: UpdateTypeMap<K>[];
};

export interface MapPos {
  x: number;
  y: number;
}

export const DifficultySchema = z.enum([
  "Easy",
  "Medium",
  "Hard",
  "Impossible",
]);
export type Difficulty = z.infer<typeof DifficultySchema>;

export type Team = string;

export const Duos = "Duos" as const;
export const Trios = "Trios" as const;
export const Quads = "Quads" as const;

export const ColoredTeams: Record<string, Team> = {
  Red: "Red",
  Blue: "Blue",
  Teal: "Teal",
  Purple: "Purple",
  Yellow: "Yellow",
  Orange: "Orange",
  Green: "Green",
  Bot: "Bot",
} as const;

export const GameMapTypeSchema = z.enum([
  "World",
  "Giant World Map",
  "Europe",
  "Europe Classic",
  "Mena",
  "North America",
  "South America",
  "Oceania",
  "Black Sea",
  "Africa",
  "Pangaea",
  "Asia",
  "Mars",
  "Mars Revised",
  "Britannia",
  "Gateway to the Atlantic",
  "Australia",
  "Iceland",
  "East Asia",
  "Between Two Seas",
  "Faroe Islands",
  "Deglaciated Antarctica",
  "Falkland Islands",
  "Baikal",
  "Halkidiki",
  "Strait of Gibraltar",
  "Italia",
  "Yenisei",
  "Pluto",
]);
export type GameMapType = z.infer<typeof GameMapTypeSchema>;

export const mapCategories: Record<string, GameMapType[]> = {
  continental: [
    "World",
    "Giant World Map",
    "North America",
    "South America",
    "Europe",
    "Europe Classic",
    "Asia",
    "Africa",
    "Oceania",
  ],
  regional: [
    "Black Sea",
    "Britannia",
    "Gateway to the Atlantic",
    "Between Two Seas",
    "Iceland",
    "East Asia",
    "Mena",
    "Australia",
    "Faroe Islands",
    "Falkland Islands",
    "Baikal",
    "Halkidiki",
    "Strait of Gibraltar",
    "Italia",
    "Yenisei",
  ],
  fantasy: [
    "Pangaea",
    "Pluto",
    "Mars Revised",
    "Mars",
    "Deglaciated Antarctica",
  ],
};

export enum GameType {
  Singleplayer = "Singleplayer",
  Public = "Public",
  Private = "Private",
}

export const GameModeSchema = z.enum(["Free For All", "Team"]);
export type GameMode = z.infer<typeof GameModeSchema>;

export interface UnitInfo {
  cost: (player: Player) => Gold;
  // Determines if its owner changes when its tile is conquered.
  territoryBound: boolean;
  maxHealth?: number;
  damage?: number;
  constructionDuration?: number;
  upgradable?: boolean;
  canBuildTrainStation?: boolean;
  experimental?: boolean;
}

export const UnitTypeSchema = z.enum([
  "Transport Ship",
  "Warship",
  "Shell",
  "SAM Missile",
  "Port",
  "Atom Bomb",
  "Hydrogen Bomb",
  "Trade Ship",
  "Missile Silo",
  "Defense Post",
  "SAM Launcher",
  "City",
  "MIRV",
  "MIRV Warhead",
  "Construction",
  "Train",
  "Factory",
]);
export type UnitType = z.infer<typeof UnitTypeSchema>;

export enum TrainType {
  Engine = "Engine",
  Carriage = "Carriage",
}

const _structureTypes: ReadonlySet<UnitType> = new Set([
  "City",
  "Construction",
  "Defense Post",
  "SAM Launcher",
  "Missile Silo",
  "Port",
]);

export function isStructureType(type: UnitType): boolean {
  return _structureTypes.has(type);
}

export interface OwnerComp {
  owner: Player;
}

export type TrajectoryTile = {
  tile: TileRef;
  targetable: boolean;
};
export interface UnitParamsMap {
  ["Transport Ship"]: {
    troops?: number;
    destination?: TileRef;
  };

  ["Warship"]: {
    patrolTile: TileRef;
  };

  ["Shell"]: Record<string, never>;

  ["SAM Missile"]: Record<string, never>;

  ["Port"]: Record<string, never>;

  ["Atom Bomb"]: {
    targetTile?: number;
    trajectory: TrajectoryTile[];
  };

  ["Hydrogen Bomb"]: {
    targetTile?: number;
    trajectory: TrajectoryTile[];
  };

  ["Trade Ship"]: {
    targetUnit: Unit;
    lastSetSafeFromPirates?: number;
  };

  ["Train"]: {
    trainType: TrainType;
    targetUnit?: Unit;
    loaded?: boolean;
  };

  ["Factory"]: Record<string, never>;

  ["Missile Silo"]: Record<string, never>;

  ["Defense Post"]: Record<string, never>;

  ["SAM Launcher"]: Record<string, never>;

  ["City"]: Record<string, never>;

  ["MIRV"]: Record<string, never>;

  ["MIRV Warhead"]: {
    targetTile?: number;
  };

  ["Construction"]: Record<string, never>;
}

// Type helper to get params type for a specific unit type
export type UnitParams<T extends UnitType> = UnitParamsMap[T];

export type AllUnitParams = UnitParamsMap[keyof UnitParamsMap];

export const nukeTypes = [
  "Atom Bomb",
  "Hydrogen Bomb",
  "MIRV Warhead",
  "MIRV",
] as UnitType[];

export enum Relation {
  Hostile = 0,
  Distrustful = 1,
  Neutral = 2,
  Friendly = 3,
}

export class Nation {
  constructor(
    public readonly spawnCell: Cell,
    public readonly strength: number,
    public readonly playerInfo: PlayerInfo,
  ) {}
}

export class Cell {
  public index: number;

  private strRepr: string;

  constructor(
    public readonly x: number,
    public readonly y: number,
  ) {
    this.strRepr = `Cell[${this.x},${this.y}]`;
  }

  pos(): MapPos {
    return {
      x: this.x,
      y: this.y,
    };
  }

  toString(): string {
    return this.strRepr;
  }
}

export enum TerrainType {
  Plains,
  Highland,
  Mountain,
  Lake,
  Ocean,
}

export enum PlayerType {
  Bot = "BOT",
  Human = "HUMAN",
  FakeHuman = "FAKEHUMAN",
}

export interface Execution {
  isActive(): boolean;
  activeDuringSpawnPhase(): boolean;
  init(mg: Game, ticks: number): void;
  tick(ticks: number): void;
}

export interface Attack {
  id(): string;
  retreating(): boolean;
  retreated(): boolean;
  orderRetreat(): void;
  executeRetreat(): void;
  target(): Player | TerraNullius;
  attacker(): Player;
  troops(): number;
  setTroops(troops: number): void;
  isActive(): boolean;
  delete(): void;
  // The tile the attack originated from, mostly used for boat attacks.
  sourceTile(): TileRef | null;
  addBorderTile(tile: TileRef): void;
  removeBorderTile(tile: TileRef): void;
  clearBorder(): void;
  borderSize(): number;
  averagePosition(): Cell | null;
}

export interface AllianceRequest {
  accept(): void;
  reject(): void;
  requestor(): Player;
  recipient(): Player;
  createdAt(): Tick;
}

export interface Alliance {
  requestor(): Player;
  recipient(): Player;
  createdAt(): Tick;
  expiresAt(): Tick;
  other(player: Player): Player;
}

export interface MutableAlliance extends Alliance {
  expire(): void;
  other(player: Player): Player;
  canExtend(): boolean;
  addExtensionRequest(player: Player): void;
  id(): number;
  extend(): void;
}

export class PlayerInfo {
  public readonly clan: string | null;

  constructor(
    public readonly name: string,
    public readonly playerType: PlayerType,
    // null if bot.
    public readonly clientID: ClientID | null,
    // TODO: make player id the small id
    public readonly id: PlayerID,
    public readonly nation?: Nation | null,
  ) {
    // Compute clan from name
    if (!name.startsWith("[") || !name.includes("]")) {
      this.clan = null;
    } else {
      const clanMatch = name.match(/^\[([a-zA-Z]{2,5})\]/);
      this.clan = clanMatch ? clanMatch[1] : null;
    }
  }
}

export function isUnit(unit: unknown): unit is Unit {
  return (
    unit &&
    typeof unit === "object" &&
    "isUnit" in unit &&
    typeof unit.isUnit === "function" &&
    unit.isUnit()
  );
}

export interface Unit {
  isUnit(): this is Unit;

  // Common properties.
  id(): number;
  type(): UnitType;
  owner(): Player;
  info(): UnitInfo;
  delete(displayMessage?: boolean, destroyer?: Player): void;
  tile(): TileRef;
  lastTile(): TileRef;
  move(tile: TileRef): void;
  isActive(): boolean;
  setOwner(owner: Player): void;
  touch(): void;
  hash(): number;
  toUpdate(): UnitUpdate;
  hasTrainStation(): boolean;
  setTrainStation(trainStation: boolean): void;

  // Train
  trainType(): TrainType | undefined;
  isLoaded(): boolean | undefined;
  setLoaded(loaded: boolean): void;

  // Targeting
  setTargetTile(cell: TileRef | undefined): void;
  targetTile(): TileRef | undefined;
  setTrajectoryIndex(i: number): void;
  trajectoryIndex(): number;
  trajectory(): TrajectoryTile[];
  setTargetUnit(unit: Unit | undefined): void;
  targetUnit(): Unit | undefined;
  setTargetedBySAM(targeted: boolean): void;
  targetedBySAM(): boolean;
  setReachedTarget(): void;
  reachedTarget(): boolean;
  isTargetable(): boolean;
  setTargetable(targetable: boolean): void;

  // Health
  hasHealth(): boolean;
  retreating(): boolean;
  orderBoatRetreat(): void;
  health(): number;
  modifyHealth(delta: number, attacker?: Player): void;

  // Troops
  setTroops(troops: number): void;
  troops(): number;

  // --- UNIT SPECIFIC ---

  // SAMs & Missile Silos
  launch(): void;
  reloadMissile(): void;
  isInCooldown(): boolean;
  missileTimerQueue(): number[];

  // Trade Ships
  setSafeFromPirates(): void; // Only for trade ships
  isSafeFromPirates(): boolean; // Only for trade ships

  // Construction
  constructionType(): UnitType | null;
  setConstructionType(type: UnitType): void;

  // Upgradable Structures
  level(): number;
  increaseLevel(): void;

  // Warships
  setPatrolTile(tile: TileRef): void;
  patrolTile(): TileRef | undefined;
}

export interface TerraNullius {
  isPlayer(): false;
  id(): null;
  clientID(): ClientID;
  smallID(): number;
}

export interface Embargo {
  createdAt: Tick;
  isTemporary: boolean;
  target: PlayerID;
}

export interface Player {
  // Basic Info
  smallID(): number;
  info(): PlayerInfo;
  name(): string;
  displayName(): string;
  clientID(): ClientID | null;
  id(): PlayerID;
  type(): PlayerType;
  isPlayer(): this is Player;
  toString(): string;

  // State & Properties
  isAlive(): boolean;
  isTraitor(): boolean;
  markTraitor(): void;
  largestClusterBoundingBox: { min: Cell; max: Cell } | null;
  lastTileChange(): Tick;

  isDisconnected(): boolean;
  markDisconnected(isDisconnected: boolean): void;

  hasSpawned(): boolean;
  setHasSpawned(hasSpawned: boolean): void;

  // Territory
  tiles(): ReadonlySet<TileRef>;
  borderTiles(): ReadonlySet<TileRef>;
  numTilesOwned(): number;
  conquer(tile: TileRef): void;
  relinquish(tile: TileRef): void;

  // Resources & Troops
  gold(): Gold;
  addGold(toAdd: Gold, tile?: TileRef): void;
  removeGold(toRemove: Gold): Gold;
  troops(): number;
  setTroops(troops: number): void;
  addTroops(troops: number): void;
  removeTroops(troops: number): number;

  // Units
  units(...types: UnitType[]): Unit[];
  unitCount(type: UnitType): number;
  unitsConstructed(type: UnitType): number;
  unitsOwned(type: UnitType): number;
  buildableUnits(tile: TileRef): BuildableUnit[];
  canBuild(type: UnitType, targetTile: TileRef): TileRef | false;
  buildUnit<T extends UnitType>(
    type: T,
    spawnTile: TileRef,
    params: UnitParams<T>,
  ): Unit;

  // Returns the existing unit that can be upgraded,
  // or false if it cannot be upgraded.
  // New units of the same type can upgrade existing units.
  // e.g. if a place a new city here, can it upgrade an existing city?
  findUnitToUpgrade(type: UnitType, targetTile: TileRef): Unit | false;
  canUpgradeUnit(unitType: UnitType): boolean;
  upgradeUnit(unit: Unit): void;
  captureUnit(unit: Unit): void;

  // Relations & Diplomacy
  neighbors(): (Player | TerraNullius)[];
  sharesBorderWith(other: Player | TerraNullius): boolean;
  relation(other: Player): Relation;
  allRelationsSorted(): { player: Player; relation: Relation }[];
  updateRelation(other: Player, delta: number): void;
  decayRelations(): void;
  isOnSameTeam(other: Player): boolean;
  // Either allied or on same team.
  isFriendly(other: Player): boolean;
  team(): Team | null;
  clan(): string | null;
  incomingAllianceRequests(): AllianceRequest[];
  outgoingAllianceRequests(): AllianceRequest[];
  alliances(): MutableAlliance[];
  expiredAlliances(): Alliance[];
  allies(): Player[];
  isAlliedWith(other: Player): boolean;
  allianceWith(other: Player): MutableAlliance | null;
  canSendAllianceRequest(other: Player): boolean;
  breakAlliance(alliance: Alliance): void;
  createAllianceRequest(recipient: Player): AllianceRequest | null;

  // Targeting
  canTarget(other: Player): boolean;
  target(other: Player): void;
  targets(): Player[];
  transitiveTargets(): Player[];

  // Communication
  canSendEmoji(recipient: Player | typeof AllPlayers): boolean;
  outgoingEmojis(): EmojiMessage[];
  sendEmoji(recipient: Player | typeof AllPlayers, emoji: string): void;

  // Donation
  canDonate(recipient: Player): boolean;
  donateTroops(recipient: Player, troops: number): boolean;
  donateGold(recipient: Player, gold: Gold): boolean;
  canDeleteUnit(): boolean;
  recordDeleteUnit(): void;

  // Embargo
  hasEmbargoAgainst(other: Player): boolean;
  tradingPartners(): Player[];
  addEmbargo(other: PlayerID, isTemporary: boolean): void;
  getEmbargoes(): Embargo[];
  stopEmbargo(other: PlayerID): void;
  endTemporaryEmbargo(other: PlayerID): void;
  canTrade(other: Player): boolean;

  // Attacking.
  canAttack(tile: TileRef): boolean;

  createAttack(
    target: Player | TerraNullius,
    troops: number,
    sourceTile: TileRef | null,
    border: Set<number>,
  ): Attack;
  outgoingAttacks(): Attack[];
  incomingAttacks(): Attack[];
  orderRetreat(attackID: string): void;
  executeRetreat(attackID: string): void;

  // Misc
  toUpdate(): PlayerUpdate;
  playerProfile(): PlayerProfile;
  tradingPorts(port: Unit): Unit[];
  // WARNING: this operation is expensive.
  bestTransportShipSpawn(tile: TileRef): TileRef | false;
}

export interface Game extends GameMap {
  // Map & Dimensions
  isOnMap(cell: Cell): boolean;
  width(): number;
  height(): number;
  map(): GameMap;
  miniMap(): GameMap;
  forEachTile(fn: (tile: TileRef) => void): void;

  // Player Management
  player(id: PlayerID): Player;
  players(): Player[];
  allPlayers(): Player[];
  playerByClientID(id: ClientID): Player | null;
  playerBySmallID(id: number): Player | TerraNullius;
  hasPlayer(id: PlayerID): boolean;
  addPlayer(playerInfo: PlayerInfo): Player;
  terraNullius(): TerraNullius;
  owner(ref: TileRef): Player | TerraNullius;

  teams(): Team[];

  // Alliances
  alliances(): MutableAlliance[];
  expireAlliance(alliance: Alliance): void;

  // Game State
  ticks(): Tick;
  inSpawnPhase(): boolean;
  executeNextTick(): GameUpdates;
  setWinner(winner: Player | Team, allPlayersStats: AllPlayersStats): void;
  config(): Config;

  // Units
  units(...types: UnitType[]): Unit[];
  unitCount(type: UnitType): number;
  unitInfo(type: UnitType): UnitInfo;
  hasUnitNearby(
    tile: TileRef,
    searchRange: number,
    type: UnitType,
    playerId: PlayerID,
  ): boolean;
  nearbyUnits(
    tile: TileRef,
    searchRange: number,
    types: UnitType | UnitType[],
    predicate?: UnitPredicate,
  ): Array<{ unit: Unit; distSquared: number }>;

  addExecution(...exec: Execution[]): void;
  displayMessage(
    message: string,
    type: MessageType,
    playerID: PlayerID | null,
    goldAmount?: bigint,
    params?: Record<string, string | number>,
  ): void;
  displayIncomingUnit(
    unitID: number,
    message: string,
    type: MessageType,
    playerID: PlayerID | null,
  ): void;

  displayChat(
    message: string,
    category: string,
    target: PlayerID | undefined,
    playerID: PlayerID | null,
    isFrom: boolean,
    recipient: string,
  ): void;

  // Nations
  nations(): Nation[];

  numTilesWithFallout(): number;
  // Optional as it's not initialized before the end of spawn phase
  stats(): Stats;

  addUpdate(update: GameUpdate): void;
  railNetwork(): RailNetwork;
  conquerPlayer(conqueror: Player, conquered: Player): void;
}

export interface PlayerActions {
  canAttack: boolean;
  buildableUnits: BuildableUnit[];
  canSendEmojiAllPlayers: boolean;
  interaction?: PlayerInteraction;
}

export interface BuildableUnit {
  canBuild: TileRef | false;
  // unit id of the existing unit that can be upgraded, or false if it cannot be upgraded.
  canUpgrade: number | false;
  type: UnitType;
  cost: Gold;
}

export interface PlayerProfile {
  relations: Record<number, Relation>;
  alliances: number[];
}

export interface PlayerBorderTiles {
  borderTiles: ReadonlySet<TileRef>;
}

export interface PlayerInteraction {
  sharedBorder: boolean;
  canSendEmoji: boolean;
  canSendAllianceRequest: boolean;
  canBreakAlliance: boolean;
  canTarget: boolean;
  canDonate: boolean;
  canEmbargo: boolean;
  allianceExpiresAt?: Tick;
}

export interface EmojiMessage {
  message: string;
  senderID: number;
  recipientID: number | typeof AllPlayers;
  createdAt: Tick;
}

export enum MessageType {
  ATTACK_FAILED,
  ATTACK_CANCELLED,
  ATTACK_REQUEST,
  CONQUERED_PLAYER,
  MIRV_INBOUND,
  NUKE_INBOUND,
  HYDROGEN_BOMB_INBOUND,
  NAVAL_INVASION_INBOUND,
  SAM_MISS,
  SAM_HIT,
  CAPTURED_ENEMY_UNIT,
  UNIT_CAPTURED_BY_ENEMY,
  UNIT_DESTROYED,
  ALLIANCE_ACCEPTED,
  ALLIANCE_REJECTED,
  ALLIANCE_REQUEST,
  ALLIANCE_BROKEN,
  ALLIANCE_EXPIRED,
  SENT_GOLD_TO_PLAYER,
  RECEIVED_GOLD_FROM_PLAYER,
  RECEIVED_GOLD_FROM_TRADE,
  SENT_TROOPS_TO_PLAYER,
  RECEIVED_TROOPS_FROM_PLAYER,
  CHAT,
  RENEW_ALLIANCE,
}

// Message categories used for filtering events in the EventsDisplay
export enum MessageCategory {
  ATTACK = "ATTACK",
  ALLIANCE = "ALLIANCE",
  TRADE = "TRADE",
  CHAT = "CHAT",
}

// Ensures that all message types are included in a category
export const MESSAGE_TYPE_CATEGORIES: Record<MessageType, MessageCategory> = {
  [MessageType.ATTACK_FAILED]: MessageCategory.ATTACK,
  [MessageType.ATTACK_CANCELLED]: MessageCategory.ATTACK,
  [MessageType.ATTACK_REQUEST]: MessageCategory.ATTACK,
  [MessageType.CONQUERED_PLAYER]: MessageCategory.ATTACK,
  [MessageType.MIRV_INBOUND]: MessageCategory.ATTACK,
  [MessageType.NUKE_INBOUND]: MessageCategory.ATTACK,
  [MessageType.HYDROGEN_BOMB_INBOUND]: MessageCategory.ATTACK,
  [MessageType.NAVAL_INVASION_INBOUND]: MessageCategory.ATTACK,
  [MessageType.SAM_MISS]: MessageCategory.ATTACK,
  [MessageType.SAM_HIT]: MessageCategory.ATTACK,
  [MessageType.CAPTURED_ENEMY_UNIT]: MessageCategory.ATTACK,
  [MessageType.UNIT_CAPTURED_BY_ENEMY]: MessageCategory.ATTACK,
  [MessageType.UNIT_DESTROYED]: MessageCategory.ATTACK,
  [MessageType.ALLIANCE_ACCEPTED]: MessageCategory.ALLIANCE,
  [MessageType.ALLIANCE_REJECTED]: MessageCategory.ALLIANCE,
  [MessageType.ALLIANCE_REQUEST]: MessageCategory.ALLIANCE,
  [MessageType.ALLIANCE_BROKEN]: MessageCategory.ALLIANCE,
  [MessageType.ALLIANCE_EXPIRED]: MessageCategory.ALLIANCE,
  [MessageType.RENEW_ALLIANCE]: MessageCategory.ALLIANCE,
  [MessageType.SENT_GOLD_TO_PLAYER]: MessageCategory.TRADE,
  [MessageType.RECEIVED_GOLD_FROM_PLAYER]: MessageCategory.TRADE,
  [MessageType.RECEIVED_GOLD_FROM_TRADE]: MessageCategory.TRADE,
  [MessageType.SENT_TROOPS_TO_PLAYER]: MessageCategory.TRADE,
  [MessageType.RECEIVED_TROOPS_FROM_PLAYER]: MessageCategory.TRADE,
  [MessageType.CHAT]: MessageCategory.CHAT,
} as const;

/**
 * Get the category of a message type
 */
export function getMessageCategory(messageType: MessageType): MessageCategory {
  return MESSAGE_TYPE_CATEGORIES[messageType];
}

export interface NameViewData {
  x: number;
  y: number;
  size: number;
}
