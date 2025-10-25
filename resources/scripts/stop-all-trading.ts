/**
 * OpenFront user script – Trade embargo HUD.
 *
 * Paste the entire contents of this file into the browser console while you are
 * inside an active match. The script spawns a draggable Heads-Up Display (HUD)
 * with a toggle button that lets you embargo every other player (stop trading)
 * or lift the embargo for everyone (resume trading).
 *
 * Although the file uses a .ts extension for tooling, the snippet is plain
 * JavaScript and runs unmodified in the browser console.
 */
(function createTradeEmbargoHud() {
  const HUD_ID = "openfront-trade-toggle";
  const POSITION_KEY = "openfront-trade-toggle-pos";

  const panel = document.querySelector("player-panel");
  if (!panel || typeof panel.g?.myPlayer !== "function") {
    console.error(
      "[OpenFront] Player panel is not available – join a match before running this script.",
    );
    return;
  }

  const myPlayer = panel.g.myPlayer();
  if (!myPlayer) {
    console.error(
      "[OpenFront] Unable to determine your player – are you connected to a game?",
    );
    return;
  }

  const startHandler = panel.handleEmbargoClick;
  const stopHandler = panel.handleStopEmbargoClick;
  if (typeof startHandler !== "function" || typeof stopHandler !== "function") {
    console.error(
      "[OpenFront] Could not access the embargo handlers; the client build may have changed.",
    );
    return;
  }

  const collectOtherPlayers = () =>
    panel.g
      .players()
      .filter(
        (player) =>
          player &&
          typeof player.id === "function" &&
          player.id() !== myPlayer.id() &&
          (typeof player.isAlive !== "function" || player.isAlive()),
      );

  if (collectOtherPlayers().length === 0) {
    console.log(
      "[OpenFront] No other active players detected – HUD will still be created.",
    );
  }

  const existingHud = document.getElementById(HUD_ID);
  if (existingHud) {
    console.log(
      "[OpenFront] Trade HUD already exists – refreshing its handlers.",
    );
    existingHud.remove();
  }

  const hud = document.createElement("div");
  hud.id = HUD_ID;
  hud.style.position = "fixed";
  hud.style.top = "96px";
  hud.style.left = "24px";
  hud.style.zIndex = "2147483647";
  hud.style.fontFamily =
    "system-ui, -apple-system, BlinkMacSystemFont, sans-serif";
  hud.style.background = "rgba(17, 24, 39, 0.9)";
  hud.style.color = "#f9fafb";
  hud.style.border = "1px solid rgba(249, 250, 251, 0.2)";
  hud.style.borderRadius = "10px";
  hud.style.boxShadow = "0 10px 30px rgba(15, 23, 42, 0.35)";
  hud.style.padding = "12px 16px";
  hud.style.display = "flex";
  hud.style.flexDirection = "column";
  hud.style.gap = "8px";
  hud.style.userSelect = "none";
  hud.style.backdropFilter = "blur(6px)";

  const dragHandle = document.createElement("div");
  dragHandle.textContent = "Trade Control";
  dragHandle.style.fontSize = "13px";
  dragHandle.style.fontWeight = "600";
  dragHandle.style.letterSpacing = "0.05em";
  dragHandle.style.textTransform = "uppercase";
  dragHandle.style.cursor = "grab";
  dragHandle.style.display = "flex";
  dragHandle.style.alignItems = "center";
  dragHandle.style.justifyContent = "space-between";

  const statusLabel = document.createElement("span");
  statusLabel.textContent = "Status: Unknown";
  statusLabel.style.fontSize = "11px";
  statusLabel.style.fontWeight = "500";
  statusLabel.style.color = "rgba(248, 250, 252, 0.75)";
  statusLabel.style.textTransform = "none";
  statusLabel.style.marginTop = "2px";

  const toggleButton = document.createElement("button");
  toggleButton.type = "button";
  toggleButton.textContent = "Embargo Everyone";
  toggleButton.style.fontSize = "13px";
  toggleButton.style.fontWeight = "600";
  toggleButton.style.padding = "8px 12px";
  toggleButton.style.border = "none";
  toggleButton.style.borderRadius = "8px";
  toggleButton.style.cursor = "pointer";
  toggleButton.style.transition = "transform 120ms ease, box-shadow 120ms ease";
  toggleButton.style.background = "linear-gradient(135deg, #f97316, #ea580c)";
  toggleButton.style.color = "white";
  toggleButton.style.boxShadow = "0 6px 18px rgba(249, 115, 22, 0.35)";

  toggleButton.addEventListener("mousedown", () => {
    toggleButton.style.transform = "scale(0.98)";
    toggleButton.style.boxShadow = "0 3px 10px rgba(15, 23, 42, 0.35)";
  });

  const resetButtonStyle = () => {
    toggleButton.style.transform = "scale(1)";
    toggleButton.style.boxShadow = "0 6px 18px rgba(249, 115, 22, 0.35)";
  };

  toggleButton.addEventListener("mouseup", resetButtonStyle);
  toggleButton.addEventListener("mouseleave", resetButtonStyle);

  let embargoActive = false;
  const persistPosition = (left, top) => {
    try {
      localStorage.setItem(POSITION_KEY, JSON.stringify({ left, top }));
    } catch (error) {
      console.debug("[OpenFront] Could not persist HUD position.", error);
    }
  };

  const loadPosition = () => {
    try {
      const stored = localStorage.getItem(POSITION_KEY);
      if (!stored) return null;
      const parsed = JSON.parse(stored);
      if (typeof parsed?.left === "number" && typeof parsed?.top === "number") {
        return parsed;
      }
    } catch (error) {
      console.debug("[OpenFront] Could not load HUD position.", error);
    }
    return null;
  };

  const storedPosition = loadPosition();
  if (storedPosition) {
    hud.style.left = `${storedPosition.left}px`;
    hud.style.top = `${storedPosition.top}px`;
  }

  const applyEmbargoAction = (action) => {
    const targets = collectOtherPlayers();
    if (targets.length === 0) {
      console.warn("[OpenFront] No eligible players to update.");
      return 0;
    }
    const handler = action === "start" ? startHandler : stopHandler;
    let affected = 0;
    for (const other of targets) {
      try {
        const fakeEvent = new Event("click");
        handler.call(panel, fakeEvent, myPlayer, other);
        affected += 1;
      } catch (error) {
        console.error(
          `[OpenFront] Failed to ${action === "start" ? "start" : "stop"} an embargo for a player.`,
          error,
        );
      }
    }
    if (affected > 0) {
      console.log(
        `%c[OpenFront]%c ${
          action === "start"
            ? "Requested embargo on"
            : "Requested embargo removal for"
        } ${affected} player${affected === 1 ? "" : "s"}.`,
        "color: #f59e0b; font-weight: bold;",
        "color: inherit;",
      );
    }
    return affected;
  };

  const updateUi = () => {
    if (embargoActive) {
      toggleButton.textContent = "Allow Trading";
      toggleButton.style.background =
        "linear-gradient(135deg, #10b981, #059669)";
      toggleButton.style.boxShadow = "0 6px 18px rgba(16, 185, 129, 0.35)";
      statusLabel.textContent = "Status: Embargo enabled";
    } else {
      toggleButton.textContent = "Embargo Everyone";
      toggleButton.style.background =
        "linear-gradient(135deg, #f97316, #ea580c)";
      toggleButton.style.boxShadow = "0 6px 18px rgba(249, 115, 22, 0.35)";
      statusLabel.textContent = "Status: Trading allowed";
    }
  };

  toggleButton.addEventListener("click", () => {
    const nextState = !embargoActive;
    const action = nextState ? "start" : "stop";
    const affected = applyEmbargoAction(action);
    if (affected === 0) return;
    embargoActive = nextState;
    updateUi();
  });

  let dragOffsetX = 0;
  let dragOffsetY = 0;
  let isDragging = false;

  const onMouseMove = (event) => {
    if (!isDragging) return;
    event.preventDefault();
    const newLeft = event.clientX - dragOffsetX;
    const newTop = event.clientY - dragOffsetY;
    hud.style.left = `${newLeft}px`;
    hud.style.top = `${newTop}px`;
  };

  const onMouseUp = (event) => {
    if (!isDragging) return;
    event.preventDefault();
    isDragging = false;
    dragHandle.style.cursor = "grab";
    document.removeEventListener("mousemove", onMouseMove);
    document.removeEventListener("mouseup", onMouseUp);
    const left = parseInt(hud.style.left, 10);
    const top = parseInt(hud.style.top, 10);
    if (!Number.isNaN(left) && !Number.isNaN(top)) {
      persistPosition(left, top);
    }
  };

  dragHandle.addEventListener("mousedown", (event) => {
    event.preventDefault();
    isDragging = true;
    dragHandle.style.cursor = "grabbing";
    const rect = hud.getBoundingClientRect();
    dragOffsetX = event.clientX - rect.left;
    dragOffsetY = event.clientY - rect.top;
    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
  });

  const closeButton = document.createElement("button");
  closeButton.type = "button";
  closeButton.textContent = "×";
  closeButton.style.marginLeft = "8px";
  closeButton.style.background = "transparent";
  closeButton.style.border = "none";
  closeButton.style.color = "rgba(248, 250, 252, 0.6)";
  closeButton.style.fontSize = "16px";
  closeButton.style.cursor = "pointer";
  closeButton.style.padding = "0";
  closeButton.style.lineHeight = "1";

  closeButton.addEventListener("click", () => {
    hud.remove();
    console.log("[OpenFront] Trade HUD removed.");
  });

  dragHandle.appendChild(closeButton);
  hud.appendChild(dragHandle);
  hud.appendChild(toggleButton);
  hud.appendChild(statusLabel);
  document.body.appendChild(hud);

  updateUi();

  console.log(
    "[OpenFront] Trade HUD ready – drag to reposition or use the toggle button.",
  );
})();


