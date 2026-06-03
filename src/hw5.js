import { OrbitControls } from './OrbitControls.js';

// ── Scene ─────────────────────────────────────────────────────────────────────
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x1a1a2e);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
document.body.appendChild(renderer.domElement);

// ── Lights ────────────────────────────────────────────────────────────────────
const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
directionalLight.position.set(5, 25, 20);
directionalLight.target.position.set(0, 0, -25);
directionalLight.castShadow = true;
directionalLight.shadow.camera.left   = -6;
directionalLight.shadow.camera.right  =  5;
directionalLight.shadow.camera.top    =  30;
directionalLight.shadow.camera.bottom = -30;
directionalLight.shadow.camera.near   =  0.5;
directionalLight.shadow.camera.far    =  120;
directionalLight.shadow.mapSize.width  = 2048;
directionalLight.shadow.mapSize.height = 2048;
scene.add(directionalLight);
scene.add(directionalLight.target);

// ── Build scene ───────────────────────────────────────────────────────────────
createBowlingLane();
createBackWall();
createHangingNeonSign();
createBowlingPins();
createBowlingBall();
setupUI();

// ── Camera: default bowler's-eye starting position ────────────────────────────
camera.position.set(0, 5, 12);

// ── Orbit controls ────────────────────────────────────────────────────────────
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping      = true;
controls.dampingFactor      = 0.08;
controls.screenSpacePanning = true;
controls.minDistance        = 0.1;
controls.maxDistance        = 150;

let isOrbitEnabled = true;

// ── Keyboard shortcuts ────────────────────────────────────────────────────────
function handleKeyDown(e) {
  if (e.code === 'KeyO') {
    // Toggle orbit camera on / off
    isOrbitEnabled = !isOrbitEnabled;
    controls.enabled = isOrbitEnabled;
  }

  if (e.code === 'KeyC') {
    // Snap to a frontal view centred on the neon sign
    camera.position.set(0, 4.0, -18);
    controls.target.set(0, 4.0, -30);
    controls.update();
  }
}
document.addEventListener('keydown', handleKeyDown);

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// ── Render loop ───────────────────────────────────────────────────────────────
function animate() {
  requestAnimationFrame(animate);
  if (isOrbitEnabled) controls.update();
  renderer.render(scene, camera);
}
animate();

// ─────────────────────────────────────────────────────────────────────────────
// Scene builders
// ─────────────────────────────────────────────────────────────────────────────

