import {OrbitControls} from './OrbitControls.js'

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);
// Set background color
scene.background = new THREE.Color(0x1a1a2e);

// Add lights to the scene
const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
directionalLight.position.set(5, 25, 20);
directionalLight.target.position.set(0, 0, -25);
scene.add(directionalLight.target);
scene.add(directionalLight);

// Enable shadows
renderer.shadowMap.enabled = true;
directionalLight.castShadow = true;
directionalLight.shadow.camera.left = -6;
directionalLight.shadow.camera.right = 5;
directionalLight.shadow.camera.top = 30;
directionalLight.shadow.camera.bottom = -30;
directionalLight.shadow.camera.near = 0.5;
directionalLight.shadow.camera.far = 120; 

directionalLight.shadow.mapSize.width = 2048;
directionalLight.shadow.mapSize.height = 2048;

function degrees_to_radians(degrees) {
  var pi = Math.PI;
  return degrees * (pi/180);
}

// Create bowling lane
function createBowlingLane() {
  // --- Procedural wood textures for each surface zone ---
  const laneTexture = createWoodTexture({
    baseColor: '#d4ae74',
    boardCount: 20,
    streakOpacity: 0.07,
    darkenEdges: false,
    seed: 101
  });
  const approachTexture = createWoodTexture({
    baseColor: '#c89e65',
    boardCount: 20,
    streakOpacity: 0.08,
    darkenEdges: true,
    seed: 202
  });
  const deckTexture = createWoodTexture({
    baseColor: '#d9b884',
    boardCount: 16,
    streakOpacity: 0.06,
    darkenEdges: false,
    seed: 303
  });

  // --- Lane body: structural box (Z=0 to Z=-60), sides only ---
  const laneBodyMat = new THREE.MeshPhongMaterial({
    color: 0x8d6a46,
    shininess: 25,
    specular: new THREE.Color(0x2a2020)
  });
  const laneBody = new THREE.Mesh(new THREE.BoxGeometry(3.5, 0.2, 60), laneBodyMat);
  laneBody.position.set(0, 0, -30);
  laneBody.receiveShadow = true;
  laneBody.castShadow = true;
  scene.add(laneBody);

  // --- Lane top surface (Z=0 to Z=-56.5, light maple #d4ae74) ---
  const laneTopMat = new THREE.MeshPhongMaterial({
    color: 0xffffff,
    map: laneTexture,
    shininess: 95,
    specular: new THREE.Color(0x6b5845)
  });
  const laneTopLength = 56.5;
  const laneTop = new THREE.Mesh(new THREE.PlaneGeometry(3.5, laneTopLength), laneTopMat);
  laneTop.rotation.x = -Math.PI / 2;
  laneTop.position.set(0, 0.101, -laneTopLength / 2);
  laneTop.receiveShadow = true;
  scene.add(laneTop);

  // --- Pin deck top surface (Z=-56.5 to Z=-60, warmer tone #d9b884) ---
  const deckTopMat = new THREE.MeshPhongMaterial({
    color: 0xffffff,
    map: deckTexture,
    shininess: 85,
    specular: new THREE.Color(0x665241)
  });
  const deckLength = 3.5;
  const deckTop = new THREE.Mesh(new THREE.PlaneGeometry(3.5, deckLength), deckTopMat);
  deckTop.rotation.x = -Math.PI / 2;
  deckTop.position.set(0, 0.102, -56.5 - deckLength / 2);
  deckTop.receiveShadow = true;
  scene.add(deckTop);

  // --- Approach body: structural box (Z=0 to Z=+15), sides only ---
  const approachBodyMat = new THREE.MeshPhongMaterial({
    color: 0x7b5c3c,
    shininess: 18,
    specular: new THREE.Color(0x241b17)
  });
  const approachBody = new THREE.Mesh(new THREE.BoxGeometry(3.5, 0.2, 15), approachBodyMat);
  approachBody.position.set(0, 0, 7.5);
  approachBody.receiveShadow = true;
  approachBody.castShadow = true;
  scene.add(approachBody);

  // --- Approach top surface (Z=0 to Z=+15, darker tone #c89e65) ---
  const approachTopMat = new THREE.MeshPhongMaterial({
    color: 0xffffff,
    map: approachTexture,
    shininess: 70,
    specular: new THREE.Color(0x59422b)
  });
  const approachTop = new THREE.Mesh(new THREE.PlaneGeometry(3.5, 15), approachTopMat);
  approachTop.rotation.x = -Math.PI / 2;
  approachTop.position.set(0, 0.101, 7.5);
  approachTop.receiveShadow = true;
  scene.add(approachTop);

  // --- Gutters – recessed below lane top, full lane length ---
  const gutterWidth = 0.5;
  const gutterGeo = new THREE.BoxGeometry(gutterWidth, 0.15, 60);
  const gutterMat = new THREE.MeshPhongMaterial({
    color: 0x222831,
    shininess: 20,
    specular: new THREE.Color(0x0a0f15)
  });
  [-1, 1].forEach(side => {
    const gutter = new THREE.Mesh(gutterGeo, gutterMat);
    gutter.position.set(side * (1.75 + gutterWidth / 2), -0.025, -30);
    gutter.receiveShadow = true;
    gutter.castShadow = true;
    scene.add(gutter);
  });

  // --- Foul line – thin red stripe at Z=0 ---
  const foulLineGeo = new THREE.BoxGeometry(3.5, 0.01, 0.08);
  const foulLineMat = new THREE.MeshPhongMaterial({ color: 0xff1a1a, shininess: 20 });
  const foulLine = new THREE.Mesh(foulLineGeo, foulLineMat);
  foulLine.position.set(0, 0.106, 0);
  foulLine.receiveShadow = true;
  foulLine.castShadow = true;
  scene.add(foulLine);

  // --- Lane arrows – 5 amber triangles at Z=-15 ---
  const arrowShape = new THREE.Shape();
  arrowShape.moveTo(0, 0.3);
  arrowShape.lineTo(-0.08, -0.15);
  arrowShape.lineTo(0.08, -0.15);
  arrowShape.lineTo(0, 0.3);

  const arrowGeo = new THREE.ShapeGeometry(arrowShape);
  const arrowMat = new THREE.MeshPhongMaterial({
    color: 0xB8860B,
    shininess: 40,
    side: THREE.DoubleSide
  });
  [0, -0.5, 0.5, -1.0, 1.0].forEach(x => {
    const arrow = new THREE.Mesh(arrowGeo, arrowMat);
    arrow.rotation.x = -Math.PI / 2;
    arrow.position.set(x, 0.102, -15);
    scene.add(arrow);
  });

  // --- Approach dots – rows at Z=7 and Z=12 ---
  const dotGeo = new THREE.CircleGeometry(0.06, 16);
  const dotMat = new THREE.MeshPhongMaterial({
    color: 0x8B4513,
    shininess: 20,
    side: THREE.DoubleSide
  });
  [7, 12].forEach(z => {
    [-1.0, -0.5, 0, 0.5, 1.0].forEach(x => {
      const dot = new THREE.Mesh(dotGeo, dotMat);
      dot.rotation.x = -Math.PI / 2;
      dot.position.set(x, 0.102, z);
      scene.add(dot);
    });
  });
}