(function() {
    'use strict';

    // Inject CSS for the progress bar
    const style = document.createElement('style');
    style.textContent = `
        /* Progress bar styles */
        #troop-progress-bar {
            width: 100%;
            height: 8px;
            background: rgba(255, 255, 255, 0.2);
            border-radius: 4px;
            margin-top: 8px;
            margin-bottom: 16px;
            position: relative;
            overflow: visible;
        }

        #troop-progress-fill {
            height: 100%;
            background: linear-gradient(90deg, #4CAF50, #8BC34A);
            border-radius: 4px;
            transition: width 0.3s ease;
        }

        .tier-marker {
            position: absolute;
            top: -2px;
            width: 2px;
            height: 12px;
            background: rgba(255, 255, 255, 0.6);
        }

        .tier-range {
            position: absolute;
            top: -6px;
            height: 20px;
            border-left: 2px solid rgba(255, 255, 255, 0.6);
            border-right: 2px solid rgba(255, 255, 255, 0.6);
            border-top: 2px solid rgba(255, 255, 255, 0.6);
            pointer-events: none;
        }

        .tier-range-label {
            position: absolute;
            top: -24px;
            left: 50%;
            transform: translateX(-50%);
            font-size: 10px;
            color: rgba(255, 255, 255, 0.9);
            white-space: nowrap;
            font-weight: bold;
        }

        /* Add space for the progress bar below troops */
        .troop-line-with-progress {
            margin-bottom: 40px !important;
        }

        /* Keep the "Troops:" label visible */
        .troop-line-with-progress .font-bold {
            display: inline !important;
        }
    `;

    document.head.appendChild(style);

    // Calculate troop regen rate (same formula as regen calculator)
    function calculateTroopIncreaseRate(currentTroops, maxTroops) {
        let toAdd = 10 + Math.pow(currentTroops, 0.73) / 4;
        const ratio = 1 - currentTroops / maxTroops;
        toAdd *= ratio;
        return Math.min(currentTroops + toAdd, maxTroops) - currentTroops;
    }

    // Find optimal troop count for max regen
    function findOptimalTroops(maxTroops) {
        let maxRegen = 0;
        let optimalTroops = 0;

        for (let troops = 0; troops <= maxTroops; troops += Math.max(1, Math.floor(maxTroops / 1000))) {
            const regen = calculateTroopIncreaseRate(troops, maxTroops);
            if (regen > maxRegen) {
                maxRegen = regen;
                optimalTroops = troops;
            }
        }

        return { maxRegen, optimalTroops };
    }

    // Find the troop count range for a specific regen percentage on one side of optimal
    function findRegenTierRangeOneSide(maxTroops, maxRegen, optimalTroops, minPercent, maxPercent, beforeOptimal) {
        let rangeStart = maxTroops;
        let rangeEnd = 0;

        const searchStart = beforeOptimal ? 0 : optimalTroops;
        const searchEnd = beforeOptimal ? optimalTroops : maxTroops;

        for (let troops = searchStart; troops <= searchEnd; troops += Math.max(1, Math.floor(maxTroops / 1000))) {
            const regen = calculateTroopIncreaseRate(troops, maxTroops);
            const regenPercent = regen / maxRegen;

            if (regenPercent >= minPercent && regenPercent <= maxPercent) {
                rangeStart = Math.min(rangeStart, troops);
                rangeEnd = Math.max(rangeEnd, troops);
            }
        }

        // Return null if no valid range found
        if (rangeStart > rangeEnd) {
            return null;
        }

        return { rangeStart, rangeEnd };
    }

    // Function to parse troop numbers and add progress bar
    function addProgressBar(troopsLine, parentContainer) {
        try {
            // Check if progress bar already exists
            const existingBar = parentContainer.querySelector('#troop-progress-bar');
            if (existingBar) {
                // Update existing progress bar
                const text = troopsLine.textContent;
                const match = text.match(/([\d.]+)([KM])?\s*\/\s*([\d.]+)([KM])?/);

                if (!match) return;

                let current = parseFloat(match[1]);
                let max = parseFloat(match[3]);

                // Convert K (thousands) or M (millions) to actual numbers
                const currentUnit = match[2];
                const maxUnit = match[4];

                if (currentUnit === 'K') current *= 1000;
                else if (currentUnit === 'M') current *= 1000000;

                if (maxUnit === 'K') max *= 1000;
                else if (maxUnit === 'M') max *= 1000000;

                const percentage = (current / max) * 100;
                const progressFill = existingBar.querySelector('#troop-progress-fill');
                if (progressFill) {
                    progressFill.style.width = percentage + '%';
                }
                return;
            }

            // Parse current and max troops from the text
            const text = troopsLine.textContent;
            const match = text.match(/([\d.]+)([KM])?\s*\/\s*([\d.]+)([KM])?/);

            if (!match) return;

            let current = parseFloat(match[1]);
            let max = parseFloat(match[3]);

            // Convert K (thousands) or M (millions) to actual numbers
            const currentUnit = match[2];
            const maxUnit = match[4];

            if (currentUnit === 'K') current *= 1000;
            else if (currentUnit === 'M') current *= 1000000;

            if (maxUnit === 'K') max *= 1000;
            else if (maxUnit === 'M') max *= 1000000;

            const percentage = (current / max) * 100;

            // Calculate optimal regen using same logic as regen calculator
            const { maxRegen, optimalTroops } = findOptimalTroops(max);

            // Define tier ranges based on regen percentage (same as regen calculator)
            // S: 90%+, A: 75-90%, B: 60-75%, C: 40-60%, D: <40%
            const tierDefinitions = [
                { tier: 'S', min: 0.9, max: 1.0, color: '#FFD700' },
                { tier: 'A', min: 0.75, max: 0.9, color: '#90EE90' },
                { tier: 'B', min: 0.6, max: 0.75, color: '#87CEEB' },
                { tier: 'C', min: 0.4, max: 0.6, color: '#FFA500' },
                { tier: 'D', min: 0, max: 0.4, color: '#FF6B6B' }
            ];

            // Create progress bar container
            const progressBar = document.createElement('div');
            progressBar.id = 'troop-progress-bar';

            const progressFill = document.createElement('div');
            progressFill.id = 'troop-progress-fill';
            progressFill.style.width = percentage + '%';

            // Add tier range brackets - show ranges on both sides of optimal
            tierDefinitions.forEach(({ tier, min, max: maxPercent, color }) => {
                // Before optimal (approaching S-tier) - show as +
                const beforeRange = findRegenTierRangeOneSide(max, maxRegen, optimalTroops, min, maxPercent, true);
                if (beforeRange && beforeRange.rangeStart < beforeRange.rangeEnd) {
                    const startPos = (beforeRange.rangeStart / max) * 100;
                    const endPos = (beforeRange.rangeEnd / max) * 100;
                    const width = endPos - startPos;

                    const rangeEl = document.createElement('div');
                    rangeEl.className = 'tier-range';
                    rangeEl.style.left = startPos + '%';
                    rangeEl.style.width = width + '%';

                    const labelEl = document.createElement('div');
                    labelEl.className = 'tier-range-label';
                    labelEl.textContent = tier + '+';
                    labelEl.style.color = color;

                    rangeEl.appendChild(labelEl);
                    progressBar.appendChild(rangeEl);
                }

                // After optimal (moving away from S-tier) - show as -
                const afterRange = findRegenTierRangeOneSide(max, maxRegen, optimalTroops, min, maxPercent, false);
                if (afterRange && afterRange.rangeStart < afterRange.rangeEnd) {
                    const startPos = (afterRange.rangeStart / max) * 100;
                    const endPos = (afterRange.rangeEnd / max) * 100;
                    const width = endPos - startPos;

                    const rangeEl = document.createElement('div');
                    rangeEl.className = 'tier-range';
                    rangeEl.style.left = startPos + '%';
                    rangeEl.style.width = width + '%';

                    const labelEl = document.createElement('div');
                    labelEl.className = 'tier-range-label';
                    labelEl.textContent = tier + '-';
                    labelEl.style.color = color;

                    rangeEl.appendChild(labelEl);
                    progressBar.appendChild(rangeEl);
                }
            });

            progressBar.appendChild(progressFill);

            // Add the progress bar after the troops line (as a sibling, not child)
            troopsLine.classList.add('troop-line-with-progress');
            troopsLine.parentElement.insertBefore(progressBar, troopsLine.nextSibling);

        } catch (e) {
        }
    }

    // Function to find and enhance the troops line
    function enhanceTroopsDisplay() {
        const controlPanel = document.querySelector('control-panel');
        if (!controlPanel) return;

        // Find the troops/gold info block
        const infoBlock = Array.from(controlPanel.querySelectorAll('div')).find(div => {
            return div.className.includes('bg-black') && div.textContent.includes('Troops');
        });

        if (!infoBlock) {
            return;
        }

        // Find the troops line
        const allFlexDivs = Array.from(infoBlock.querySelectorAll('.flex.justify-between, [class*="flex"][class*="justify-between"]'));
        const troopsLine = allFlexDivs.find(div => div.textContent.includes('Troops:'));

        if (!troopsLine) {
            return;
        }

        // Add or update the progress bar
        addProgressBar(troopsLine, infoBlock);
    }

    // Wait for the control panel
    function setup() {
        const controlPanel = document.querySelector('control-panel');

        if (controlPanel) {
            enhanceTroopsDisplay();
        } else {
            setTimeout(setup, 500);
        }
    }

    // Start the setup
    setup();

    // Keep updating the display as data changes
    setInterval(enhanceTroopsDisplay, 1000);

    // Also observe DOM changes
    const observer = new MutationObserver(() => {
        enhanceTroopsDisplay();
    });

    setTimeout(() => {
        const controlPanel = document.querySelector('control-panel');
        if (controlPanel) {
            observer.observe(controlPanel, {
                childList: true,
                subtree: true,
                characterData: true
            });
        }
    }, 1000);

    console.log('[OpenFront - Tier Ranges] - Active!');
})();