function createBowlingLane() {
  // Three distinct wood textures mark each surface zone visually
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

  // Lane body: structural box (Z=0 to Z=-60); side faces use a solid colour
  const laneBodyMat = new THREE.MeshPhongMaterial({
    color: 0xeaeaea,
    shininess: 60,
    specular: new THREE.Color(0x2a2020)
  });
  const laneBody = new THREE.Mesh(new THREE.BoxGeometry(3.5, 0.2, 60), laneBodyMat);
  laneBody.position.set(0, 0, -30);
  laneBody.receiveShadow = true;
  laneBody.castShadow = true;
  scene.add(laneBody);

  // Lane top (Z=0 to Z=-56.5): light maple wood grain
  const laneTopMat = new THREE.MeshPhongMaterial({
    color: 0xffffff,
    map: laneTexture,
    shininess: 95,
    specular: new THREE.Color(0x6b5845)
  });
  const laneTopLength = 56.5;
  const laneTop = new THREE.Mesh(new THREE.PlaneGeometry(3.5, laneTopLength), laneTopMat);
  laneTop.rotation.x = -Math.PI / 2;
  laneTop.position.set(0, 0.11, -laneTopLength / 2);
  laneTop.receiveShadow = true;
  scene.add(laneTop);

  // Pin deck top (Z=-56.5 to Z=-60): warmer maple tone to distinguish the deck zone
  const deckTopMat = new THREE.MeshPhongMaterial({
    color: 0xffffff,
    map: deckTexture,
    shininess: 85,
    specular: new THREE.Color(0x665241)
  });
  const deckLength = 3.5;
  const deckTop = new THREE.Mesh(new THREE.PlaneGeometry(3.5, deckLength), deckTopMat);
  deckTop.rotation.x = -Math.PI / 2;
  deckTop.position.set(0, 0.112, -56.5 - deckLength / 2);
  deckTop.receiveShadow = true;
  scene.add(deckTop);

  // Approach body (Z=0 to Z=+15)
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

  // Approach top (Z=0 to Z=+15): dark walnut tone with edge darkening toward gutters
  const approachTopMat = new THREE.MeshPhongMaterial({
    color: 0xffffff,
    map: approachTexture,
    shininess: 70,
    specular: new THREE.Color(0x59422b)
  });
  const approachTop = new THREE.Mesh(new THREE.PlaneGeometry(3.5, 15), approachTopMat);
  approachTop.rotation.x = -Math.PI / 2;
  approachTop.position.set(0, 0.11, 7.5);
  approachTop.receiveShadow = true;
  scene.add(approachTop);

  // Gutters: dark recessed channels on both sides of the lane
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

  // Foul line: thin red bar at Z=0; Y=0.106 clears the lane-top plane to avoid Z-fighting
  const foulLineGeo = new THREE.BoxGeometry(3.5, 0.01, 0.08);
  const foulLineMat = new THREE.MeshPhongMaterial({ color: 0xff1a1a, shininess: 20 });
  const foulLine = new THREE.Mesh(foulLineGeo, foulLineMat);
  foulLine.position.set(0, 0.106, 0);
  foulLine.receiveShadow = true;
  foulLine.castShadow = true;
  scene.add(foulLine);

  // Lane arrows: 5 amber triangles at Z=-15; Y=0.102 floats above the lane-top plane
  const arrowShape = new THREE.Shape();
  arrowShape.moveTo( 0,     0.3 );
  arrowShape.lineTo(-0.08, -0.15);
  arrowShape.lineTo( 0.08, -0.15);
  arrowShape.lineTo( 0,     0.3 );

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

  // Approach dots: two rows (Z=7 and Z=12) of 5 dots each
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
  // LatheGeometry profile: (radius, height) pairs swept around the Y axis.
  // Closing at radius=0 caps the top and bottom geometry cleanly.
  const pinProfile = [
    new THREE.Vector2(0.00,  0.00),
    new THREE.Vector2(0.09,  0.00),
    new THREE.Vector2(0.11,  0.03),
    new THREE.Vector2(0.17,  0.12),
    new THREE.Vector2(0.195, 0.25),
    new THREE.Vector2(0.20,  0.35),
    new THREE.Vector2(0.195, 0.45),
    new THREE.Vector2(0.17,  0.58),
    new THREE.Vector2(0.13,  0.72),
    new THREE.Vector2(0.09,  0.85),
    new THREE.Vector2(0.095, 0.92),
    new THREE.Vector2(0.13,  1.02),
    new THREE.Vector2(0.135, 1.10),
    new THREE.Vector2(0.11,  1.19),
    new THREE.Vector2(0.04,  1.24),
    new THREE.Vector2(0.00,  1.25),
  ];

  const pinBodyGeo = new THREE.LatheGeometry(pinProfile, 24);
  const pinBodyMat = new THREE.MeshPhongMaterial({ color: 0xffffff, shininess: 100 });
  const pinBody    = new THREE.Mesh(pinBodyGeo, pinBodyMat);
  pinBody.castShadow    = true;
  pinBody.receiveShadow = true;

  // Neck stripe: radius (0.107) slightly exceeds the narrowest neck point (0.09) to avoid Z-fighting
  const stripeGeo = new THREE.CylinderGeometry(0.107, 0.107, 0.075, 24);
  const stripeMat = new THREE.MeshPhongMaterial({ color: 0xcc0000, shininess: 60 });
  const stripe    = new THREE.Mesh(stripeGeo, stripeMat);
  stripe.position.y    = 0.875;
  stripe.castShadow    = true;
  stripe.receiveShadow = true;

  // Template group cloned once per pin; traverse sets shadow flags on each copy
  const basePinGroup = new THREE.Group();
  basePinGroup.add(pinBody);
  basePinGroup.add(stripe);

  // Standard 1-2-3-4 triangular formation; row Z-offsets = 0.866 units (equilateral spacing)
  const PIN_Y = 0.1;
  const pinPositions = [
    { x:  0.0, z: -57.000 },
    { x: -0.5, z: -57.866 },
    { x:  0.5, z: -57.866 },
    { x: -1.0, z: -58.732 },
    { x:  0.0, z: -58.732 },
    { x:  1.0, z: -58.732 },
    { x: -1.5, z: -59.598 },
    { x: -0.5, z: -59.598 },
    { x:  0.5, z: -59.598 },
    { x:  1.5, z: -59.598 },
  ];

  pinPositions.forEach(({ x, z }) => {
    const pin = basePinGroup.clone();
    pin.position.set(x, PIN_Y, z);
    pin.traverse(child => {
      if (child.isMesh) {
        child.castShadow    = true;
        child.receiveShadow = true;
      }
    });
    scene.add(pin);
  });
}

