/**
 * main.js – Application controller for HW05 Bowling Alley (Three.js / WebGL).
 *
 * Responsibilities:
 *   - Bootstrap Three.js engine: Renderer, Scene, Camera, Lights.
 *   - Instantiate all scene components and add them to the scene graph.
 *   - Register global event handlers: window resize, keyboard shortcuts.
 *   - Run the main animation / render loop.
 *
 * Scene components (each encapsulates its own geometry/material):
 *   BowlingLane    – full lane infrastructure (surfaces, gutters, markings).
 *   HangingSign    – neon canvas sign with metal support pillars and beam.
 *   PinFormation   – 10 bowling pins in the standard triangular layout.
 *   BowlingBall    – static ball positioned on the approach.
 *   ScorecardUI    – DOM overlay scorecard and keyboard controls panel.
 *
 * Keyboard shortcuts:
 *   O – toggle OrbitControls on / off.
 *   C – snap camera to a frontal view centred on the neon sign.
 */

import { OrbitControls } from '../src/OrbitControls.js';
import BowlingLane       from './components/BowlingLane.js';
import HangingSign       from './components/HangingSign.js';
import PinFormation      from './components/PinFormation.js';
import BowlingBall       from './components/BowlingBall.js';
import ScorecardUI       from './components/ScorecardUI.js';

const clock = new THREE.Clock();

// ── Camera view state ─────────────────────────────────────────────────────────
let isCustomViewActive  = false;        // tracks whether C-key front view is on
let savedCameraPos      = new THREE.Vector3();
let savedControlsTarget = new THREE.Vector3();

const gameState = {
  phase:              'aiming',
  currentFrame:       1,
  currentRoll:        1,
  powerValue:         0,
  powerDirection:     1,
  ballSpeedFactor:    35,
  ballVelocity:       new THREE.Vector3(0, 0, 0),
  scores:             Array.from({ length: 10 }, () => []),
  cumulativeTotals:   Array(10).fill(null),
  pinsStanding:       Array(10).fill(true),  // true = upright, false = knocked down
  pinsFallenThisRoll: 0
};

// ── Renderer ──────────────────────────────────────────────────────────────────
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
document.body.appendChild(renderer.domElement);

// ── Scene ─────────────────────────────────────────────────────────────────────
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x1a1a2e);   /* deep navy background */

// ── Camera ────────────────────────────────────────────────────────────────────
const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
/* Default bowler's-eye starting position – moved back to comfortably frame the ball and approach area */
camera.position.set(0, 5, 18.0);

// ── Lights ────────────────────────────────────────────────────────────────────
const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);

/*
 * Primary directional light with shadow mapping.
 * Shadow frustum is tuned tightly around the lane extents to maximise
 * shadow-map resolution (2048 × 2048 px).
 */
const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
directionalLight.position.set(5, 25, 20);
directionalLight.target.position.set(0, 0, -25);
directionalLight.castShadow                   = true;
directionalLight.shadow.camera.left           = -6;
directionalLight.shadow.camera.right          =  5;
directionalLight.shadow.camera.top            =  30;
directionalLight.shadow.camera.bottom         = -30;
directionalLight.shadow.camera.near           =  0.5;
directionalLight.shadow.camera.far            =  120;
directionalLight.shadow.mapSize.width         = 2048;
directionalLight.shadow.mapSize.height        = 2048;
scene.add(directionalLight);
scene.add(directionalLight.target);

// ── Back wall ─────────────────────────────────────────────────────────────────
/* Simple dark plane behind the pin deck, closing the visual space of the alley. */
const backWall = new THREE.Mesh(
  new THREE.PlaneGeometry(5.5, 4.0),
  new THREE.MeshPhongMaterial({
    color:     0x11161f,
    shininess: 8,
    side:      THREE.DoubleSide
  })
);
backWall.position.set(0, 2.0, -60);
backWall.receiveShadow = true;
scene.add(backWall);

// ── Scene components ──────────────────────────────────────────────────────────

/* BowlingLane and HangingSign need the renderer to query max anisotropy. */
const lane = new BowlingLane(renderer);
const sign = new HangingSign(renderer);
const pins = new PinFormation();
const ball = new BowlingBall();

/* ScorecardUI only injects DOM elements; it has no scene-graph mesh. */
const scorecardUI = new ScorecardUI();

scene.add(lane.mesh);
scene.add(sign.mesh);
scene.add(pins.mesh);
scene.add(ball.mesh);