function createBowlingPins() {
  // Half cross-section profile for LatheGeometry.
  // Each Vector2 is (radius, height) in pin-local space.
  // First/last point at radius=0 closes the bottom and top caps naturally.
  const pinProfile = [
    new THREE.Vector2(0.00, 0.00),   // base centre – closes bottom
    new THREE.Vector2(0.09, 0.00),   // base rim
    new THREE.Vector2(0.11, 0.03),   // lower body
    new THREE.Vector2(0.17, 0.12),   // body widening
    new THREE.Vector2(0.195, 0.25),  // approaching belly
    new THREE.Vector2(0.20,  0.35),  // widest point – belly
    new THREE.Vector2(0.195, 0.45),  // past belly, narrowing
    new THREE.Vector2(0.17,  0.58),  // upper body
    new THREE.Vector2(0.13,  0.72),  // narrowing toward neck
    new THREE.Vector2(0.09,  0.85),  // neck – narrowest point
    new THREE.Vector2(0.095, 0.92),  // base of head
    new THREE.Vector2(0.13,  1.02),  // head widening
    new THREE.Vector2(0.135, 1.10),  // head peak
    new THREE.Vector2(0.11,  1.19),  // top of head, tapering
    new THREE.Vector2(0.04,  1.24),  // near tip
    new THREE.Vector2(0.00,  1.25),  // tip – closes top
  ];

  const pinBodyGeo = new THREE.LatheGeometry(pinProfile, 24);
  const pinBodyMat = new THREE.MeshPhongMaterial({ color: 0xffffff, shininess: 100 });
  const pinBody = new THREE.Mesh(pinBodyGeo, pinBodyMat);
  pinBody.castShadow = true;
  pinBody.receiveShadow = true;

  // Red neck stripe – thin cylinder radius 0.107, just wider than the neck (0.09),
  // so it sits proud of the pin surface without Z-fighting. Centred at pin-local y=0.875.
  const stripeGeo = new THREE.CylinderGeometry(0.107, 0.107, 0.075, 24);
  const stripeMat = new THREE.MeshPhongMaterial({ color: 0xcc0000, shininess: 60 });
  const stripe = new THREE.Mesh(stripeGeo, stripeMat);
  stripe.position.y = 0.875;
  stripe.castShadow = true;
  stripe.receiveShadow = true;

  // Build template group ONCE; .clone() creates independent copies for each pin
  const basePinGroup = new THREE.Group();
  basePinGroup.add(pinBody);
  basePinGroup.add(stripe);

  // Standard 10-pin triangular formation (from assignment spec).
  // Lane top is Y=0.1; pin base is at local Y=0, so world PIN_Y=0.1 is flush.
  const PIN_Y = 0.1;
  const pinPositions = [
    { x:  0.0, z: -57.000 },  // 1 – head pin (centre, aligns with approach-dot funnel)
    { x: -0.5, z: -57.866 },  // 2
    { x:  0.5, z: -57.866 },  // 3
    { x: -1.0, z: -58.732 },  // 4
    { x:  0.0, z: -58.732 },  // 5
    { x:  1.0, z: -58.732 },  // 6
    { x: -1.5, z: -59.598 },  // 7
    { x: -0.5, z: -59.598 },  // 8
    { x:  0.5, z: -59.598 },  // 9
    { x:  1.5, z: -59.598 },  // 10
  ];

  pinPositions.forEach(({ x, z }) => {
    const pin = basePinGroup.clone();
    pin.position.set(x, PIN_Y, z);
    // traverse() walks every node in the cloned subtree (body + stripe) and
    // sets shadow flags explicitly, rather than relying on clone() propagation.
    pin.traverse(child => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });
    scene.add(pin);
  });
}

