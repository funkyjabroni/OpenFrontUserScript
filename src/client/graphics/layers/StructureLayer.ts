import { colord, Colord } from "colord";
import { Theme } from "../../../core/configuration/Config";
import { EventBus } from "../../../core/EventBus";
import { MouseUpEvent } from "../../InputHandler";
import { TransformHandler } from "../TransformHandler";
import { Layer } from "./Layer";
import { UnitInfoModal } from "./UnitInfoModal";

import cityIcon from "../../../../resources/images/buildings/cityAlt1.png";
import shieldIcon from "../../../../resources/images/buildings/fortAlt2.png";
import anchorIcon from "../../../../resources/images/buildings/port1.png";
import MissileSiloReloadingIcon from "../../../../resources/images/buildings/silo1-reloading.png";
import missileSiloIcon from "../../../../resources/images/buildings/silo1.png";
import SAMMissileReloadingIcon from "../../../../resources/images/buildings/silo4-reloading.png";
import SAMMissileIcon from "../../../../resources/images/buildings/silo4.png";
import { Cell, UnitType } from "../../../core/game/Game";
import {
  euclDistFN,
  hexDistFN,
  manhattanDistFN,
  rectDistFN,
} from "../../../core/game/GameMap";
import { GameUpdateType } from "../../../core/game/GameUpdates";
import { GameView, UnitView } from "../../../core/game/GameView";

const underConstructionColor = colord({ r: 150, g: 150, b: 150 });
const reloadingColor = colord({ r: 255, g: 0, b: 0 });
const selectedUnitColor = colord({ r: 0, g: 255, b: 255 });

// Base radius values and scaling factor for unit borders and territories
const BASE_BORDER_RADIUS = 16.5;
const BASE_TERRITORY_RADIUS = 13.5;
const RADIUS_SCALE_FACTOR = 0.5;

type DistanceFunction = typeof euclDistFN;

enum UnitBorderType {
  Round,
  Diamond,
  Square,
  Hexagon,
}

interface UnitRenderConfig {
  icon: string;
  borderRadius: number;
  territoryRadius: number;
  borderType: UnitBorderType;
}

export class StructureLayer implements Layer {
  private canvas: HTMLCanvasElement;
  private context: CanvasRenderingContext2D;
  private unitIcons: Map<string, HTMLImageElement> = new Map();
  private theme: Theme;
  private selectedStructureUnit: UnitView | null = null;
  private previouslySelected: UnitView | null = null;
  private tempCanvas: HTMLCanvasElement;
  private tempContext: CanvasRenderingContext2D;

  // Configuration for supported unit types only
  private readonly unitConfigs: Partial<Record<UnitType, UnitRenderConfig>> = {
    [UnitType.Port]: {
      icon: anchorIcon,
      borderRadius: BASE_BORDER_RADIUS * RADIUS_SCALE_FACTOR,
      territoryRadius: BASE_TERRITORY_RADIUS * RADIUS_SCALE_FACTOR,
      borderType: UnitBorderType.Round,
    },
    [UnitType.City]: {
      icon: cityIcon,
      borderRadius: BASE_BORDER_RADIUS * RADIUS_SCALE_FACTOR,
      territoryRadius: BASE_TERRITORY_RADIUS * RADIUS_SCALE_FACTOR,
      borderType: UnitBorderType.Round,
    },
    [UnitType.MissileSilo]: {
      icon: missileSiloIcon,
      borderRadius: BASE_BORDER_RADIUS * RADIUS_SCALE_FACTOR,
      territoryRadius: BASE_TERRITORY_RADIUS * RADIUS_SCALE_FACTOR,
      borderType: UnitBorderType.Square,
    },
    [UnitType.DefensePost]: {
      icon: shieldIcon,
      borderRadius: BASE_BORDER_RADIUS * RADIUS_SCALE_FACTOR,
      territoryRadius: BASE_TERRITORY_RADIUS * RADIUS_SCALE_FACTOR,
      borderType: UnitBorderType.Hexagon,
    },
    [UnitType.SAMLauncher]: {
      icon: SAMMissileIcon,
      borderRadius: BASE_BORDER_RADIUS * RADIUS_SCALE_FACTOR,
      territoryRadius: BASE_TERRITORY_RADIUS * RADIUS_SCALE_FACTOR,
      borderType: UnitBorderType.Square,
    },
  };

