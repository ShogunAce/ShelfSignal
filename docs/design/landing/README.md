# ShelfSignal landing page

The root route `/` presents the product. `/workspace/` opens the existing inspection workflow. Both are built with the project's React, TypeScript and Vite stack and served by FastAPI. The landing page uses the supplied layout as inspiration: a centered headline, floating navigation, illuminated button edges, a curved rotating image gallery, and an application preview. The gallery has a separate control row and spacing above the application preview so controls and image content do not collide with it. It adds responsive workflow and evidence sections with original ShelfSignal copy.

The visual system uses Manrope, forest green, charcoal, ivory, and a custom shelf-position mark. The dashboard shares the same typography and colors. Approval, rejection, rescan and follow-up behavior remain unchanged. Landing comparisons are explicitly labeled synthetic previews, not live predictions. The copy contains no em dashes.

## Media

Two original images were generated through ElevenLabs Image & Video: a pantry shelf and hands photographing a shelf. The original PNGs are preserved beside this file. `provenance.json` records the exact prompts, provider-displayed model, settings, hashes, and transformations. `scripts/prepare_landing_media.py` creates the optimized WebP images, crop, and locally typeset social card. It does not call an image-generation service.

The gallery also reuses the existing ElevenLabs cereal test fixtures. The workspace preview is a real browser capture of the redesigned application processing those synthetic fixtures with AWS Lambda. All illustrative photographs are disclosed as generated. No customer results, customer logos, or real-store accuracy claims are depicted.

## Verification

`frontend/tests/landing.spec.ts` checks entry into the workspace, missing/refilled/blurred comparisons, mobile navigation and keyboard dismissal, widths from 320 to 2560 pixels, gallery pause, and reduced motion. Existing suites continue to verify the complete inspection flow locally and through AWS. `docs/evidence/landing/` contains actual browser captures and the separate regression evaluation. Source and production builds remain separate; no public hosting was added by this design change.

## Cinematic scrolling

The opening uses screen-height-aware sizing so the moving shelf photographs are visible before the first scroll, including short laptop screens and phones. Sentence-case headlines and shorter supporting copy leave the photographs in focus. Native scrolling drives the hero fade, workspace perspective entrance, photographic parallax, progress line, section rules and staggered reveals. IntersectionObserver handles reveals; passive listeners batch continuous effects into one animation frame. Reduced motion disables the movement and keeps all content readable. No scroll interception or extra animation dependency is used.

Two browser checks explicitly cover first-screen image visibility without copy overlap, and scroll reveals with reduced-motion recovery. Final captures and the separate synthetic regression run are in `docs/evidence/landing/cinematic/`.

`scroll-preview.webm` is a short recording of the actual local landing page and its native scroll transitions. The first AWS browser attempt encountered a read timeout during a synthetic refill upload; its original report is preserved in `docs/evidence/landing/cinematic/aws-first-attempt.json`.

The complete AWS browser rerun passed all fourteen checks. The local suite also passed all fourteen checks; all nineteen backend tests and the synthetic regression evaluation passed.
