# SoccerMap + Player Reference Notes

Purpose: quick reference for planning/implementation in the physics-based multiplayer soccer mode.

## Key Files
- Soccer scene: `src/game/scenes/SoccerMap.ts`
- Player entity: `src/game/player/player.ts`
- Shared deterministic physics: `src/game/soccer/shared-physics.ts`
- Ball implementation: `src/game/soccer/Ball.ts`
- Multiplayer socket wrapper: `src/game/multiplayer/multiplayer.ts`
- Base scene lifecycle: `src/game/scenes/BaseGameScene.ts`
- Soccer state store: `src/common/store/soccerStore.ts`

Server parity note: `src/game/soccer/shared-physics.ts` is intended to be byte-for-byte identical with the server copy (see header comment). Any divergence causes desync.

## SoccerMap Overview (`src/game/scenes/SoccerMap.ts`)
- Extends `BaseGameScene` and overrides layer/camera/collision setup for the soccer arena.
- World bounds match `PHYSICS_CONSTANTS.WORLD_WIDTH/HEIGHT` (3520x1600).
- Multiplayer mode is enabled when `this.multiplayer` exists. In multiplayer:
  - Starts an input flush timer (8ms) independent from render FPS.
  - Emits ordered `playerInputBatch` packets carrying all fixed-tick local inputs.
  - Listens to authoritative server events for ball state, player physics, teams, skills, and game state.
- Single-player mode uses local physics collisions only (players, ball, floor layer).

### Network Events (client listeners)
- `soccer:getPlayers` (emit, callback): initial team assignment.
- `soccer:requestSkillConfig` (emit, callback): skill config map.
- `ball:state`: server-authoritative ball snapshot.
- `ball:kicked`: play sfx + kick glow for non-local kicker.
- `goal:scored`: resets ball to center and plays cheer.
- `players:physicsUpdate`: authoritative per-player state updates.
  - Local player: `reconcile(...)` with last sequence.
  - Remote player: `pushSnapshot(...)` for interpolation.
- `soccer:playerReset`: teleports player to server-specified pos.
- `soccer:teamAssigned`: updates team, handles pendingTeams queue.
- `soccer:*` selection/game state:
  - `selectionPhaseStarted`, `selectionUpdate`, `skillPicked`, `gameStarted`, `gameEnd`, `gameReset`, `requestGameState`.
- `soccer:skillActivated`, `soccer:skillEnded`, `soccer:skillTriggered`, `soccer:blinkActivated`: apply client visuals and local effects.

### Input Handling
- Keys: `H` kick, `Q` skill, `E` blink, `R` metavision, `T` ninja step, `F` lurking, `G` power shot.
- Multiplayer kick path:
  - Distance check vs ball (140 standard, 200 if metavision).
  - Uses `calculateKickVelocity` for prediction + emits `ball:kick`.
- Dribble emits `ball:dribble` when within 100px and rate-limited (50ms).
- Skill dispatch:
  - Pre-game: per-skill hotkeys.
  - In-game: unified `Q` uses assigned skill from `soccerStore`.

### Visual Effects
- MetaVision: trajectory preview using shared physics (ball drag/bounce).
- Lurking radius: pulsating circle around activator and status coloring based on ball distance.
- Power shot: ball flames + trail + charge ring; buff duration managed by timers.
- Speed trails, grayscale effects, kick glow are controlled by skill visuals.

### Player Setup Differences in SoccerMap
- Local player: scale 2, size 40x40, offset (0,20), speed halved (`moveSpeed *= 0.5`).
- Remote player: scale 2, no name tag, speed increased (`moveSpeed *= 1.5`).
- Team glow updated each frame to match visual sprite state.

## Player Overview (`src/game/player/player.ts`)
- `Player` extends `Phaser.Physics.Arcade.Sprite` but renders a separate `visualSprite`.
  - Physics sprite is invisible (`setAlpha(0)`), used for collisions only.
  - `visualSprite` is smoothed via a visual offset to reduce snap artifacts.
- Tracks local input with sequence numbers for client-side prediction.
- Supports server reconciliation with resimulation using input history.

