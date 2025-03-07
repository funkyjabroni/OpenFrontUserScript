import { LitElement, html, css } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { Difficulty, GameMapType, GameType } from "../core/game/Game";
import { GameConfig, GameInfo } from "../core/Schemas";
import { consolex } from "../core/Consolex";
import "./components/Difficulties";
import { DifficultyDescription } from "./components/Difficulties";
import "./components/Maps";
import randomMap from "../../resources/images/RandomMap.png";
import { generateID } from "../core/Util";
import {
  getConfig,
  getServerConfigFromClient,
} from "../core/configuration/Config";

@customElement("host-lobby-modal")
export class HostLobbyModal extends LitElement {
  @state() private isModalOpen = false;
  @state() private selectedMap: GameMapType = GameMapType.World;
  @state() private selectedDifficulty: Difficulty = Difficulty.Medium;
  @state() private disableNPCs = false;
  @state() private bots: number = 400;
  @state() private infiniteGold: boolean = false;
  @state() private infiniteTroops: boolean = false;
  @state() private instantBuild: boolean = false;
  @state() private lobbyId = "";
  @state() private copySuccess = false;
  @state() private players: string[] = [];
  @state() private useRandomMap: boolean = false;

  private playersInterval = null;
  // Add a new timer for debouncing bot changes
  private botsUpdateTimer: number | null = null;

