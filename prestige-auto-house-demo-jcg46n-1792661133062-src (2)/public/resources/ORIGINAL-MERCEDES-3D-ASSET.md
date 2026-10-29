# Original Prestige Auto House Mercedes-AMG GT3 3D model

The project owner previously supplied:
- `mercedes-amg-gt3-red-bull-racing.zip`, containing `source/mercedes_benz_amg_gt3_red_bull.glb` (55,382,340 bytes, CC BY 4.0)
- `mercedes-amg-gt3-wwwvecarzcom.zip`, containing a different 22,910,368-byte GLB (CC BY-NC-SA 4.0; **do not use on a commercial website**).

The source **used by the original sunset desert / full-circle drift / drive-off / smoke reveal** must be the 55,382,340-byte Mercedes GT3 Evo model.

## Why it is split

GitHub browser uploads have a size limit, so the original, unchanged licensed GLB is divided into 3 parts:
- `mercedes-amg-gt3-evo.ccby.part1.bin` — 18,500,000 bytes
- `mercedes-amg-gt3-evo.ccby.part2.bin` — 18,500,000 bytes
- `mercedes-amg-gt3-evo.ccby.part3.bin` — 18,382,340 bytes

Place **all three files** in this `public/resources/` folder. The React component `src/PrestigeDesertDriftScene.tsx` fetches and reassembles these byte-for-byte into the original GLB on the visitor's device, then runs the Three.js animation. No ZIP extraction, conversion or extra server is needed. Before upload, the site automatically plays the existing BMW cinematic video, **not** an unrelated placeholder 3D vehicle.

SHA-256 of the assembled original GLB:
`e4b9d2bc2263a4f486c8065b1d18b8c54e7fc077d4d2751dfc64cf3d63212f99`

## Attribution (required)

Model: **Mercedes AMG GT3 Evo 2020 | www.vecarz.com**, by **vecarz** / Sketchfab.

Source: https://sketchfab.com/3d-models/mercedes-amg-gt3-evo-2020-wwwvecarzcom-39e77243109f4e5cb7134b6f31c8f619

License: Creative Commons Attribution 4.0 — https://creativecommons.org/licenses/by/4.0/

The GLB was extracted from the original ZIP and **byte-split for browser upload**; the mesh and textures were not modified. The site includes a visible credit beside the 3D scene. If a different licensed model is used later, update this attribution.

## Storyboard

1. Camera above a warm desert at sunset.
2. Mercedes-AMG GT3 drifts a complete 360-degree circle, leaving dusty smoke.
3. The car straightens and drives away into the desert along the road.
4. The smoke grows and covers the frame; scrolling reveals vehicle listings.
5. Existing BMW film remains accessible via the "WATCH FILM" selector.

The current 3D asset is approximately 55 MB; optimise meshes/textures before a high-traffic launch, or consider the cinematic film by default on slower connections.