### Local Player Flow
- Samples keyboard input (WASD + arrows), ignores input if command palette open.
- Uses fixed timestep accumulator (16ms) and records input per tick.
- Soccer map uses deterministic `integratePlayer(...)` with stat multipliers:
  - `speed` => `calculateSpeedMultiplier`.
  - `dribbling` => `calculateDragMultiplier`.
- Non-soccer maps use simple velocity integration (no shared physics).

### Server Reconciliation
- Removes inputs <= `lastServerSequence`.
- Re-simulates from server state with remaining inputs.
- Uses dynamic correction thresholds and sequence-lag-aware blending while moving.
- Uses hard snap only for large divergence.
- Startup grace is short and only to avoid initial move-start pullback.
- Local collision/knockback prediction is enabled to reduce contested-play divergence.

### Remote Player Flow
- Uses snapshot interpolation with low delay (24ms).
- If ahead of latest snapshot, extrapolates up to 24ms.
- Snapshot buffer capped at 20 entries.

### Visuals, Teams, and Status
- Handles ghosting/spectator alpha and tint.
- Team glow sprite (red/blue) is kept in sync with visual sprite.
- Name tag + status bubble rendered in `uiContainer` above player.

## Shared Physics (`src/game/soccer/shared-physics.ts`)
- Deterministic integrations for ball and player.
- Uses exponential drag and clamped max speed.
- World boundary clamping based on radii.
- Defines stat multipliers and `calculateKickVelocity` (used for prediction + server authority).

## Quick “Where to Change What”
- Player feel (speed/drag/accel): `PHYSICS_CONSTANTS` and stat multipliers.
- Net prediction/reconcile: `Player.reconcile`, `Player.updateLocalPlayer`.
- Soccer input cadence: `SoccerMap.startInputFlushLoop`, `SoccerMap.sendPlayerInput`.
- Skill behavior/visuals: `SoccerMap` skill handlers and `soccerStore` state.
- Team visuals: `Player.updateTeamGlow` + `SoccerMap.updateTeamGlows`.

## Cross-Repo Notes (Server)
- Soccer physics must match server copy of `shared-physics`.
- Socket event names and payload shapes are mirrored by the server handlers in `~/projects/workdash-media-server`.

## Client ↔ Server Event Map (Soccer)
Client -> Server emits:
- `playerInputBatch` -> `GameService.handlePlayerInputBatch` -> `SoccerService.updatePlayerInput` (primary path).
- `playerInput` -> `SoccerService.updatePlayerInput` (legacy fallback path).
- `ball:kick` -> `SoccerService.handleBallKick`.
- `ball:dribble` -> `SoccerService.handleBallDribble`.
- `soccer:activateSkill` -> `SoccerService.handleActivateSkill`.
- `soccer:pickSkill` -> `SoccerService.handlePickSkill`.
- `soccer:requestGameState` -> callback with `{ gameStatus, isGameActive, playerPicks }`.
- `soccer:requestSkillConfig` -> callback with skill configs.
- `soccer:getPlayers` -> callback with `{ id, name, team }[]`.
- `soccer:assignTeam` -> `SoccerService.handleTeamAssignment`.
- `soccer:startGame` -> begins selection phase.
- `soccer:resetGame` -> reset to lobby.
- `soccer:randomizeTeams` -> random team assignment.