// Wrap each pin Group child with per-pin collision and animation state.
// pins.mesh.children[i] maps to pin positions in the same order as PinFormation._placeAllPins().
const pinsArray = pins.mesh.children.map((pinMesh, index) => ({
  mesh:             pinMesh,
  index:            index,
  isToppling:       false,
  toppleDirection:  new THREE.Vector3(),
  toppleRotation:   0,
  toppleSpeedFactor: undefined,
  initialPosition:  pinMesh.position.clone()  // snapshot for full-reset restores
}));

// ── Orbit controls ────────────────────────────────────────────────────────────
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping      = true;
controls.dampingFactor      = 0.05;
controls.screenSpacePanning = true;
controls.minDistance        = 0.1;
controls.maxDistance        = 150;

// ── Keyboard shortcuts ────────────────────────────────────────────────────────
document.addEventListener('keydown', e => {
  if (e.code === 'KeyO') {
    controls.enabled = !controls.enabled;
  }

  if (e.code === 'KeyC') {
    if (!isCustomViewActive) {
      // Enter front view: save current camera state then snap
      isCustomViewActive = true;
      savedCameraPos.copy(camera.position);
      savedControlsTarget.copy(controls.target);
      camera.position.set(0, 4.0, -18);
      controls.target.set(0, 4.0, -30);
    } else {
      // Exit front view: restore saved camera state
      isCustomViewActive = false;
      camera.position.copy(savedCameraPos);
      controls.target.copy(savedControlsTarget);
    }
    controls.update();
  }

  if (e.code === 'ArrowLeft' && gameState.phase === 'aiming') {
    // Allow aiming up to ±1.76 so the player can intentionally roll a gutter ball
    ball.mesh.position.x = THREE.MathUtils.clamp(ball.mesh.position.x - 0.1, -1.76, 1.76);
  }

  if (e.code === 'ArrowRight' && gameState.phase === 'aiming') {
    ball.mesh.position.x = THREE.MathUtils.clamp(ball.mesh.position.x + 0.1, -1.76, 1.76);
  }

  if (e.code === 'Space') {
    if (gameState.phase === 'aiming') {
      gameState.phase          = 'power';
      gameState.powerValue     = 0;
      gameState.powerDirection = 1;
      controls.enabled         = false;
    } else if (gameState.phase === 'power') {
      gameState.phase = 'rolling';
      // Scale forward speed by the locked power fraction
      const forwardSpeed = gameState.powerValue * gameState.ballSpeedFactor;
      // Negative Z = towards the pins; X/Y stay flat
      gameState.ballVelocity.set(0, 0, -forwardSpeed);
    }
  }

  if (e.code === 'KeyR') {
    // Full game restart: wipe all state back to factory defaults
    gameState.currentFrame       = 1;
    gameState.currentRoll        = 1;
    gameState.powerValue         = 0;
    gameState.powerDirection     = 1;
    gameState.scores             = Array.from({ length: 10 }, () => []);
    gameState.cumulativeTotals   = Array(10).fill(null);
    gameState.pinsStanding.fill(true);
    gameState.pinsFallenThisRoll = 0;
    scorecardUI.updateScoreboard(gameState.scores, gameState.cumulativeTotals, 1, false);
    resetBallAndPins(true);
  }
});

// ── Collision constants ───────────────────────────────────────────────────────
const BALL_RADIUS            = 0.35;
const PIN_RADIUS             = 0.17;   // max profile radius from LatheGeometry (~0.17 at belly)
const COLLISION_THRESHOLD    = BALL_RADIUS + PIN_RADIUS;  // ~0.52 units
const PIN_PROPAGATION_RADIUS = 0.85;   // neighbor topple radius (1 unit centre-to-centre spacing)

