# Block Away — city object pack

Open `http://localhost:8080/city-assets/` while the local web server is running. The viewer has two cities, a **“XEM TOÀN THÀNH PHỐ”** button for each shared city scene, and an individual 3D preview for each of the 30 mission landmarks.

## Contents

- `models/` — 30 standalone mission landmark models in GLB / glTF 2.0.
- `city-scenes/greenbay.glb` and `city-scenes/metrovale.glb` — composed city dioramas containing roads, parks or waterfronts, background blocks and all 15 mission landmarks for that city.
- `previews/` — one PNG per mission landmark.
- `city-scenes/*.png` — city overview screenshots.
- `tiny-blocks/tiny-block-kit.glb` and `tiny-blocks/design-spec.json` — visual reference and handoff design for the next session that arranges tiny blocks around the mission models.
- `manifest.json` — mission IDs, city grouping, level order, actual dimensions, preview/model paths and origins.

## Coordinate handoff

Mission GLBs use metres, Y-up, and place the object at ground height `Y=0`, centered in X/Z. `actualSize` in the manifest is the exported bounding-box size. Keep each source landmark GLB intact and build the tiny-block field as a separate layer on integer grid coordinates. The city overview is a presentation diorama; its landmark copies are scaled to fit a readable single view. Individual mission models preserve their intended metric dimensions.

## Visual direction

At least 80% of the mission silhouettes are intended to read as block-built objects: boxes and rectangular prisms define the main form; round geometry stays as a small secondary detail such as a wheel or lamp. The city collection progresses from street furniture to larger civic infrastructure over 15 missions per city.

Tiny blocks use a rounded cube, bright solid colors, and clean white directional marks. The exact palette, fill ratio, bevel ratio, mark scale and face rules are in `tiny-blocks/design-spec.json`.