function createBowlingBall() {
  const bowlingBallGroup = new THREE.Group();

  // --- Main sphere ---
  const ballGeo = new THREE.SphereGeometry(0.35, 32, 32);
  const ballMat = new THREE.MeshPhongMaterial({
    color: 0x1a2b8a,     // deep cobalt blue – visually distinct against white pins
    shininess: 90,
    specular: 0x4444cc   // blue-tinted specular highlight
  });
  bowlingBallGroup.add(new THREE.Mesh(ballGeo, ballMat));

  // --- Finger holes ---
  // Each hole is a matte-black cylinder (r=0.035, h=0.08) embedded in the sphere.
  // Strategy:
  //   1. Pick a direction unit vector pointing to the desired surface spot.
  //   2. Surface point = dir * radius (0.45).
  //   3. Cylinder centre = surface point − 0.04*dir  (half the height, pushed inward)
  //      so the outer cap sits flush with the sphere surface.
  //   4. Rotate: align cylinder's default +Y axis to the inward direction (−dir).
  const holeGeo = new THREE.CylinderGeometry(0.035, 0.035, 0.08, 16);
  const holeMat = new THREE.MeshPhongMaterial({ color: 0x111111, shininess: 5 });

  function addFingerHole(dx, dy, dz) {
    const dir    = new THREE.Vector3(dx, dy, dz).normalize();
    const inward = dir.clone().negate();

    const hole = new THREE.Mesh(holeGeo, holeMat);
    // place centre half-depth inside surface so cap is flush
    hole.position.copy(dir).multiplyScalar(0.35).addScaledVector(inward, 0.04);
    // tilt cylinder axis to point toward sphere centre
    hole.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), inward);
    hole.castShadow = false; 
    hole.receiveShadow = false;
    bowlingBallGroup.add(hole);
  }

  // Two adjacent holes (ring + middle finger) and one offset thumb hole
  addFingerHole( 0.25,  0.93,  0.17);  // ring finger  – upper right
  addFingerHole(-0.25,  0.93,  0.17);  // middle finger – upper left (adjacent)
  addFingerHole( 0.00,  0.87, -0.30);  // thumb         – offset toward bowler

  // --- Positioning ---
  // Lane top Y=0.1, ball radius=0.35 → centre at Y=0.45 to sit flush on approach
  bowlingBallGroup.position.set(0, 0.45, 12);

  // --- Shadows: walk every mesh in the group in one pass ---
  bowlingBallGroup.traverse(child => {
    if (child.isMesh) {
      child.castShadow    = true;
      child.receiveShadow = true;
    }
  });

  scene.add(bowlingBallGroup);
}