  static styles = css`
    .modal-overlay {
      display: none;
      position: fixed;
      z-index: 1000;
      left: 0;
      top: 0;
      width: 100%;
      height: 100%;
      background-color: rgba(0, 0, 0, 0.5);
      overflow-y: auto;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .modal-content {
      background-color: rgb(35 35 35 / 0.8);
      -webkit-backdrop-filter: blur(12px);
      backdrop-filter: blur(12px);
      color: white;
      padding: 20px;
      border-radius: 8px;
      width: 80%;
      max-width: 1280px;
      max-height: 80vh;
      overflow-y: auto;
      text-align: center;
      box-shadow: 0 0 40px rgba(0, 0, 0, 0.5);
      border: 1px solid rgba(255, 255, 255, 0.2);
      backdrop-filter: blur(8px);
      position: relative;
    }

    /* Add custom scrollbar styles */
    .modal-content::-webkit-scrollbar {
      width: 8px;
    }

    .modal-content::-webkit-scrollbar-track {
      background: rgba(0, 0, 0, 0.1);
      border-radius: 4px;
    }

    .modal-content::-webkit-scrollbar-thumb {
      background: rgba(255, 255, 255, 0.2);
      border-radius: 4px;
    }

    .modal-content::-webkit-scrollbar-thumb:hover {
      background: rgba(255, 255, 255, 0.3);
    }

    .title {
      font-size: 28px;
      color: #fff;
      font-weight: 600;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 0 0 0 20px;
    }

    .close {
      position: sticky;
      top: 0px;
      right: 0px;
      color: #aaa;
      float: right;
      font-size: 28px;
      font-weight: bold;
      cursor: pointer;
    }

    .close:hover,
    .close:focus {
      color: white;
      text-decoration: none;
      cursor: pointer;
    }

    .start-game-button {
      width: 100%;
      max-width: 300px;
      padding: 15px 20px;
      font-size: 16px;
      cursor: pointer;
      background-color: #007bff;
      color: white;
      border: none;
      border-radius: 8px;
      transition: background-color 0.3s;
      display: inline-block;
      margin: 0 0 20px 0;
    }

    .start-game-button:not(:disabled):hover {
      background-color: #0056b3;
    }

    .start-game-button:disabled {
      background: linear-gradient(to right, #4a4a4a, #3d3d3d);
      opacity: 0.7;
      cursor: not-allowed;
    }

    .options-layout {
      display: grid;
      grid-template-columns: 1fr;
      gap: 24px;
      margin: 24px 0;
    }

    .options-section {
      background: rgba(0, 0, 0, 0.2);
      padding: 12px 24px 24px 24px;
      border-radius: 12px;
    }

    .option-title {
      margin: 0 0 16px 0;
      font-size: 20px;
      color: #fff;
      text-align: center;
    }

    .option-cards {
      display: flex;
      flex-direction: row;
      flex-wrap: wrap;
      justify-content: center;
      gap: 16px;
    }

    .option-card {
      width: 100%;
      min-width: 100px;
      max-width: 120px;
      padding: 4px 4px 0 4px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: space-between;
      background: rgba(30, 30, 30, 0.95);
      border: 2px solid rgba(255, 255, 255, 0.1);
      border-radius: 12px;
      cursor: pointer;
      transition: all 0.2s ease-in-out;
    }

    .option-card:hover {
      transform: translateY(-2px);
      border-color: rgba(255, 255, 255, 0.3);
      background: rgba(40, 40, 40, 0.95);
    }

    .option-card.selected {
      border-color: #4a9eff;
      background: rgba(74, 158, 255, 0.1);
    }

    .option-card-title {
      font-size: 14px;
      color: #aaa;
      text-align: center;
      margin: 0 0 4px 0;
    }

    .option-image {
      width: 100%;
      aspect-ratio: 4/2;
      color: #aaa;
      transition: transform 0.2s ease-in-out;
      border-radius: 8px;
      background-color: rgba(255, 255, 255, 0.1);
      font-size: 14px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .option-card input[type="checkbox"] {
      display: none;
    }

    label.option-card:hover {
      transform: none;
    }

    .checkbox-icon {
      width: 16px;
      height: 16px;
      border: 2px solid #aaa;
      border-radius: 6px;
      margin: 4px;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s ease-in-out;
    }

    .option-card.selected .checkbox-icon {
      border-color: #4a9eff;
      background: #4a9eff;
    }

    .option-card.selected .checkbox-icon::after {
      content: "✓";
      color: white;
    }
    /* HostLobbyModal css */
    .clipboard-icon {
      display: flex;
      align-items: center;
      justify-content: center;
      color: #fff;
    }

    .copy-success {
      position: relative;
      transform: translateY(-10px);
      color: green;
      font-size: 14px;
      margin-top: 5px;
    }

    .copy-success-icon {
      width: 18px;
      height: 18px;
      color: #4caf50;
    }

    .lobby-id-box {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 10px;
      margin: 8px 0px 0px 0px;
    }

    .lobby-id-button {
      display: flex;
      align-items: center;
      gap: 8px;
      background: rgba(0, 0, 0, 0.2);
      padding: 8px 16px;
      border-radius: 6px;
      border: 1px solid rgba(255, 255, 255, 0.1);
      cursor: pointer;
      transition: all 0.2s ease-in-out;
    }

    .lobby-id-button:hover {
      background: rgba(0, 0, 0, 0.3);
      border-color: rgba(255, 255, 255, 0.2);
      transform: translateY(-1px);
    }

    .lobby-id {
      font-size: 14px;
      color: #fff;
      text-align: center;
    }

    .players-list {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      justify-content: center;
      padding: 0 16px;
    }

    .player-tag {
      display: flex;
      align-items: center;
      justify-content: center;
      background: rgba(255, 255, 255, 0.1);
      padding: 4px 16px;
      border-radius: 16px;
      font-size: 14px;
      color: #fff;
      border: 1px solid rgba(255, 255, 255, 0.2);
    }

    #bots-count {
      width: 80%;
    }

    @media screen and (max-width: 768px) {
      .modal-content {
        max-height: calc(90vh - 42px);
        max-width: 100vw;
        width: 100%;
      }
  `;