Server -> Client emits:
- `ball:state` -> `{ x, y, vx, vy, lastTouchId, timestamp, sequence, tick }`.
- `ball:kicked` -> `{ kickerId, sequence, ballX, ballY, vx, vy }`.
- `ball:intercepted` -> `{ playerId, ballX, ballY }`.
- `players:physicsUpdate` -> `{ players: [{ id, x, y, vx, vy, isGhosted, isSpectator, lastSequence }], timestamp }`.
- `goal:scored` -> `{ scoringTeam, goalName, lastTouchId, score }`.
- `soccer:teamAssigned` -> `{ playerId, team, playerName? }`.
- `soccer:playerReset` -> `{ playerId, x, y }`.
- `soccer:selectionPhaseStarted` -> `{ order, availableSkills }`.
- `soccer:selectionUpdate` -> `{ currentPickerId, endTime, availableSkills }`.
- `soccer:skillPicked` -> `{ playerId, skillId, availableSkills }`.
- `soccer:startMidGamePick` -> `{ availableSkills }` (to specific player).
- `soccer:skillActivated` -> `{ activatorId, skillId, affectedPlayers, duration, visualConfig }`.
- `soccer:skillEnded` -> `{ activatorId, skillId }`.
- `soccer:skillTriggered` -> `{ activatorId, skillId, type, targetX, targetY }`.
- `soccer:blinkActivated` -> `{ activatorId, fromX, fromY, toX, toY, visualConfig }`.
- `soccer:gameStarted` -> `{ duration }`.
- `soccer:timerUpdate` -> `{ timeRemaining }`.
- `soccer:overtime` -> `{ message, duration }`.
- `soccer:gameEnd` -> `{ winner, score, mvp, mmrUpdates }`.
- `soccer:gameReset` -> `{ score }`.

Client listeners missing in SoccerMap (server emits but client doesn’t currently handle):
- `ball:intercepted` (server emits for interceptions).
- `soccer:timerUpdate` / `soccer:overtime` (UI timing not wired in `SoccerMap`).
- `soccer:gameEnd` payload contains MVP/MMR; client only toggles state.

### Server-Side Soccer Flow (highlights)
Key files:
- `~/projects/workdash-media-server/src/services/soccer.service.ts`
- `~/projects/workdash-media-server/src/services/game.service.ts`
- `~/projects/workdash-media-server/src/services/shared-physics.ts`
- `~/projects/workdash-media-server/src/services/_enums.ts`

Server loop:
- Physics loop runs with fixed timestep `PHYSICS_CONSTANTS.FIXED_TIMESTEP_MS` using a high-res timer.
- Network broadcasts every `PHYSICS_CONSTANTS.NETWORK_TICK_MS`:
  - `ball:state` payload includes `x, y, vx, vy, lastTouchId, timestamp, sequence, tick`.
  - `players:physicsUpdate` payload includes `id, x, y, vx, vy, isGhosted, isSpectator, lastSequence`.

Kick + dribble validation:
- Kick uses lag compensation (rewinds player + ball to client `timestamp`).
- Kick distance thresholds: 250 normal, 300 if metavision.
- Dribble validated with server positions only; rejects if farther than `MAX_DRIBBLE_DISTANCE` (300).

Skills (server authority):
- Skill ownership enforced in `SKILL_SELECTION` or `ACTIVE`.
- `ninja_step` toggles ghosted state (server broadcasts `soccer:skillActivated`).
- `lurking_radius` is 2-stage: activate radius, then intercept if ball in range.
- `power_shot` auto-aims at opponent goal, applies knockback + temporary kickPower buff.
- Speed debuffs use `isSpeedEffect` and `soccer:skillEnded` cleans up.

Game flow:
- `soccer:startGame` begins selection phase, not active match.
- Selection broadcasts:
  - `soccer:selectionPhaseStarted` `{ order, availableSkills }`
  - `soccer:selectionUpdate` `{ currentPickerId, endTime, availableSkills }`
  - `soccer:skillPicked` `{ playerId, skillId, availableSkills }`
- Active match:
  - `soccer:gameStarted` `{ duration }`
  - `soccer:timerUpdate` `{ timeRemaining }`
  - `soccer:overtime` `{ message, duration }`
  - `soccer:gameEnd` `{ winner, score, mvp, mmrUpdates }`
- Team changes:
  - `soccer:teamAssigned` includes `playerId, team, playerName` (server).
  - `soccer:playerReset` for respawns/goal resets.

GameService wiring:
- `playerInput` feeds `SoccerService.updatePlayerInput` (only SoccerMap).
- Joining SoccerMap loads soccer stats from DB and initializes physics; sends initial `players:physicsUpdate`.

Parity check:
- `~/projects/workdash-media-server/src/services/shared-physics.ts` matches `src/game/soccer/shared-physics.ts` (same constants and functions).