// ── Pin collision detection ───────────────────────────────────────────────────
function checkCollisions() {
  pinsArray.forEach(pin => {
    // Skip pins already in motion or already down
    if (!gameState.pinsStanding[pin.index] || pin.isToppling) return;

    // Horizontal 2D distance on the X/Z plane
    const dx   = ball.mesh.position.x - pin.mesh.position.x;
    const dz   = ball.mesh.position.z - pin.mesh.position.z;
    const dist = Math.sqrt(dx * dx + dz * dz);

    if (dist < COLLISION_THRESHOLD) {
      // Topple this pin away from the ball's incoming direction
      pin.isToppling = true;
      pin.toppleDirection.copy(pin.mesh.position).sub(ball.mesh.position).setY(0).normalize();
      // Randomize falling speed and fan out the direction slightly
      if (!pin.toppleSpeedFactor) {
        pin.toppleSpeedFactor = 3.5 + Math.random() * 2.5;
        pin.toppleDirection.x += (Math.random() - 0.5) * 0.5;
        pin.toppleDirection.normalize();
      }

      // Ball loses 25% forward momentum on impact and deflects sideways
      gameState.ballVelocity.z *= 0.75;
      const deflectionX = (ball.mesh.position.x - pin.mesh.position.x) * 5.0;
      gameState.ballVelocity.x = deflectionX;

      // Pin-to-pin propagation: immediately tip over close standing neighbors
      pinsArray.forEach(neighbor => {
        if (
          gameState.pinsStanding[neighbor.index] &&
          !neighbor.isToppling &&
          neighbor.index !== pin.index
        ) {
          const distToNeighbor = pin.mesh.position.distanceTo(neighbor.mesh.position);
          if (distToNeighbor < PIN_PROPAGATION_RADIUS) {
            neighbor.isToppling = true;
            neighbor.toppleDirection
              .copy(neighbor.mesh.position)
              .sub(pin.mesh.position)
              .setY(0)
              .normalize();
            // Each neighbor also gets its own randomized fall characteristics
            if (!neighbor.toppleSpeedFactor) {
              neighbor.toppleSpeedFactor = 3.5 + Math.random() * 2.5;
              neighbor.toppleDirection.x += (Math.random() - 0.5) * 0.5;
              neighbor.toppleDirection.normalize();
            }
          }
        }
      });
    }
  });
}

// ── Pin toppling animation ────────────────────────────────────────────────────
function animatePins(deltaTime) {
  pinsArray.forEach(pin => {
    if (!pin.isToppling) return;

    pin.toppleRotation += deltaTime * pin.toppleSpeedFactor;

    // Rotate around the axis perpendicular to the topple direction
    pin.mesh.rotation.z = -pin.toppleDirection.x * pin.toppleRotation;
    pin.mesh.rotation.x =  pin.toppleDirection.z * pin.toppleRotation;

    // Lower the base as the pin tilts so it visually settles on the deck
    pin.mesh.position.y = Math.max(0.1 - (pin.toppleRotation * 0.1), -0.1);

    // Fully fallen – past 90° of rotation
    if (pin.toppleRotation >= Math.PI / 2) {
      pin.isToppling = false;
      gameState.pinsStanding[pin.index] = false;
      gameState.pinsFallenThisRoll++;
      pins.mesh.remove(pin.mesh);   // detach from the formation group
      console.log("Pin " + (pin.index + 1) + " is down.");
    }
  });
}

// ── Physics ───────────────────────────────────────────────────────────────────
function updatePhysics(deltaTime) {
  // 1. Apply Motion: advance position by velocity × dt
  ball.mesh.position.addScaledVector(gameState.ballVelocity, deltaTime);

  // Check for pin hits on every frame the ball is in motion
  checkCollisions();

  // 2. Realistic Rolling Rotation: spin the ball around X-axis proportional to speed
  const ballRadius         = 0.35;
  const currentForwardSpeed = Math.abs(gameState.ballVelocity.z);
  if (currentForwardSpeed > 0) {
    ball.mesh.rotation.x -= (currentForwardSpeed / ballRadius) * deltaTime;
  }

  // 3. Rolling Friction: gentle deceleration so light throws still reach the pins
  if (gameState.ballVelocity.z < 0) {
    gameState.ballVelocity.z += 0.4 * deltaTime;
    if (gameState.ballVelocity.z > 0) gameState.ballVelocity.z = 0;
  }

  // 4. Gutter Snap: only triggers after the ball crosses the foul line (Z <= 0)
  if (ball.mesh.position.z <= 0 && Math.abs(ball.mesh.position.x) >= 1.75) {
    // Determine which channel (left or right) and snap to its exact centre line
    const side = ball.mesh.position.x > 0 ? 1 : -1;
    ball.mesh.position.x = side * 2.0;   // centre of the gutter channel geometry
    ball.mesh.position.y = 0.22;         // rests the ball bottom on the gutter floor
    gameState.ballVelocity.x = 0;        // kill all lateral drift
  }

  // 5. End-of-Roll: ball reached the pit boundary or came to a full stop
  if (ball.mesh.position.z < -60.0 || currentForwardSpeed === 0) {
    gameState.phase = 'resolving';
    gameState.ballVelocity.set(0, 0, 0);
    scene.remove(ball.mesh);  // drop ball into the pit visually
    // Short delay lets toppling animations finish before we count fallen pins
    setTimeout(() => { resolveCurrentRoll(); }, 600);
  }
}