function createBowlingBall() {
  const bowlingBallGroup = new THREE.Group();

  const ballGeo = new THREE.SphereGeometry(0.35, 32, 32);
  const ballMat = new THREE.MeshPhongMaterial({
    color: 0x1a2b8a,
    shininess: 90,
    specular: 0x4444cc
  });
  bowlingBallGroup.add(new THREE.Mesh(ballGeo, ballMat));

  // Finger holes: short dark cylinders whose outer cap sits flush with the sphere surface.
  // The cylinder centre is offset inward by half its depth from the surface contact point.
  const holeGeo = new THREE.CylinderGeometry(0.035, 0.035, 0.08, 16);
  const holeMat = new THREE.MeshPhongMaterial({ color: 0x111111, shininess: 5 });

  function addFingerHole(dx, dy, dz) {
    const dir    = new THREE.Vector3(dx, dy, dz).normalize();
    const inward = dir.clone().negate();
    const hole   = new THREE.Mesh(holeGeo, holeMat);
    hole.position.copy(dir).multiplyScalar(0.35).addScaledVector(inward, 0.04);
    hole.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), inward);
    bowlingBallGroup.add(hole);
  }

  addFingerHole( 0.25,  0.93,  0.17);  // ring finger
  addFingerHole(-0.25,  0.93,  0.17);  // middle finger
  addFingerHole( 0.00,  0.87, -0.30);  // thumb

  // Centre at Y = lane surface (0.1) + radius (0.35) = 0.45
  bowlingBallGroup.position.set(0, 0.45, 12);

  bowlingBallGroup.traverse(child => {
    if (child.isMesh) {
      child.castShadow    = true;
      child.receiveShadow = true;
    }
  });

  scene.add(bowlingBallGroup);
}

function setupUI() {
  const style = document.createElement('style');
  style.textContent = `
    .bowling-ui-card {
      position: absolute;
      background: rgba(26, 26, 46, 0.85);
      border: 1px solid rgba(255, 255, 255, 0.15);
      border-radius: 8px;
      color: #ffffff;
      font-family: Arial, sans-serif;
      pointer-events: none;
      user-select: none;
    }

    /* Scorecard – top-centre */
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

    /* Controls card – bottom-left */
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

  // Frames 1-9: two shot boxes each; frame 10: three boxes (strike/spare bonus ball)
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
      <span class="key-badge">C</span>
      <span class="control-label">Front view – neon sign</span>
    </div>
    <div class="control-row">
      <span class="key-badge">Space</span>
      <span class="control-label future">Launch ball (HW06)</span>
    </div>
    <div class="control-row">
      <span class="key-badge">← →</span>
      <span class="control-label future">Aim (HW06)</span>
    </div>
    <div class="control-row">
      <span class="key-badge">↑ ↓</span>
      <span class="control-label future">Power (HW06)</span>
    </div>`;
  document.body.appendChild(controlsCard);
}

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