  render() {
    return html`
      <div
        class="modal-overlay"
        style="display: ${this.isModalOpen ? "flex" : "none"}"
      >
        <div
          style="position: absolute; left: 0px; top: 0px; width: 100%; height: 100%;"
          class="${this.isModalOpen ? "" : "hidden"}"
          @click=${this.close}
        ></div>
        <div class="modal-content">
          <span class="close" @click=${this.close}>&times;</span>

          <div class="title">Private Lobby</div>
          <div class="lobby-id-box">
            <button
              class="lobby-id-button"
              @click=${this.copyToClipboard}
              ?disabled=${this.copySuccess}
            >
              <span class="lobby-id">${this.lobbyId}</span>
              ${this.copySuccess
                ? html`<span class="copy-success-icon">✓</span>`
                : html`
                    <svg
                      class="clipboard-icon"
                      stroke="currentColor"
                      fill="currentColor"
                      stroke-width="0"
                      viewBox="0 0 512 512"
                      height="18px"
                      width="18px"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M296 48H176.5C154.4 48 136 65.4 136 87.5V96h-7.5C106.4 96 88 113.4 88 135.5v288c0 22.1 18.4 40.5 40.5 40.5h208c22.1 0 39.5-18.4 39.5-40.5V416h8.5c22.1 0 39.5-18.4 39.5-40.5V176L296 48zm0 44.6l83.4 83.4H296V92.6zm48 330.9c0 4.7-3.4 8.5-7.5 8.5h-208c-4.4 0-8.5-4.1-8.5-8.5v-288c0-4.1 3.8-7.5 8.5-7.5h7.5v255.5c0 22.1 10.4 32.5 32.5 32.5H344v7.5zm48-48c0 4.7-3.4 8.5-7.5 8.5h-208c-4.4 0-8.5-4.1-8.5-8.5v-288c0-4.1 3.8-7.5 8.5-7.5H264v128h128v167.5z"
                      ></path>
                    </svg>
                  `}
            </button>
          </div>

          <div class="options-layout">
            <!-- Map Selection -->
            <div class="options-section">
              <div class="option-title">Map</div>
              <div class="option-cards">
                ${Object.entries(GameMapType)
                  .filter(([key]) => isNaN(Number(key)))
                  .map(
                    ([key, value]) => html`
                      <div @click=${() => this.handleMapSelection(value)}>
                        <map-display
                          .mapKey=${key}
                          .selected=${!this.useRandomMap &&
                          this.selectedMap === value}
                        ></map-display>
                      </div>
                    `,
                  )}
                <div
                  class="option-card random-map ${this.useRandomMap
                    ? "selected"
                    : ""}"
                  @click=${this.handleRandomMapToggle}
                >
                  <div class="option-image">
                    <img
                      src=${randomMap}
                      alt="Random Map"
                      style="width:100%; aspect-ratio: 4/2; object-fit:cover; border-radius:8px;"
                    />
                  </div>
                  <div class="option-card-title">Random</div>
                </div>
              </div>
            </div>

            <!-- Difficulty Selection -->
            <div class="options-section">
              <div class="option-title">Difficulty</div>
              <div class="option-cards">
                ${Object.entries(Difficulty)
                  .filter(([key]) => isNaN(Number(key)))
                  .map(
                    ([key, value]) => html`
                      <div
                        class="option-card ${this.selectedDifficulty === value
                          ? "selected"
                          : ""}"
                        @click=${() => this.handleDifficultySelection(value)}
                      >
                        <difficulty-display
                          .difficultyKey=${key}
                        ></difficulty-display>
                        <p class="option-card-title">
                          ${DifficultyDescription[key]}
                        </p>
                      </div>
                    `,
                  )}
              </div>
            </div>

            <!-- Game Options -->
            <div class="options-section">
              <div class="option-title">Options</div>
              <div class="option-cards">
                <label for="bots-count" class="option-card">
                  <input
                    type="range"
                    id="bots-count"
                    min="0"
                    max="400"
                    step="1"
                    @input=${this.handleBotsChange}
                    @change=${this.handleBotsChange}
                    .value="${String(this.bots)}"
                  />
                  <div class="option-card-title">
                    Bots: ${this.bots == 0 ? "Disabled" : this.bots}
                  </div>
                </label>

                <label
                  for="disable-npcs"
                  class="option-card ${this.disableNPCs ? "selected" : ""}"
                >
                  <div class="checkbox-icon"></div>
                  <input
                    type="checkbox"
                    id="disable-npcs"
                    @change=${this.handleDisableNPCsChange}
                    .checked=${this.disableNPCs}
                  />
                  <div class="option-card-title">Disable Nations</div>
                </label>

                <label
                  for="instant-build"
                  class="option-card ${this.instantBuild ? "selected" : ""}"
                >
                  <div class="checkbox-icon"></div>
                  <input
                    type="checkbox"
                    id="instant-build"
                    @change=${this.handleInstantBuildChange}
                    .checked=${this.instantBuild}
                  />
                  <div class="option-card-title">Instant build</div>
                </label>

                <label
                  for="infinite-gold"
                  class="option-card ${this.infiniteGold ? "selected" : ""}"
                >
                  <div class="checkbox-icon"></div>
                  <input
                    type="checkbox"
                    id="infinite-gold"
                    @change=${this.handleInfiniteGoldChange}
                    .checked=${this.infiniteGold}
                  />
                  <div class="option-card-title">Infinite gold</div>
                </label>

                <label
                  for="infinite-troops"
                  class="option-card ${this.infiniteTroops ? "selected" : ""}"
                >
                  <div class="checkbox-icon"></div>
                  <input
                    type="checkbox"
                    id="infinite-troops"
                    @change=${this.handleInfiniteTroopsChange}
                    .checked=${this.infiniteTroops}
                  />
                  <div class="option-card-title">Infinite troops</div>
                </label>
              </div>
            </div>

            <!-- Lobby Selection -->
            <div class="options-section">
              <div class="option-title">
                ${this.players.length}
                ${this.players.length === 1 ? "Player" : "Players"}
              </div>

              <div class="players-list">
                ${this.players.map(
                  (player) => html`<span class="player-tag">${player}</span>`,
                )}
              </div>
            </div>
          </div>
          <button
            @click=${this.startGame}
            ?disabled=${this.players.length < 2}
            class="start-game-button"
          >
            ${this.players.length === 1
              ? "Waiting for players..."
              : "Start Game"}
          </button>
        </div>
      </div>
    `;
  }

  public open() {
    createLobby()
      .then((lobby) => {
        this.lobbyId = lobby.gameID;
        // join lobby
      })
      .then(() => {
        this.dispatchEvent(
          new CustomEvent("join-lobby", {
            detail: {
              gameType: GameType.Private,
              lobby: {
                gameID: this.lobbyId,
              },
              map: this.selectedMap,
              difficulty: this.selectedDifficulty,
              disableNPCs: this.disableNPCs,
              bots: this.bots,
              infiniteGold: this.infiniteGold,
              infiniteTroops: this.infiniteTroops,
              instantBuild: this.instantBuild,
            },
            bubbles: true,
            composed: true,
          }),
        );
      });
    this.isModalOpen = true;
    this.playersInterval = setInterval(() => this.pollPlayers(), 1000);
  }

  public close() {
    this.isModalOpen = false;
    this.copySuccess = false;
    if (this.playersInterval) {
      clearInterval(this.playersInterval);
      this.playersInterval = null;
    }
    // Clear any pending bot updates
    if (this.botsUpdateTimer !== null) {
      clearTimeout(this.botsUpdateTimer);
      this.botsUpdateTimer = null;
    }
  }

  private async handleRandomMapToggle() {
    this.useRandomMap = true;
    this.putGameConfig();
  }

  private async handleMapSelection(value: GameMapType) {
    this.selectedMap = value;
    this.useRandomMap = false;
    this.putGameConfig();
  }
  private async handleDifficultySelection(value: Difficulty) {
    this.selectedDifficulty = value;
    this.putGameConfig();
  }

  // Modified to include debouncing
  private handleBotsChange(e: Event) {
    const value = parseInt((e.target as HTMLInputElement).value);
    if (isNaN(value) || value < 0 || value > 400) {
      return;
    }

    // Update the display value immediately
    this.bots = value;

    // Clear any existing timer
    if (this.botsUpdateTimer !== null) {
      clearTimeout(this.botsUpdateTimer);
    }

    // Set a new timer to call putGameConfig after 300ms of inactivity
    this.botsUpdateTimer = window.setTimeout(() => {
      this.putGameConfig();
      this.botsUpdateTimer = null;
    }, 300);
  }

  private handleInstantBuildChange(e: Event) {
    this.instantBuild = Boolean((e.target as HTMLInputElement).checked);
    this.putGameConfig();
  }
  private handleInfiniteGoldChange(e: Event) {
    this.infiniteGold = Boolean((e.target as HTMLInputElement).checked);
    this.putGameConfig();
  }
  private handleInfiniteTroopsChange(e: Event) {
    this.infiniteTroops = Boolean((e.target as HTMLInputElement).checked);
    this.putGameConfig();
  }

  private async handleDisableNPCsChange(e: Event) {
    this.disableNPCs = Boolean((e.target as HTMLInputElement).checked);
    consolex.log(`updating disable npcs to ${this.disableNPCs}`);
    this.putGameConfig();
  }

  private async putGameConfig() {
    const config = await getServerConfigFromClient();
    const response = await fetch(
      `${window.location.origin}/${config.workerPath(this.lobbyId)}/api/game/${this.lobbyId}`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          gameMap: this.selectedMap,
          difficulty: this.selectedDifficulty,
          disableNPCs: this.disableNPCs,
          bots: this.bots,
          infiniteGold: this.infiniteGold,
          infiniteTroops: this.infiniteTroops,
          instantBuild: this.instantBuild,
        } as GameConfig),
      },
    );
  }

  private getRandomMap(): GameMapType {
    const maps = Object.values(GameMapType);
    const randIdx = Math.floor(Math.random() * maps.length);
    return maps[randIdx] as GameMapType;
  }

  private async startGame() {
    if (this.useRandomMap) {
      this.selectedMap = this.getRandomMap();
    }

    await this.putGameConfig();
    consolex.log(
      `Starting private game with map: ${GameMapType[this.selectedMap]} ${this.useRandomMap ? " (Randomly selected)" : ""}`,
    );
    this.close();
    const config = await getServerConfigFromClient();
    const response = await fetch(
      `${window.location.origin}/${config.workerPath(this.lobbyId)}/api/start_game/${this.lobbyId}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      },
    );
  }

  private async copyToClipboard() {
    try {
      //TODO: Convert id to url and copy
      await navigator.clipboard.writeText(
        `${location.origin}/join/${this.lobbyId}`,
      );
      this.copySuccess = true;
      setTimeout(() => {
        this.copySuccess = false;
      }, 2000);
    } catch (err) {
      consolex.error(`Failed to copy text: ${err}`);
    }
  }

  private async pollPlayers() {
    const config = await getServerConfigFromClient();
    fetch(`/${config.workerPath(this.lobbyId)}/api/game/${this.lobbyId}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    })
      .then((response) => response.json())
      .then((data: GameInfo) => {
        console.log(`got response: ${data}`);
        this.players = data.clients.map((p) => p.username);
      });
  }
}

async function createLobby(): Promise<GameInfo> {
  const config = await getServerConfigFromClient();
  try {
    const id = generateID();
    const response = await fetch(
      `/${config.workerPath(id)}/api/create_game/${id}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        // body: JSON.stringify(data), // Include this if you need to send data
      },
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    consolex.log("Success:", data);

    return data as GameInfo;
  } catch (error) {
    consolex.error("Error creating lobby:", error);
    throw error; // Re-throw the error so the caller can handle it
  }
}
