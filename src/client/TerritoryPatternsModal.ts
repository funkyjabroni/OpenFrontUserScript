import type { TemplateResult } from "lit";
import { html, LitElement, render } from "lit";
import { customElement, property, query, state } from "lit/decorators.js";
import { UserMeResponse } from "../core/ApiSchemas";
import { COSMETICS } from "../core/CosmeticSchemas";
import { UserSettings } from "../core/game/UserSettings";
import { PatternDecoder } from "../core/PatternDecoder";
import "./components/Difficulties";
import "./components/Maps";
import { translateText } from "./Utils";

@customElement("territory-patterns-modal")
export class TerritoryPatternsModal extends LitElement {
  @query("o-modal") private modalEl!: HTMLElement & {
    open: () => void;
    close: () => void;
  };

  public previewButton: HTMLElement | null = null;
  public buttonWidth: number = 150;

  @state() private selectedPattern: string | undefined;

  @state() private lockedPatterns: string[] = [];
  @state() private lockedReasons: Record<string, string> = {};
  @state() private hoveredPattern: string | null = null;
  @state() private hoverPosition = { x: 0, y: 0 };

  @state() private keySequence: string[] = [];
  @state() private showChocoPattern = false;

  public resizeObserver: ResizeObserver;

  @property({ type: Object }) userSettings: UserSettings;

  constructor() {
    super();
    this.checkPatternPermission(undefined, undefined);
  }

  connectedCallback() {
    super.connectedCallback();
    if (this.userSettings) {
      this.selectedPattern = this.userSettings.getSelectedPattern();
    }
    window.addEventListener("keydown", this.handleKeyDown);
    this.updateComplete.then(() => {
      const containers = this.renderRoot.querySelectorAll(".preview-container");
      if (this.resizeObserver) {
        containers.forEach((container) =>
          this.resizeObserver.observe(container),
        );
      }
      this.updatePreview();
    });
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    window.removeEventListener("keydown", this.handleKeyDown);
    this.resizeObserver.disconnect();
  }

  onLogout() {
    this.checkPatternPermission(undefined, undefined);
  }

  onUserMe(userMeResponse: UserMeResponse) {
    const { player } = userMeResponse;
    const { roles, flares } = player;
    this.checkPatternPermission(roles, flares);
  }

  private checkPatternPermission(
    roles: string[] | undefined,
    flares: string[] | undefined,
  ) {
    this.lockedPatterns = [];
    this.lockedReasons = {};
    for (const key in COSMETICS.patterns) {
      const patternData = COSMETICS.patterns[key];
      const roleGroup: string[] | string | undefined = patternData.role_group;
      if (
        flares !== undefined &&
        (flares.includes("pattern:*") || flares.includes(`pattern:${key}`))
      ) {
        continue;
      }

      if (!roleGroup || (Array.isArray(roleGroup) && roleGroup.length === 0)) {
        if (roles === undefined || roles.length === 0) {
          const reason = translateText("territory_patterns.blocked.login");
          this.setLockedPatterns([key], reason);
        }
        continue;
      }

      const groupList = Array.isArray(roleGroup) ? roleGroup : [roleGroup];
      const isAllowed =
        roles !== undefined &&
        groupList.some((required) => roles.includes(required));

      if (!isAllowed) {
        const reason = translateText("territory_patterns.blocked.role", {
          role: groupList.join(", "),
        });
        this.setLockedPatterns([key], reason);
      }
    }
    this.requestUpdate();
  }

  private handleKeyDown = (e: KeyboardEvent) => {
    const key = e.key.toLowerCase();
    const nextSequence = [...this.keySequence, key].slice(-5);
    this.keySequence = nextSequence;

    if (nextSequence.join("") === "choco") {
      this.triggerChocoEasterEgg();
      this.keySequence = [];
    }
  };

  private triggerChocoEasterEgg() {
    console.log("🍫 Choco pattern unlocked!");
    this.showChocoPattern = true;

    const popup = document.createElement("div");
    popup.className = "easter-egg-popup";
    popup.textContent = "🎉 You unlocked the Choco pattern!";
    document.body.appendChild(popup);

    setTimeout(() => {
      popup.remove();
    }, 5000);

    this.requestUpdate();
  }