function createHangingNeonSign() {
  // High-DPI canvas (2048×512) keeps text crisp at lane distances
  const canvas = document.createElement('canvas');
  canvas.width  = 2048;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  ctx.font         = "bold 160px 'Impact', 'Arial Black', sans-serif";
  ctx.textAlign    = 'center';
  ctx.textBaseline = 'middle';

  // Outer pink glow stroke
  ctx.shadowColor = '#ff007f';
  ctx.shadowBlur  = 8;
  ctx.strokeStyle = '#ff007f';
  ctx.lineWidth   = 20;
  ctx.strokeText('Ron x Dor  Bowling', canvas.width / 2, canvas.height / 2);

  // Sharp white core with minimal inner bloom
  ctx.shadowBlur  = 2;
  ctx.shadowColor = '#ffffff';
  ctx.fillStyle   = '#ffffff';
  ctx.fillText('Ron x Dor  Bowling', canvas.width / 2, canvas.height / 2);

  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter  = THREE.LinearMipmapLinearFilter;
  texture.magFilter  = THREE.LinearFilter;
  texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
  texture.needsUpdate = true;

  const signMat = new THREE.MeshPhongMaterial({
    map: texture,
    transparent: true,
    emissive: new THREE.Color(0xff007f),
    emissiveMap: texture,
    emissiveIntensity: 1.1,
    side: THREE.DoubleSide
  });

  const neonSign = new THREE.Mesh(new THREE.PlaneGeometry(5.2, 1.3), signMat);
  neonSign.position.set(0, 4.2, -30);
  scene.add(neonSign);

  // Metal mounting hardware: two vertical pillars + one horizontal cross-beam
  const metalMat = new THREE.MeshPhongMaterial({
    color: 0x222222,
    shininess: 80,
    specular: 0x555555
  });

  const pillarGeo = new THREE.CylinderGeometry(0.06, 0.06, 5.5, 16);
  [-1, 1].forEach(side => {
    const pillar = new THREE.Mesh(pillarGeo, metalMat);
    pillar.position.set(side * 2.5, 2.75, -30);
    pillar.castShadow    = true;
    pillar.receiveShadow = true;
    scene.add(pillar);
  });

  const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 5.0, 16), metalMat);
  beam.rotation.z = Math.PI / 2;
  beam.position.set(0, 5.5, -30);
  beam.castShadow = true;
  scene.add(beam);
}

// ─────────────────────────────────────────────────────────────────────────────
// Wood texture engine
// ─────────────────────────────────────────────────────────────────────────────

function createSeededRandom(seed) {
  // Mulberry32 PRNG: fast, deterministic, uniform output in [0, 1)
  let value = seed >>> 0;
  return function () {
    value += 0x6D2B79F5;
    let t = value;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shiftHexLightness(hexColor, amount) {
  const color = new THREE.Color(hexColor);
  const hsl   = {};
  color.getHSL(hsl);
  hsl.l = THREE.MathUtils.clamp(hsl.l + amount / 255, 0, 1);
  color.setHSL(hsl.h, hsl.s, hsl.l);
  return `#${color.getHexString()}`;
}

function createWoodTexture(options) {
  const canvas  = document.createElement('canvas');
  canvas.width  = 512;
  canvas.height = 2048;
  const ctx    = canvas.getContext('2d');
  const random = createSeededRandom(options.seed || 1);

  // Base fill
  ctx.fillStyle = options.baseColor;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Individual boards: randomised lightness shift, separated by a dark seam line
  const boardWidth = canvas.width / options.boardCount;
  for (let i = 0; i < options.boardCount; i++) {
    ctx.fillStyle = shiftHexLightness(options.baseColor, (random() - 0.5) * 16);
    ctx.fillRect(i * boardWidth, 0, boardWidth, canvas.height);

    ctx.strokeStyle = 'rgba(70, 40, 20, 0.20)';
    ctx.lineWidth   = 1;
    ctx.beginPath();
    ctx.moveTo(i * boardWidth, 0);
    ctx.lineTo(i * boardWidth, canvas.height);
    ctx.stroke();
  }

  // Grain streaks running along the board length
  for (let i = 0; i < 350; i++) {
    const x      = random() * canvas.width;
    const y      = random() * canvas.height;
    const length = 30 + random() * 140;
    ctx.strokeStyle = `rgba(255, 255, 255, ${random() * options.streakOpacity})`;
    ctx.lineWidth   = 1 + random() * 2;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + (random() - 0.5) * 8, y + length);
    ctx.stroke();
  }

  // Optional edge darkening (approach area uses this to fade toward the gutters)
  if (options.darkenEdges) {
    const grad = ctx.createLinearGradient(0, 0, canvas.width, 0);
    grad.addColorStop(0,    'rgba(0,0,0,0.18)');
    grad.addColorStop(0.15, 'rgba(0,0,0,0.03)');
    grad.addColorStop(0.85, 'rgba(0,0,0,0.03)');
    grad.addColorStop(1,    'rgba(0,0,0,0.18)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.anisotropy  = renderer.capabilities.getMaxAnisotropy();
  texture.encoding    = THREE.sRGBEncoding;
  texture.needsUpdate = true;
  return texture;
}