// ── Scoring ───────────────────────────────────────────────────────────────────

/*
 * Walk every frame in gameState.scores with a flat-ball index so strike and
 * spare bonus balls are read from the correct subsequent frame.
 * Sets gameState.cumulativeTotals[i] to the running total or null when the
 * bonus balls needed for that frame haven't been thrown yet.
 */
function computeCumulativeTotals() {
  const allBalls = gameState.scores.flatMap(frame => frame);
  let ballIdx = 0;
  let running  = 0;

  for (let i = 0; i < 10; i++) {
    const rolls = gameState.scores[i];

    if (!rolls || rolls.length === 0) {
      gameState.cumulativeTotals[i] = null;
      continue;
    }

    if (i < 9) {
      if (rolls[0] === 10) {
        // Strike: frame value = 10 + next 2 balls
        if (allBalls.length >= ballIdx + 3) {
          running += 10 + allBalls[ballIdx + 1] + allBalls[ballIdx + 2];
          gameState.cumulativeTotals[i] = running;
        } else {
          gameState.cumulativeTotals[i] = null;
        }
        ballIdx += 1;
      } else if (rolls.length >= 2 && rolls[0] + rolls[1] === 10) {
        // Spare: frame value = 10 + next 1 ball
        if (allBalls.length >= ballIdx + 3) {
          running += 10 + allBalls[ballIdx + 2];
          gameState.cumulativeTotals[i] = running;
        } else {
          gameState.cumulativeTotals[i] = null;
        }
        ballIdx += 2;
      } else if (rolls.length >= 2) {
        // Open frame: just the two rolls
        running += rolls[0] + rolls[1];
        gameState.cumulativeTotals[i] = running;
        ballIdx += 2;
      } else {
        // Roll 1 done; roll 2 not yet thrown
        gameState.cumulativeTotals[i] = null;
        ballIdx += 1;
      }
    } else {
      // Frame 10: value is simply the sum of all balls thrown in this frame
      const sum = rolls.reduce((a, b) => a + b, 0);
      const r1  = rolls[0];
      const r2  = rolls[1] ?? -1;
      // Frame is complete when: (a) 3 balls thrown, or (b) 2 balls with no spare/strike earned
      const isComplete = rolls.length === 3 ||
        (rolls.length === 2 && r1 < 10 && r1 + r2 < 10);
      if (isComplete) {
        running += sum;
        gameState.cumulativeTotals[i] = running;
      } else {
        gameState.cumulativeTotals[i] = null;
      }
    }
  }
}

/*
 * Called 600ms after a roll ends (via setTimeout) so pin animations can finish.
 * Records the roll score, advances the game state, and either resets for the
 * next throw or ends the game.
 */