  constructor(
    private game: GameView,
    private eventBus: EventBus,
    private transformHandler: TransformHandler,
    private unitInfoModal: UnitInfoModal | null,
  ) {
    if (!unitInfoModal) {
      throw new Error(
        "UnitInfoModal instance must be provided to StructureLayer.",
      );
    }
    this.unitInfoModal = unitInfoModal;
    this.theme = game.config().theme();
    this.tempCanvas = document.createElement("canvas");
    const tempContext = this.tempCanvas.getContext("2d");
    if (tempContext === null) throw new Error("2d context not supported");
    this.tempContext = tempContext;
    this.loadIconData();
    this.loadIcon("reloadingSam", {
      icon: SAMMissileReloadingIcon,
      borderRadius: BASE_BORDER_RADIUS * RADIUS_SCALE_FACTOR,
      territoryRadius: BASE_TERRITORY_RADIUS * RADIUS_SCALE_FACTOR,
      borderType: UnitBorderType.Square,
    });
    this.loadIcon("reloadingSilo", {
      icon: MissileSiloReloadingIcon,
      borderRadius: BASE_BORDER_RADIUS * RADIUS_SCALE_FACTOR,
      territoryRadius: BASE_TERRITORY_RADIUS * RADIUS_SCALE_FACTOR,
      borderType: UnitBorderType.Square,
    });
  }

  private loadIcon(unitType: string, config: UnitRenderConfig) {
    const image = new Image();
    image.src = config.icon;
    image.onload = () => {
      this.unitIcons.set(unitType, image);
      console.log(
        `icon loaded: ${unitType}, size: ${image.width}x${image.height}`,
      );
    };
    image.onerror = () => {
      console.error(`Failed to load icon for ${unitType}: ${config.icon}`);
    };
  }

  private loadIconData() {
    Object.entries(this.unitConfigs).forEach(([unitType, config]) => {
      this.loadIcon(unitType, config);
    });
  }

  shouldTransform(): boolean {
    return true;
  }

  tick() {
    const updates = this.game.updatesSinceLastTick();
    const unitUpdates = updates !== null ? updates[GameUpdateType.Unit] : [];
    for (const u of unitUpdates) {
      const unit = this.game.unit(u.id);
      if (unit === undefined) continue;
      this.handleUnitRendering(unit);
    }
  }

  init() {
    this.redraw();
    this.eventBus.on(MouseUpEvent, (e) => this.onMouseUp(e));
  }

  redraw() {
    console.log("structure layer redrawing");
    this.canvas = document.createElement("canvas");
    const context = this.canvas.getContext("2d", { alpha: true });
    if (context === null) throw new Error("2d context not supported");
    this.context = context;

    // Enable smooth scaling
    this.context.imageSmoothingEnabled = true;
    this.context.imageSmoothingQuality = "high";

    this.canvas.width = this.game.width() * 2;
    this.canvas.height = this.game.height() * 2;
    this.game.units().forEach((u) => this.handleUnitRendering(u));
  }

  renderLayer(context: CanvasRenderingContext2D) {
    context.drawImage(
      this.canvas,
      -this.game.width() / 2,
      -this.game.height() / 2,
      this.game.width(),
      this.game.height(),
    );
  }

  private isUnitTypeSupported(unitType: UnitType): boolean {
    return unitType in this.unitConfigs;
  }

  private drawBorder(
    unit: UnitView,
    borderColor: Colord,
    config: UnitRenderConfig,
    distanceFN: DistanceFunction,
  ) {
    // Draw border and territory
    for (const tile of this.game.bfs(
      unit.tile(),
      distanceFN(unit.tile(), config.borderRadius, true),
    )) {
      this.paintCell(
        new Cell(this.game.x(tile), this.game.y(tile)),
        borderColor,
        255,
      );
    }

    for (const tile of this.game.bfs(
      unit.tile(),
      distanceFN(unit.tile(), config.territoryRadius, true),
    )) {
      this.paintCell(
        new Cell(this.game.x(tile), this.game.y(tile)),
        unit.type() === UnitType.Construction
          ? underConstructionColor
          : this.theme.territoryColor(unit.owner()),
        130,
      );
    }
  }

  private getDrawFN(type: UnitBorderType) {
    switch (type) {
      case UnitBorderType.Round:
        return euclDistFN;
      case UnitBorderType.Diamond:
        return manhattanDistFN;
      case UnitBorderType.Square:
        return rectDistFN;
      case UnitBorderType.Hexagon:
        return hexDistFN;
    }
  }

  private handleUnitRendering(unit: UnitView) {
    const unitType = unit.constructionType() ?? unit.type();
    const iconType = unitType;
    if (!this.isUnitTypeSupported(unitType)) return;

    const config = this.unitConfigs[unitType];
    let icon: HTMLImageElement | undefined;
    let borderColor = this.theme.borderColor(unit.owner());

    // Handle cooldown states and special icons
    if (unitType === UnitType.SAMLauncher && unit.isInCooldown()) {
      icon = this.unitIcons.get("reloadingSam");
      borderColor = reloadingColor;
    } else if (unitType === UnitType.MissileSilo && unit.isInCooldown()) {
      icon = this.unitIcons.get("reloadingSilo");
      borderColor = reloadingColor;
    } else if (unit.type() === UnitType.Construction) {
      icon = this.unitIcons.get(iconType);
      borderColor = underConstructionColor;
    } else {
      icon = this.unitIcons.get(iconType);
    }

    if (!config || !icon) return;

    const drawFunction = this.getDrawFN(config.borderType);
    // Clear previous rendering
    for (const tile of this.game.bfs(
      unit.tile(),
      drawFunction(unit.tile(), config.borderRadius, true),
    )) {
      this.clearCell(new Cell(this.game.x(tile), this.game.y(tile)));
    }

    if (!unit.isActive()) return;

    if (this.selectedStructureUnit === unit) {
      borderColor = selectedUnitColor;
    }

    this.drawBorder(unit, borderColor, config, drawFunction);

    // Render icon at 1/2 scale for better quality
    const scaledWidth = icon.width >> 1;
    const scaledHeight = icon.height >> 1;
    const startX = this.game.x(unit.tile()) - (scaledWidth >> 1);
    const startY = this.game.y(unit.tile()) - (scaledHeight >> 1);

    this.renderIcon(icon, startX, startY, scaledWidth, scaledHeight, unit);
  }

