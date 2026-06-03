# HW05 – Bowling Alley Static Infrastructure

**Course:** Computer Graphics – Spring 2026
**Assignment:** Exercise 5 

---

## Group Members

- **Ron Reshef**
- **Dor Englender**

---

## How to Run

The project uses ES modules (`import`/`export`) for Three.js and OrbitControls, which require a proper HTTP server — opening `index.html` directly as a `file://` URL will fail with CORS errors.

**Option 1 – VS Code Live Server (recommended)**
1. Install the [Live Server extension](https://marketplace.visualstudio.com/items?itemName=ritwickdey.LiveServer).
2. Right-click `index.html` → **Open with Live Server**.

**Option 2 – Python built-in server**
```bash
# Python 3
python -m http.server 8080
# then open http://localhost:8080
```

**Option 3 – Node / npx**
```bash
npx serve .
# then open the URL printed in the terminal
```

---

## Implementation Features & Enhancements

- **Full 10-pin triangular layout** – Accurate bowling-pin silhouettes built with `THREE.LatheGeometry` from a 16-point radial profile, plus red neck stripes placed via `THREE.TorusGeometry`/`CylinderGeometry` offset to clear the body surface. All 10 pins are positioned using the standard 1-2-3-4 equilateral-triangle spacing (0.866-unit row depth).

- **Optimised static bowling ball (radius 0.35)** – Cobalt-blue `SphereGeometry` with three precisely oriented embedded finger holes. Each hole is a short `CylinderGeometry` whose outer cap is flush with the sphere surface, achieved by offsetting the cylinder centre inward by half its depth along the surface normal.

- **Advanced Procedural Wood Texture Engine** – `createWoodTexture()` generates distinct grain patterns for three surface zones at runtime using a seeded Mulberry32 PRNG (`createSeededRandom`), per-board lightness variation (`shiftHexLightness`), randomised grain-streak passes, and optional lateral edge darkening. Seeds are fixed so textures are deterministic across reloads:
  - Lane: `#d4ae74` (light maple, shininess 95)
  - Approach: `#c89e65` (dark walnut with edge vignette, shininess 70)
  - Pin Deck: `#d9b884` (warm maple, shininess 85)

- **Custom "Ron x Dor Bowling" hanging neon sign** – Rendered on a 2048×512 high-DPI canvas with a layered two-pass technique (pink glow stroke + sharp white core). Applied as both a diffuse map and an emissive map (`emissiveIntensity: 1.1`) on a `DoubleSide` `PlaneGeometry`. Suspended from dark-metal cylindrical pillars and a cross-beam.

- **Responsive 10-frame UI scorecard** – Injected as an absolute CSS overlay (top-centre). Frames 1–9 have two shot slots; frame 10 has three (for strike/spare bonus ball). A persistent controls card (bottom-left) lists all active and future hotkeys.

- **Enhanced OrbitControls** – `screenSpacePanning` enabled, inertial damping (`dampingFactor: 0.08`), zoom unlocked (`minDistance: 0.1`, `maxDistance: 150`), and two camera hotkeys:
  - **O** – toggle orbit camera on / off
  - **C** – snap to a frontal view centred on the neon sign

- **Clean, artifact-free shadow maps** – `PCFSoftShadowMap`-quality 2048×2048 shadow textures calibrated to the lane frustum; markings (foul line, arrows, dots) are Y-offset above their parent planes (`+0.002` to `+0.012`) to resolve Z-fighting without polygon-offset hacks.

---


## External Assets

All geometries, textures, and UI cards are generated entirely procedurally using **Three.js** primitives and the **Canvas 2D HTML5 API**. Camera interaction uses the bundled **OrbitControls** module. No external 3D models, downloaded image textures, or third-party rendering libraries were used.

---

## Submission Screenshots


#### 1. Overall Lane View
<div align="center">
  <img src="pics/full_scene.png" alt="Overall Lane View" width="80%">
  <p><i>Overall view of the bowling lane showcasing the complete layout with pins, distinct wood textures, and the custom hanging neon sign.</i></p>
</div>

#### 2. Close-up View of Pin Formation
<div align="center">
  <img src="pics/pins_formation.png" alt="Pin Formation Close-up" width="80%">
  <p><i>Close-up view showcasing the regulatory 10-pin triangular layout, detailed lathe geometry profiles, and independent shadow mapping.</i></p>
</div>

#### 3. Bowling Ball on Approach Area
<div align="center">
  <img src="pics/ball.png" alt="Bowling Ball on Approach" width="80%">
  <p><i>View showcasing the procedural bowling ball and embedded finger holes, sitting perfectly flush on the high-contrast dark walnut approach surface.</i></p>
</div>

#### 4. Camera Controls Demonstration
<div align="center">
  <img src="pics/side_view.png" alt="Camera Controls Demonstration" width="80%">
  <p><i>An alternative angled perspective view demonstrating full OrbitControls functionality, responsive aspect ratio rendering, and dynamic shadow frustum execution.</i></p>
</div>


#### 5. Isometric Alley Profile
<div align="center">
  <img src="pics/side_view2.png" alt="Alternative Side Profile" width="80%">
  <p><i>An alternative long-distance side profile highlighting the structural depth of the lane body and the drop-off into the recessed gutters.</i></p>
</div>

#### 6. Top-Down Orthogonal View
<div align="center">
  <img src="pics/top_view.png" alt="Top View" width="80%">
  <p><i>A strict top-down layout view verifying the perfect geometric alignment of the lane arrows, the high-contrast approach dots, and the absolute symmetry of the pin deck.</i></p>
</div>

#### 7. Custom Branding Signage Detail
<div align="center">
  <img src="pics/neon_sign.png" alt="Neon Sign Detail" width="80%">
  <p><i>Close-up inspection of the custom high-DPI canvas-generated 'Ron x Dor Bowling' sign, emphasizing the low-blur, sharp vector text, and localized self-emissive lighting filters.</i></p>
</div>