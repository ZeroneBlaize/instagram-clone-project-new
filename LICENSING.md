# Licensing, Trademark Hygiene & Asset Provenance

## 1. Project License
**FrameNew** (`instagram-clone-project-new`) is licensed under the **MIT License** (see [`LICENSE`](LICENSE)).

## 2. Trademark & Brand Hygiene
This repository is an independent, educational, open-source visual social platform inspired by modern social creator feeds.
- **No Meta / Instagram Trademarks**: All third-party brand logos, verification badges, and celebrity impersonation demo data from the legacy 2023 static CodeSandbox template (`img/logo.png`, `img/verify.png`, celebrity handles) were removed.
- **Original Identity**: The application uses the original **FrameNew** wordmark, custom MIT-licensed SVG icons (`lucide-react` + `client/public/favicon.svg`), and fictional creator personas.
- **Disclaimer**: FrameNew is not affiliated with, endorsed by, or sponsored by Meta Platforms, Inc. or Instagram.

## 3. Media Asset Provenance
- Seed photographs in `client/public/media/` are freshly generated bespoke editorial visuals created specifically for this repository under MIT ownership, optimized locally, and free of third-party watermarks or copyright encumbrances.
- Seed creator avatars in `client/public/media/avatars/` are original procedural SVG vector portraits generated for this repository under the MIT License.
- User-uploaded media is stored only in runtime `server/uploads/` (gitignored) and validated via binary magic-byte inspection.

## 4. Third-Party Open-Source Dependency Policy
All runtime and development dependencies are audited with `npm run check:licenses` (`scripts/check-licenses.mjs`) to verify permissive open-source compatibility (`MIT`, `ISC`, `Apache-2.0`, `BSD-2-Clause`, `BSD-3-Clause`, `0BSD`, `CC0-1.0`, `BlueOak-1.0.0`, `Python-2.0`, `MPL-2.0` where weak-copyleft, or dual MIT/Apache). Strong copyleft (`GPL`, `AGPL`) dependencies are rejected by CI.