function resolveCurrentRoll() {
  const fi          = gameState.currentFrame - 1;  // 0-based frame index
  const roll        = gameState.currentRoll;
  const totalFallen = gameState.pinsFallenThisRoll;

  // Record this roll and reset the per-roll counter for the next throw
  gameState.scores[fi].push(totalFallen);
  gameState.pinsFallenThisRoll = 0;

  // Recalculate every running total using the updated scores
  computeCumulativeTotals();

  let nextFrame = gameState.currentFrame;
  let nextRoll  = gameState.currentRoll;
  let fullReset = false;  // true = restore all 10 pins; false = leave standing pins

  if (gameState.currentFrame < 10) {
    // ── Frames 1-9 ────────────────────────────────────────────────────────────
    if (roll === 1 && totalFallen === 10) {
      // Strike: frame is over, advance with a fresh pin set
      nextFrame++;
      nextRoll  = 1;
      fullReset = true;
    } else if (roll === 1) {
      // No strike: go to roll 2, leave remaining pins in place
      nextRoll  = 2;
      fullReset = false;
    } else {
      // Roll 2 done: frame over, advance with a fresh pin set
      nextFrame++;
      nextRoll  = 1;
      fullReset = true;
    }
  } else {
    // ── Frame 10 special rules ─────────────────────────────────────────────────
    const f10 = gameState.scores[9];
    if (roll === 1) {
      nextRoll  = 2;
      // Strike on roll 1: reset pins so roll 2 is a fresh set
      fullReset = (totalFallen === 10);
    } else if (roll === 2) {
      if (f10[0] === 10) {
        // Roll 1 was a strike: always earn a 3rd ball
        nextRoll  = 3;
        // 2nd ball also a strike: reset pins again for ball 3
        fullReset = (totalFallen === 10);
      } else if (f10[0] + f10[1] === 10) {
        // Spare: earn a bonus ball with a fresh set of pins
        nextRoll  = 3;
        fullReset = true;
      } else {
        // Open frame in 10th: game over, no bonus ball
        gameState.phase = 'gameover';
      }
    } else {
      // Roll 3 always ends the game
      gameState.phase = 'gameover';
    }
  }

  // Safety guard: should not happen in normal flow
  if (nextFrame > 10) {
    gameState.phase = 'gameover';
  }

  const isGameOver = gameState.phase === 'gameover';
  scorecardUI.updateScoreboard(gameState.scores, gameState.cumulativeTotals, nextFrame, isGameOver);

  if (isGameOver) {
    console.log("Game over!");
    return;
  }

  gameState.currentFrame = nextFrame;
  gameState.currentRoll  = nextRoll;
  resetBallAndPins(fullReset);
}

/*
 * Restores the ball to the approach area and either resets all 10 pins
 * (fullNewGame = true) or ensures fallen pins are cleanly removed for a
 * second-roll within the same frame (fullNewGame = false).
 */
function resetBallAndPins(fullNewGame) {
  // Restore ball to approach position
  scene.add(ball.mesh);
  ball.mesh.position.set(0, 0.45, 12);
  ball.mesh.rotation.set(0, 0, 0);
  gameState.ballVelocity.set(0, 0, 0);
  gameState.phase  = 'aiming';
  controls.enabled = true;
  // Return camera to the default aiming perspective and clear any toggle state
  isCustomViewActive = false;
  camera.position.set(0, 5, 18.0);
  controls.target.set(0, 0, -25);
  controls.update();

  if (fullNewGame) {
    // Restore all 10 pins to their original positions and clear all runtime state
    pinsArray.forEach(pin => {
      if (!pin.mesh.parent) {
        pins.mesh.add(pin.mesh);  // re-attach if it was removed after falling
      }
      pin.mesh.position.copy(pin.initialPosition);
      pin.mesh.rotation.set(0, 0, 0);
      pin.isToppling        = false;
      pin.toppleDirection.set(0, 0, 0);
      pin.toppleRotation    = 0;
      pin.toppleSpeedFactor = undefined;
    });
    gameState.pinsStanding.fill(true);
  } else {
    // Between-roll: cleanly remove any pins recorded as fallen but still in scene
    pinsArray.forEach(pin => {
      if (!gameState.pinsStanding[pin.index] && pin.mesh.parent) {
        pins.mesh.remove(pin.mesh);
      }
    });
  }
}

// ── Window resize ─────────────────────────────────────────────────────────────
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// ── Render loop ───────────────────────────────────────────────────────────────
/*
 * controls.update() must be called every frame when enableDamping is true
 * so the inertia animation can finish after the user releases the mouse.
 */
function animate() {
  requestAnimationFrame(animate);
  const deltaTime = clock.getDelta();

  if (gameState.phase === 'rolling') {
    updatePhysics(deltaTime);
    // Follow-ball camera: trail behind and slightly above the ball each frame
    camera.position.set(
      ball.mesh.position.x,
      ball.mesh.position.y + 3.0,
      ball.mesh.position.z + 6.0
    );
    controls.target.copy(ball.mesh.position);
  }

  if (gameState.phase === 'power') {
    gameState.powerValue += gameState.powerDirection * deltaTime * 2.0;
    if (gameState.powerValue >= 1.0) {
      gameState.powerValue     = 1.0;
      gameState.powerDirection = -1;
    } else if (gameState.powerValue <= 0.0) {
      gameState.powerValue     = 0.0;
      gameState.powerDirection = 1;
    }
  }

  // Animate toppling pins every frame regardless of current phase
  animatePins(deltaTime);

  scorecardUI.updatePowerMeterUI(gameState.phase, gameState.powerValue);

  controls.update();
  renderer.render(scene, camera);
}
animate();
