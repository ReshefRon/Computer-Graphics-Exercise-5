/**
 * BowlingLane – full lane infrastructure bundled as a single THREE.Group.
 *
 * Surface zones (from the bowler toward the pins):
 *   Approach (Z = +15 → Z = 0):   dark walnut, edge-darkened gradient.
 *   Lane     (Z =  0 → Z = -56.5): light maple, high-gloss.
 *   Pin deck (Z = -56.5 → Z = -60): warmer maple, slightly elevated Y.
 *
 * Additional elements:
 *   - Gutters:       dark recessed channels flanking the lane.
 *   - Foul line:     thin red bar at Z = 0.
 *   - Lane arrows:   5 amber targeting triangles at Z = -15.
 *   - Approach dots: 10 white circles in two rows at Z = 7 and Z = 12.
 *
 * Wood textures are generated procedurally via a seeded Mulberry32 PRNG so the
 * visual output is deterministic across reloads (seeds 101, 202, 303).
 *
 * @param {THREE.WebGLRenderer} renderer  Required to query max anisotropy level.
 */
export default class BowlingLane {

  /**
   * @param {THREE.WebGLRenderer} renderer
   */
  constructor(renderer) {
    /**
     * Root group for the entire lane assembly.
     * Add `lane.mesh` directly to the scene.
     * @type {THREE.Group}
     */
    this.mesh      = new THREE.Group();
    this._renderer = renderer;
    this._build();
  }

  // ── Build orchestration ────────────────────────────────────────────────────

  _build() {
    this._buildSurfaces();
    this._buildGutters();
    this._buildFoulLine();
    this._buildArrows();
    this._buildApproachDots();
  }

  // ── Surface zones ──────────────────────────────────────────────────────────

  _buildSurfaces() {
    const laneTexture = this._createWoodTexture({
      baseColor:     '#d4ae74',   /* light maple */
      boardCount:    20,
      streakOpacity: 0.07,
      darkenEdges:   false,
      seed:          101
    });

    const approachTexture = this._createWoodTexture({
      baseColor:     '#d4ae74',   /* light maple — matches the main lane for a unified floor */
      boardCount:    20,
      streakOpacity: 0.08,
      darkenEdges:   true,        /* gradient darkens toward gutter edges */
      seed:          202
    });

    const deckTexture = this._createWoodTexture({
      baseColor:     '#d9b884',   /* warmer maple for pin deck */
      boardCount:    16,
      streakOpacity: 0.06,
      darkenEdges:   false,
      seed:          303
    });

    /* ── Lane structural box (Z = 0 to Z = -60) ── */
    const laneBodyMat = new THREE.MeshPhongMaterial({
      color:     0xeaeaea,
      shininess: 60,
      specular:  new THREE.Color(0x2a2020)
    });
    const laneBody = new THREE.Mesh(new THREE.BoxGeometry(3.5, 0.2, 60), laneBodyMat);
    laneBody.position.set(0, 0, -30);
    laneBody.receiveShadow = true;
    laneBody.castShadow    = true;
    this.mesh.add(laneBody);

    /* ── Lane top surface (Z = 0 to Z = -56.5): light maple ── */
    const laneTopMat = new THREE.MeshPhongMaterial({
      color:     0xffffff,
      map:       laneTexture,
      shininess: 40,                          /* lowered to eliminate blinding specular */
      specular:  new THREE.Color(0x332211)    /* muted warm-brown highlight              */
    });
    const LANE_TOP_LENGTH = 56.5;
    const laneTop = new THREE.Mesh(
      new THREE.PlaneGeometry(3.5, LANE_TOP_LENGTH), laneTopMat
    );
    laneTop.rotation.x = -Math.PI / 2;
    laneTop.position.set(0, 0.11, -(LANE_TOP_LENGTH / 2));
    laneTop.receiveShadow = true;
    this.mesh.add(laneTop);

    /* ── Pin deck (Z = -56.5 to Z = -60): warmer maple, slightly higher Y ── */
    const deckTopMat = new THREE.MeshPhongMaterial({
      color:     0xffffff,
      map:       deckTexture,
      shininess: 35,                          /* matches muted lane look */
      specular:  new THREE.Color(0x332211)
    });
    const DECK_LENGTH = 3.5;
    const deckTop = new THREE.Mesh(
      new THREE.PlaneGeometry(3.5, DECK_LENGTH), deckTopMat
    );
    deckTop.rotation.x = -Math.PI / 2;
    /* Y = 0.112 is a hair above the lane top (0.11) to prevent Z-fighting at the seam. */
    deckTop.position.set(0, 0.112, -56.5 - DECK_LENGTH / 2);
    deckTop.receiveShadow = true;
    this.mesh.add(deckTop);

    /* ── Approach structural box (Z = 0 to Z = +15) ── */
    const approachBodyMat = new THREE.MeshPhongMaterial({
      color:     0x7b5c3c,
      shininess: 18,
      specular:  new THREE.Color(0x241b17)
    });
    const approachBody = new THREE.Mesh(new THREE.BoxGeometry(3.5, 0.2, 15), approachBodyMat);
    approachBody.position.set(0, 0, 7.5);
    approachBody.receiveShadow = true;
    approachBody.castShadow    = true;
    this.mesh.add(approachBody);

    /* ── Approach top surface (Z = 0 to Z = +15): dark walnut ── */
    const approachTopMat = new THREE.MeshPhongMaterial({
      color:     0xffffff,
      map:       approachTexture,
      shininess: 25,                          /* lowered; dark wood needs less sheen */
      specular:  new THREE.Color(0x221105)    /* very muted warm brown highlight      */
    });
    const approachTop = new THREE.Mesh(new THREE.PlaneGeometry(3.5, 15), approachTopMat);
    approachTop.rotation.x = -Math.PI / 2;
    approachTop.position.set(0, 0.11, 7.5);
    approachTop.receiveShadow = true;
    this.mesh.add(approachTop);
  }