function setupUI() {
  // Shared CSS for both overlay panels injected once into <head>
  const style = document.createElement('style');
  style.textContent = `
    .bowling-ui-card {
      position: absolute;
      background: rgba(26, 26, 46, 0.85);
      border: 1px solid rgba(255, 255, 255, 0.15);
      border-radius: 8px;
      color: #ffffff;
      font-family: Arial, sans-serif;
      pointer-events: none;   /* never blocks canvas mouse/touch events */
      user-select: none;
    }

    /* ── Scorecard – top-centre ───────────────────────────────────────── */
    #scorecard {
      top: 16px;
      left: 50%;
      transform: translateX(-50%);
      padding: 10px 14px;
    }
    #scorecard h2 {
      margin: 0 0 8px;
      font-size: 10px;
      letter-spacing: 2px;
      text-transform: uppercase;
      color: rgba(255,255,255,0.45);
      text-align: center;
    }
    .score-frames { display: flex; gap: 3px; }
    .frame {
      display: flex;
      flex-direction: column;
      align-items: center;
      border: 1px solid rgba(255,255,255,0.18);
      border-radius: 4px;
      overflow: hidden;
      min-width: 44px;
    }
    .frame-label {
      width: 100%;
      text-align: center;
      font-size: 9px;
      letter-spacing: 1px;
      color: rgba(255,255,255,0.35);
      padding: 2px 0;
      background: rgba(255,255,255,0.05);
    }
    .frame-shots {
      display: flex;
      width: 100%;
      border-bottom: 1px solid rgba(255,255,255,0.12);
    }
    .shot-box {
      flex: 1;
      text-align: center;
      padding: 5px 3px;
      font-size: 12px;
      font-weight: bold;
      color: rgba(255,255,255,0.25);
      border-right: 1px solid rgba(255,255,255,0.1);
    }
    .shot-box:last-child { border-right: none; }
    .frame-total {
      padding: 4px 6px;
      font-size: 13px;
      font-weight: bold;
      color: rgba(255,255,255,0.2);
    }

    /* ── Controls card – bottom-left ─────────────────────────────────── */
    #controls-card {
      bottom: 20px;
      left: 20px;
      padding: 14px 18px;
    }
    #controls-card h3 {
      margin: 0 0 10px;
      font-size: 10px;
      letter-spacing: 2px;
      text-transform: uppercase;
      color: rgba(255,255,255,0.45);
    }
    .control-row {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 7px;
      font-size: 13px;
    }
    .control-row:last-child { margin-bottom: 0; }
    .key-badge {
      display: inline-block;
      background: rgba(255,255,255,0.08);
      border: 1px solid rgba(255,255,255,0.25);
      border-radius: 4px;
      padding: 2px 7px;
      font-size: 11px;
      font-weight: bold;
      font-family: monospace;
      color: #fff;
      min-width: 22px;
      text-align: center;
    }
    .control-label        { color: rgba(255,255,255,0.7); }
    .control-label.future { color: rgba(255,255,255,0.25); font-style: italic; }
  `;
  document.head.appendChild(style);

  // ── Scorecard ──────────────────────────────────────────────────────────
  // Frames 1-9: two shot boxes each. Frame 10: three shot boxes.
  const framesHTML =
    Array.from({ length: 9 }, (_, i) => `
      <div class="frame">
        <div class="frame-label">${i + 1}</div>
        <div class="frame-shots">
          <div class="shot-box">-</div>
          <div class="shot-box">-</div>
        </div>
        <div class="frame-total">-</div>
      </div>`).join('') + `
      <div class="frame">
        <div class="frame-label">10</div>
        <div class="frame-shots">
          <div class="shot-box">-</div>
          <div class="shot-box">-</div>
          <div class="shot-box">-</div>
        </div>
        <div class="frame-total">-</div>
      </div>`;

  const scorecard = document.createElement('div');
  scorecard.id = 'scorecard';
  scorecard.className = 'bowling-ui-card';
  scorecard.innerHTML = `<h2>Scorecard</h2><div class="score-frames">${framesHTML}</div>`;
  document.body.appendChild(scorecard);

  // ── Controls card ──────────────────────────────────────────────────────
  const controlsCard = document.createElement('div');
  controlsCard.id = 'controls-card';
  controlsCard.className = 'bowling-ui-card';
  controlsCard.innerHTML = `
    <h3>Controls</h3>
    <div class="control-row">
      <span class="key-badge">O</span>
      <span class="control-label">Toggle orbit camera</span>
    </div>
    <div class="control-row">
      <span class="key-badge">Space</span>
      <span class="control-label future">Launch ball</span>
    </div>
    <div class="control-row">
      <span class="key-badge">← →</span>
      <span class="control-label future">Aim</span>
    </div>
    <div class="control-row">
      <span class="key-badge">↑ ↓</span>
      <span class="control-label future">Power</span>
    </div>`;
  document.body.appendChild(controlsCard);
}