  private renderIcon(
    image: HTMLImageElement,
    startX: number,
    startY: number,
    width: number,
    height: number,
    unit: UnitView,
  ) {
    let color = this.theme.borderColor(unit.owner());
    if (unit.type() === UnitType.Construction) {
      color = underConstructionColor;
    }

    // Make temp canvas at the final render size (2x scale)
    this.tempCanvas.width = width * 2;
    this.tempCanvas.height = height * 2;

    // Enable smooth scaling
    this.tempContext.imageSmoothingEnabled = true;
    this.tempContext.imageSmoothingQuality = "high";

    // Draw the image at final size with high quality scaling
    this.tempContext.drawImage(image, 0, 0, width * 2, height * 2);

    // Apply color tinting using multiply blend mode
    this.tempContext.globalCompositeOperation = "multiply";
    this.tempContext.fillStyle = color.toRgbString();
    this.tempContext.fillRect(0, 0, width * 2, height * 2);

    // Restore the alpha channel
    this.tempContext.globalCompositeOperation = "destination-in";
    this.tempContext.drawImage(image, 0, 0, width * 2, height * 2);

    // Draw the final result to the main canvas
    this.context.drawImage(this.tempCanvas, startX * 2, startY * 2);
  }

  paintCell(cell: Cell, color: Colord, alpha: number) {
    this.clearCell(cell);
    this.context.fillStyle = color.alpha(alpha / 255).toRgbString();
    this.context.fillRect(cell.x * 2, cell.y * 2, 2, 2);
  }

  clearCell(cell: Cell) {
    this.context.clearRect(cell.x * 2, cell.y * 2, 2, 2);
  }

  private findStructureUnitAtCell(
    cell: { x: number; y: number },
    maxDistance: number = 10,
  ): UnitView | null {
    const targetRef = this.game.ref(cell.x, cell.y);

    const allUnitTypes = Object.values(UnitType);

    const nearby = this.game.nearbyUnits(targetRef, maxDistance, allUnitTypes);

    for (const { unit } of nearby) {
      if (unit.isActive() && this.isUnitTypeSupported(unit.type())) {
        return unit;
      }
    }

    return null;
  }

  private onMouseUp(event: MouseUpEvent) {
    const cell = this.transformHandler.screenToWorldCoordinates(
      event.x,
      event.y,
    );
    if (!this.game.isValidCoord(cell.x, cell.y)) {
      return;
    }

    const clickedUnit = this.findStructureUnitAtCell(cell);
    this.previouslySelected = this.selectedStructureUnit;

    if (clickedUnit) {
      if (clickedUnit.owner() !== this.game.myPlayer()) {
        return;
      }
      const wasSelected = this.previouslySelected === clickedUnit;
      if (wasSelected) {
        this.selectedStructureUnit = null;
        if (this.previouslySelected) {
          this.handleUnitRendering(this.previouslySelected);
        }
        this.unitInfoModal?.onCloseStructureModal();
      } else {
        this.selectedStructureUnit = clickedUnit;
        if (
          this.previouslySelected &&
          this.previouslySelected !== clickedUnit
        ) {
          this.handleUnitRendering(this.previouslySelected);
        }
        this.handleUnitRendering(clickedUnit);

        const screenPos = this.transformHandler.worldToScreenCoordinates(cell);
        const unitTile = clickedUnit.tile();
        this.unitInfoModal?.onOpenStructureModal({
          eventBus: this.eventBus,
          unit: clickedUnit,
          x: screenPos.x,
          y: screenPos.y,
          tileX: this.game.x(unitTile),
          tileY: this.game.y(unitTile),
        });
      }
    } else {
      this.selectedStructureUnit = null;
      if (this.previouslySelected) {
        this.handleUnitRendering(this.previouslySelected);
      }
      this.unitInfoModal?.onCloseStructureModal();
    }
  }

  public unSelectStructureUnit() {
    if (this.selectedStructureUnit) {
      this.previouslySelected = this.selectedStructureUnit;
      this.selectedStructureUnit = null;
      this.handleUnitRendering(this.previouslySelected);
    }
  }
}