  // ── Gutters ────────────────────────────────────────────────────────────────

  _buildGutters() {
    const GUTTER_WIDTH = 0.5;
    // Length 75 and Z centre -22.5 spans from Z = +15 (approach) to Z = -60 (pin deck)
    const gutterGeo = new THREE.BoxGeometry(GUTTER_WIDTH, 0.15, 75);
    const gutterMat = new THREE.MeshPhongMaterial({
      color:     0x222831,
      shininess: 20,
      specular:  new THREE.Color(0x0a0f15)
    });

    /* Mirror the geometry on both sides: X = ±(half-lane + half-gutter) = ±2.0. */
    [-1, 1].forEach(side => {
      const gutter = new THREE.Mesh(gutterGeo, gutterMat);
      gutter.position.set(side * (1.75 + GUTTER_WIDTH / 2), -0.025, -22.5);
      gutter.receiveShadow = true;
      gutter.castShadow    = true;
      this.mesh.add(gutter);
    });
  }

  // ── Foul line ──────────────────────────────────────────────────────────────

  _buildFoulLine() {
    /*
     * Thin red bar at Z = 0 (the legal throw boundary).
     * Y = 0.106 clears the lane-top plane (Y = 0.11) by a small offset to
     * prevent Z-fighting; the bar depth (0.01) is below the surface, letting
     * only the visible face show above the plane.
     */
    const foulLineMat = new THREE.MeshPhongMaterial({ color: 0xff1a1a, shininess: 20 });
    const foulLine    = new THREE.Mesh(
      new THREE.BoxGeometry(3.5, 0.01, 0.08), foulLineMat
    );
    foulLine.position.set(0, 0.106, 0);
    foulLine.receiveShadow = true;
    foulLine.castShadow    = true;
    this.mesh.add(foulLine);
  }

  // ── Lane arrows ────────────────────────────────────────────────────────────

  _buildArrows() {
    /*
     * 5 amber targeting triangles at Z = -15.
     * Y = 0.102 floats the flat shapes just above the lane-top plane (Y = 0.11).
     * DoubleSide ensures the arrows are visible from any camera angle.
     */
    const arrowShape = new THREE.Shape();
    arrowShape.moveTo( 0,     0.3 );
    arrowShape.lineTo(-0.08, -0.15);
    arrowShape.lineTo( 0.08, -0.15);
    arrowShape.lineTo( 0,     0.3 );

    const arrowGeo = new THREE.ShapeGeometry(arrowShape);
    const arrowMat = new THREE.MeshPhongMaterial({
      color:     0xb8860b,   /* dark goldenrod */
      shininess: 40,
      side:      THREE.DoubleSide
    });

    [0, -0.5, 0.5, -1.0, 1.0].forEach(x => {
      const arrow = new THREE.Mesh(arrowGeo, arrowMat);
      arrow.rotation.x = -Math.PI / 2;
      arrow.position.set(x, 0.102, -15);
      this.mesh.add(arrow);
    });
  }

  // ── Approach dots ──────────────────────────────────────────────────────────

  _buildApproachDots() {
    /*
     * Two rows (Z = 7 and Z = 12) of 5 white aiming dots each.
     *
     * MeshBasicMaterial is intentional: the dark walnut approach surface
     * absorbs so much light that a Phong-lit white dot would appear grey.
     * BasicMaterial ignores lighting and renders the dot at its exact colour.
     *
     * Y = 0.12 provides a generous clearance above both the approach-top plane
     * (Y = 0.11) and the foul-line bar to completely eliminate Z-fighting.
     */
    const DOT_RADIUS = 0.08;
    const dotGeo     = new THREE.CircleGeometry(DOT_RADIUS, 16);
    const dotMat     = new THREE.MeshBasicMaterial({ color: 0xffffff });

    [7, 12].forEach(z => {
      [-1.0, -0.5, 0, 0.5, 1.0].forEach(x => {
        const dot = new THREE.Mesh(dotGeo, dotMat);
        dot.rotation.x = -Math.PI / 2;
        dot.position.set(x, 0.12, z);
        this.mesh.add(dot);
      });
    });
  }