// Create all elements
createBowlingLane();
createBackWall();
createBowlingPins();
createBowlingBall();
setupUI();

// Set camera position for bowler's perspective
const cameraTranslate = new THREE.Matrix4();
cameraTranslate.makeTranslation(0, 5, 12);
camera.applyMatrix4(cameraTranslate);

// Orbit controls – must be `let` so handleKeyDown can re-instantiate it on toggle
const controls = new OrbitControls(camera, renderer.domElement);
let isOrbitEnabled = true;

// Handle key events
function handleKeyDown(e) {
  if (e.code === "KeyO") {
    isOrbitEnabled = !isOrbitEnabled;
    controls.enabled = isOrbitEnabled; // זה מה שמקפיא את המצלמה בתוך הספרייה
  }
}

document.addEventListener('keydown', handleKeyDown);

function createBackWall() {
  const wallMat = new THREE.MeshPhongMaterial({
    color: 0x11161f,
    shininess: 8,
    side: THREE.DoubleSide
  });
  const backWall = new THREE.Mesh(new THREE.PlaneGeometry(5.5, 4.0), wallMat);
  backWall.position.set(0, 2.0, -60);
  backWall.receiveShadow = true;
  scene.add(backWall);
}

function createSeededRandom(seed) {
  let value = seed >>> 0;
  return function seededRandom() {
    value += 0x6D2B79F5;
    let t = value;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shiftHexLightness(hexColor, amount) {
  const color = new THREE.Color(hexColor);
  const hsl = {};
  color.getHSL(hsl);
  hsl.l = THREE.MathUtils.clamp(hsl.l + (amount / 255), 0, 1);
  color.setHSL(hsl.h, hsl.s, hsl.l);
  return `#${color.getHexString()}`;
}

function createWoodTexture(options) {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 2048;

  const context = canvas.getContext('2d');
  const random = createSeededRandom(options.seed || 1);

  context.fillStyle = options.baseColor;
  context.fillRect(0, 0, canvas.width, canvas.height);

  const boardWidth = canvas.width / options.boardCount;

  for (let boardIndex = 0; boardIndex < options.boardCount; boardIndex += 1) {
    const hueShift = (random() - 0.5) * 16;
    context.fillStyle = shiftHexLightness(options.baseColor, hueShift);
    context.fillRect(boardIndex * boardWidth, 0, boardWidth, canvas.height);

    context.strokeStyle = 'rgba(70, 40, 20, 0.20)';
    context.lineWidth = 1;
    context.beginPath();
    context.moveTo(boardIndex * boardWidth, 0);
    context.lineTo(boardIndex * boardWidth, canvas.height);
    context.stroke();
  }

  for (let index = 0; index < 350; index += 1) {
    const x = random() * canvas.width;
    const y = random() * canvas.height;
    const length = 30 + random() * 140;
    context.strokeStyle = `rgba(255, 255, 255, ${random() * options.streakOpacity})`;
    context.lineWidth = 1 + random() * 2;
    context.beginPath();
    context.moveTo(x, y);
    context.lineTo(x + (random() - 0.5) * 8, y + length);
    context.stroke();
  }

  if (options.darkenEdges) {
    const edgeGradient = context.createLinearGradient(0, 0, canvas.width, 0);
    edgeGradient.addColorStop(0, 'rgba(0, 0, 0, 0.18)');
    edgeGradient.addColorStop(0.15, 'rgba(0, 0, 0, 0.03)');
    edgeGradient.addColorStop(0.85, 'rgba(0, 0, 0, 0.03)');
    edgeGradient.addColorStop(1, 'rgba(0, 0, 0, 0.18)');
    context.fillStyle = edgeGradient;
    context.fillRect(0, 0, canvas.width, canvas.height);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
  texture.encoding = THREE.sRGBEncoding;
  texture.needsUpdate = true;
  return texture;
}

// Animation function
function animate() {
  requestAnimationFrame(animate);

  // Guard: update() has no internal `enabled` check – it unconditionally flushes
  // sphericalDelta onto the camera matrices. Calling it on a disposed instance
  // would also throw. Only run it while orbit is active.
  if (isOrbitEnabled) controls.update();

  renderer.render(scene, camera);
}

animate();