  createRenderRoot() {
    return this;
  }

  private renderTooltip(): TemplateResult | null {
    if (this.hoveredPattern && this.lockedReasons[this.hoveredPattern]) {
      return html`
        <div
          class="fixed z-[10000] px-3 py-2 rounded bg-black text-white text-sm pointer-events-none shadow-md"
          style="top: ${this.hoverPosition.y + 12}px; left: ${this.hoverPosition
            .x + 12}px;"
        >
          ${this.lockedReasons[this.hoveredPattern]}
        </div>
      `;
    }
    return null;
  }

  private renderPatternButton(key: string): TemplateResult {
    const isLocked = this.isPatternLocked(key);
    const isSelected = this.selectedPattern === key;
    const name = COSMETICS.patterns[key]?.name ?? "custom";
    return html`
      <button
        class="border p-2 rounded-lg shadow text-black dark:text-white text-left
        ${isSelected
          ? "bg-blue-500 text-white"
          : "bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700"}
        ${isLocked ? "opacity-50 cursor-not-allowed" : ""}"
        style="flex: 0 1 calc(25% - 1rem); max-width: calc(25% - 1rem);"
        @click=${() => !isLocked && this.selectPattern(key)}
        @mouseenter=${(e: MouseEvent) => this.handleMouseEnter(key, e)}
        @mousemove=${(e: MouseEvent) => this.handleMouseMove(e)}
        @mouseleave=${() => this.handleMouseLeave()}
      >
        <div class="text-sm font-bold mb-1">
          ${translateText(`territory_patterns.pattern.${name}`)}
        </div>
        <div
          class="preview-container"
          style="
            width: 100%;
            aspect-ratio: 1;
            display: flex;
            align-items: center;
            justify-content: center;
            background: #fff;
            border-radius: 8px;
            overflow: hidden;
          "
        >
          ${this.renderPatternPreview(key, this.buttonWidth, this.buttonWidth)}
        </div>
      </button>
    `;
  }

  private renderPatternGrid(): TemplateResult {
    const buttons: TemplateResult[] = [];
    for (const key in COSMETICS.patterns) {
      const value = COSMETICS.patterns[key];
      if (!this.showChocoPattern && value.name === "choco") continue;
      const result = this.renderPatternButton(key);
      buttons.push(result);
    }

    return html`
      <div
        class="flex flex-wrap gap-4 p-2"
        style="justify-content: center; align-items: flex-start;"
      >
        <button
          class="border p-2 rounded-lg shadow text-black dark:text-white text-left
          ${this.selectedPattern === undefined
            ? "bg-blue-500 text-white"
            : "bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700"}"
          style="flex: 0 1 calc(25% - 1rem); max-width: calc(25% - 1rem);"
          @click=${() => this.selectPattern(undefined)}
        >
          <div class="text-sm font-bold mb-1">
            ${translateText("territory_patterns.pattern.default")}
          </div>
          <div
            class="preview-container"
            style="
              width: 100%;
              aspect-ratio: 1;
              display: flex;
              align-items: center;
              justify-content: center;
              background: #fff;
              border-radius: 8px;
              overflow: hidden;
            "
          >
            ${this.renderBlankPreview(this.buttonWidth, this.buttonWidth)}
          </div>
        </button>
        ${buttons}
      </div>
    `;
  }

  render() {
    return html`
      ${this.renderTooltip()}
      <o-modal
        id="territoryPatternsModal"
        title="${translateText("territory_patterns.title")}"
      >
        ${this.renderPatternGrid()}
      </o-modal>
    `;
  }

  public open() {
    this.modalEl?.open();
  }

  public close() {
    this.modalEl?.close();
  }

  private selectPattern(pattern: string | undefined) {
    this.userSettings.setSelectedPattern(pattern);
    this.selectedPattern = pattern;
    this.updatePreview();
    this.close();
  }