  // ── Wood texture engine ────────────────────────────────────────────────────

  /**
   * Mulberry32 seeded PRNG.
   * Fast, deterministic, and produces a uniform distribution in [0, 1).
   * Using a fixed seed guarantees the same texture on every page load.
   *
   * @param {number} seed  Unsigned 32-bit integer seed.
   * @returns {function(): number}  Stateful generator function.
   */
  _createSeededRandom(seed) {
    let state = seed >>> 0;
    return function () {
      state += 0x6D2B79F5;
      let t  = state;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  /**
   * Adjusts the HSL lightness of a CSS hex colour by a signed value
   * in the 0-255 range (positive = brighter, negative = darker).
   *
   * @param {string} hexColor  Input colour, e.g. '#d4ae74'.
   * @param {number} amount    Lightness delta in the ±127 range.
   * @returns {string}         Modified hex colour string.
   */
  _shiftHexLightness(hexColor, amount) {
    const color = new THREE.Color(hexColor);
    const hsl   = {};
    color.getHSL(hsl);
    hsl.l = THREE.MathUtils.clamp(hsl.l + amount / 255, 0, 1);
    color.setHSL(hsl.h, hsl.s, hsl.l);
    return `#${color.getHexString()}`;
  }

  /**
   * Generates a procedural wood-grain canvas texture.
   *
   * Pipeline:
   *   1. Flat base-colour fill.
   *   2. Individual boards with randomised lightness, separated by seam lines.
   *   3. Short diagonal grain streaks for visual depth.
   *   4. Optional edge-darkening gradient (used on the approach area).
   *
   * Canvas is 512 × 2048 px so grain runs along the lane length when the plane
   * UV is oriented with V along Z.
   *
   * @param {object}  options
   * @param {string}  options.baseColor      Base wood colour (CSS hex).
   * @param {number}  options.boardCount     Number of longitudinal boards.
   * @param {number}  options.streakOpacity  Maximum opacity for grain streaks.
   * @param {boolean} options.darkenEdges    Whether to add a gutter-fade gradient.
   * @param {number}  options.seed           PRNG seed (use distinct values per zone).
   * @returns {THREE.CanvasTexture}
   */
  _createWoodTexture(options) {
    const canvas  = document.createElement('canvas');
    canvas.width  = 512;
    canvas.height = 2048;
    const ctx    = canvas.getContext('2d');
    const rng    = this._createSeededRandom(options.seed || 1);

    /* Step 1: flat base colour */
    ctx.fillStyle = options.baseColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    /* Step 2: boards with per-board lightness variation + seam lines */
    const boardPx = canvas.width / options.boardCount;
    for (let i = 0; i < options.boardCount; i++) {
      ctx.fillStyle = this._shiftHexLightness(options.baseColor, (rng() - 0.5) * 16);
      ctx.fillRect(i * boardPx, 0, boardPx, canvas.height);

      ctx.strokeStyle = 'rgba(70, 40, 20, 0.20)';
      ctx.lineWidth   = 1;
      ctx.beginPath();
      ctx.moveTo(i * boardPx, 0);
      ctx.lineTo(i * boardPx, canvas.height);
      ctx.stroke();
    }

    /* Step 3: grain streaks – short diagonal lines running along the board length */
    for (let i = 0; i < 350; i++) {
      const x      = rng() * canvas.width;
      const y      = rng() * canvas.height;
      const length = 30 + rng() * 140;
      ctx.strokeStyle = `rgba(255, 255, 255, ${rng() * options.streakOpacity})`;
      ctx.lineWidth   = 1 + rng() * 2;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + (rng() - 0.5) * 8, y + length);
      ctx.stroke();
    }

    /* Step 4: optional lateral gradient to darken near the gutters */
    if (options.darkenEdges) {
      const grad = ctx.createLinearGradient(0, 0, canvas.width, 0);
      grad.addColorStop(0,    'rgba(0, 0, 0, 0.18)');
      grad.addColorStop(0.15, 'rgba(0, 0, 0, 0.03)');
      grad.addColorStop(0.85, 'rgba(0, 0, 0, 0.03)');
      grad.addColorStop(1,    'rgba(0, 0, 0, 0.18)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.anisotropy  = this._renderer.capabilities.getMaxAnisotropy();
    texture.encoding    = THREE.sRGBEncoding;
    texture.needsUpdate = true;
    return texture;
  }
}