  private renderPatternPreview(
    pattern?: string,
    width?: number,
    height?: number,
  ): TemplateResult {
    return html`
      <img src="${generatePreviewDataUrl(pattern, width, height)}"></img>
    `;
  }

  private renderBlankPreview(width: number, height: number): TemplateResult {
    return html`
      <div
        style="
          display: flex;
          align-items: center;
          justify-content: center;
          height: ${height}px;
          width: ${width}px;
          background-color: #ffffff;
          border-radius: 4px;
          box-sizing: border-box;
          overflow: hidden;
          position: relative;
          border: 1px solid #ccc;
        "
      >
        <div
          style="display: grid; grid-template-columns: repeat(2, ${width /
          2}px); grid-template-rows: repeat(2, ${height / 2}px);"
        >
          <div
            style="background-color: #fff; border: 1px solid rgba(0, 0, 0, 0.1); width: ${width /
            2}px; height: ${height / 2}px;"
          ></div>
          <div
            style="background-color: #fff; border: 1px solid rgba(0, 0, 0, 0.1); width: ${width /
            2}px; height: ${height / 2}px;"
          ></div>
          <div
            style="background-color: #fff; border: 1px solid rgba(0, 0, 0, 0.1); width: ${width /
            2}px; height: ${height / 2}px;"
          ></div>
          <div
            style="background-color: #fff; border: 1px solid rgba(0, 0, 0, 0.1); width: ${width /
            2}px; height: ${height / 2}px;"
          ></div>
        </div>
      </div>
    `;
  }

  public updatePreview() {
    if (this.previewButton === null) return;
    const preview = this.renderPatternPreview(this.selectedPattern, 48, 48);
    render(preview, this.previewButton);
  }

  private setLockedPatterns(lockedPatterns: string[], reason: string) {
    this.lockedPatterns = [...this.lockedPatterns, ...lockedPatterns];
    this.lockedReasons = {
      ...this.lockedReasons,
      ...lockedPatterns.reduce(
        (acc, key) => {
          acc[key] = reason;
          return acc;
        },
        {} as Record<string, string>,
      ),
    };
  }

  private isPatternLocked(patternKey: string): boolean {
    return this.lockedPatterns.includes(patternKey);
  }

  private handleMouseEnter(patternKey: string, event: MouseEvent) {
    if (this.isPatternLocked(patternKey)) {
      this.hoveredPattern = patternKey;
      this.hoverPosition = { x: event.clientX, y: event.clientY };
    }
  }

  private handleMouseMove(event: MouseEvent) {
    if (this.hoveredPattern) {
      this.hoverPosition = { x: event.clientX, y: event.clientY };
    }
  }

  private handleMouseLeave() {
    this.hoveredPattern = null;
  }
}

const DEFAULT_PATTERN_B64 = "AAAAAA"; // Empty 2x2 pattern
const COLOR_SET = [0, 0, 0, 255]; // Black
const COLOR_UNSET = [255, 255, 255, 255]; // White
export function generatePreviewDataUrl(
  pattern?: string,
  width?: number,
  height?: number,
): string {
  // Calculate canvas size
  const decoder = new PatternDecoder(pattern ?? DEFAULT_PATTERN_B64);
  const scaledWidth = decoder.scaledWidth();
  const scaledHeight = decoder.scaledHeight();

  width =
    width === undefined
      ? scaledWidth
      : Math.max(1, Math.floor(width / scaledWidth)) * scaledWidth;
  height =
    height === undefined
      ? scaledHeight
      : Math.max(1, Math.floor(height / scaledHeight)) * scaledHeight;

  // Create the canvas
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("2D context not supported");

  // Create an image
  const imageData = ctx.createImageData(width, height);
  const data = imageData.data;
  let i = 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const rgba = decoder.isSet(x, y) ? COLOR_SET : COLOR_UNSET;
      data[i++] = rgba[0]; // Red
      data[i++] = rgba[1]; // Green
      data[i++] = rgba[2]; // Blue
      data[i++] = rgba[3]; // Alpha
    }
  }

  // Create a data URL
  ctx.putImageData(imageData, 0, 0);
  return canvas.toDataURL("image/png");
}
