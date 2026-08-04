# Yunan Personal Workspace — Continuation Handoff

Updated: 2026-07-28

## How to continue in a new Codex task

Open the workspace below and ask Codex:

> 请先完整读取 `PROJECT_HANDOFF.md`，检查当前网站和素材，然后从“下一轮优先事项”继续开发。只做本地预览，不要发布。

Workspace:

`C:\Users\Yunan.Lv\Documents\Codex\2026-07-27\wo`

Local preview:

`http://localhost:3002/`

Do not publish unless Yunan explicitly asks again.

## Product goal

Build Yunan's personal website as an interactive pixel-art portfolio rather than a conventional scrolling résumé. It should present:

- Education background
- Work background
- Project experience
- Skills and working methods
- Interactive personal pixel avatar

The homepage first asks the visitor to choose education, work, or projects. After entering a branch, the visitor continues exploring its scenes with the wheel, drag, arrow keys, navigation markers, or buttons.

Polar S is only one OMTech GTM project. It must not be presented as a separate company, employer, or the entirety of Yunan's experience.

## Art direction

Primary references:

- Interaction/story rhythm: `https://2019.makemepulse.com/`
- Current overall layout and visual restraint: `https://contralabs.com/`
- Character animation craftsmanship: classic Metal Slug–like arcade pixel animation, used only as a quality reference and not copied directly

Current desired translation:

- Fresh, clean, editorial page with generous whitespace
- Strong central visual focus
- Large typography and restrained supporting content
- Minimal background decoration
- No background grid, ornamental circles, or scattered scenery
- Pixel art remains crisp and intentional
- UI may use small pixel markers and hard-edged feedback, but large sections should not all look like heavy bordered game cards
- Overall experience should feel premium and contemporary, not like a retro game interface pasted onto a résumé

## Avatar requirements

- Young East Asian man closely resembling Yunan's supplied photos
- Slim-to-average build; not overly muscular
- Short black center-parted hair
- Round-frame glasses
- Navy T-shirt
- Loose navy trousers
- Grey/green sneakers
- Pale blue crossbody backpack matching Yunan's real bag more closely
- No cat
- Avatar stays centered and keeps a constant rendered size
- Never apply CSS scaling, floating, breathing zoom, blur, antialiasing, or motion blur
- Keep hard, clear square pixels with `imageSmoothingEnabled = false` and pixelated rendering
- Leave safety margins in every sprite frame so limbs and props are not clipped
- Eyes/personal reactions may follow the pointer, but interactions must not interrupt an action already playing

## Motion rules

The avatar uses a strict FIFO action queue:

- A triggered action must finish before the next action starts
- Do not abruptly interrupt or replace the current non-looping action
- Movement sequence is `start → walk → stop → scene reaction → idle`
- Idle is the fallback when no action is pending
- Avoid hover-triggered action spam
- One wheel gesture advances only one scene
- Character position and scale remain fixed while the content changes around it

Current walking direction:

- Casual stroll, not running
- Short stride
- Knees stay low
- No airborne pose
- Upright relaxed torso
- Small opposing arm swing
- Subtle backpack inertia only
- Separate, independently drawn left and right two-step loops
- Each direction uses 8 frames at 8 FPS, one second per loop
- Page travel uses a smooth exponential convergence around 1.5 seconds

The v6 bidirectional sheet now has distinct opposite-foot silhouettes, direction-correct bag occlusion, a fixed baseline, and no high-knee or airborne frame.

## Current UX structure

1. Clean editorial intro screen
2. Branch selection hub:
   - Education
   - Work experience
   - Selected projects
3. Branch scenes with:
   - Central fixed avatar
   - Main story text near the avatar
   - Small interaction hotspots
   - Previous/next navigation
   - Wheel/drag/keyboard navigation
4. Return to branch chooser from the header

## Current implementation

Primary files:

- `app/AvatarExperience.tsx`
- `app/globals.css`
- `scripts/build_avatar_v2.py`
- `public/avatar-v2/sheets/`
- `public/avatar-v2/manifest.json`

Important source assets:

- `assets/avatar-atlas-v2.png`
- `assets/action-inbetweens-v4-source.png`
- `assets/walk-cycle-v5-source.png`
- Previous comparison sources:
  - `assets/walk-cycle-v3-source.png`
  - `assets/walk-cycle-v4-source.png`

Current sprite configuration:

- Canvas: 128 × 160 logical pixels
- Target character height: 134 pixels
- Walk: 8 frames, 6 FPS, looping
- Idle: 24 frames, 8 FPS, looping
- Start/stop: 10 frames, 12 FPS
- Other actions: 18 frames, 12 FPS, approximately 1.5 seconds
- Asset cache version in `sheetPath`: `v=8`

The sprite generator currently builds 260 frames across 17 action sheets.

## Latest completed work

- Reworked the avatar face toward a more mature, angular likeness with a longer face, clearer jawline/cheekbones, and less childlike eyes
- Added separate `walk_right` and `walk_left` sheets, each with a complete eight-frame alternating stroll
- Added directional `start_left`, `start_right`, `stop_left`, and `stop_right` choreography
- Added a 120 ms pixel-preserving blend between action sheets while retaining strict FIFO playback
- Coalesced rapid travel input so stale movement actions do not accumulate in the queue
- Verified rapid repeated wheel input advances one scene and settles back to `IDLE`
- Verified local desktop, 820 px tablet, and 390 px mobile layouts without horizontal overflow

- Replaced the previous running/high-knee walk with a lower, more relaxed walking source
- Slowed walk playback from 8 FPS to 6 FPS
- Slowed scene convergence from `6.4` to `4.2`
- Verified local state order during navigation:
  - During movement: `WALK`
  - After reaching the new scene and completing the action: `IDLE`
- Removed grid and decorative scenery from the entered experience
- Changed the intro to a clean off-white editorial composition
- Reduced heavy borders and shadows on large content regions
- Changed branch selector to a restrained vertical editorial list
- Kept the avatar centered at a fixed size
- Tightened desktop composition around a central stage
- Fixed the 721–1000px branch selector layout so it no longer overlaps the avatar
- Confirmed production build succeeds with `vinext build`

## Latest visual QA result

At a 1440 × 1000 viewport:

- Intro is clean and centered
- Branch hub has story copy on the left, avatar in the center, and three choices on the right
- Avatar pixels render crisply without CSS enlargement blur
- Work branch presents the avatar in the center with story content and interaction points around it
- Clicking Next showed `WALK` during the transition and `IDLE` after completion

## Next-round priorities

Walking direction, frame integrity, and rapid-input queue handling were completed and verified in the 2026-07-28 pass.
1. Refine scene-to-scene content choreography using Contra Labs-style restraint:
   - Text reveal timing
   - Choice hover feedback
   - Hotspot appearance
   - Background tint transitions
2. If a closer facial likeness is needed, reattach Yunan's original portrait and full-body references for an identity-locked pass
3. Replace education placeholders when Yunan provides exact resume information
4. Continue enriching work and project content without overstating Polar S

## Verification commands

Rebuild sprites:

```powershell
& 'C:\Users\Yunan.Lv\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe' scripts\build_avatar_v2.py
```

Production build:

```powershell
$env:PATH='C:\Users\Yunan.Lv\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin;C:\Users\Yunan.Lv\.cache\codex-runtimes\codex-primary-runtime\dependencies\bin\fallback;' + $env:PATH
$env:WRANGLER_LOG_PATH='.wrangler/wrangler.log'
& 'C:\Users\Yunan.Lv\.cache\codex-runtimes\codex-primary-runtime\dependencies\bin\fallback\pnpm.cmd' exec vinext build
```

Last verified result: build completed successfully.

## User-provided visual references from the previous task

Original photos and screenshots were supplied through temporary clipboard paths. Temporary files may disappear, so the persistent project assets above should be used first. If a new likeness or outfit pass is required, ask Yunan to attach the two original portrait/full-body photos again.

The latest generated walking source was created with built-in image generation using the current avatar and prior walk sheet as references. Prompt intent: an eight-frame, fixed-scale, fixed-baseline, low-knee casual strolling cycle with no run, bounce, blur, antialiasing, or extra objects.

## 2026-07-28 outfit, gait, and wardrobe pass

Completed locally; nothing was published.

- Added three complete outfit states: `student` graduation gown, `formal` work suit, and `casual` current-day clothes
- Added independently drawn left- and right-facing 16-frame walks for every outfit (96 source walk poses total)
- Raised walk playback from 8 fps / 8 frames to 12 fps / 16 frames; start and stop transitions now use 12 frames
- Built `public/avatar-v3` with 852 total frames across 3 outfits and 17 actions
- Every generated frame is normalized to a 128 × 160 canvas, ground line `y=153`, with at least 6 px transparent safety margin on all four sides
- The builder now fails if a frame is empty, touches the safety boundary, or misses the common shoe-sole baseline
- Branch outfit mapping: Education → graduation gown; Work → formal suit; Projects → casual outfit
- Added an interrupt-locked wardrobe state machine: walk in → curtain closes → outfit changes while hidden → curtain opens → walk out
- Enlarged the fitting-room curtain after QA so the entire character, including cap, tassel, hands, bag, gown and shoes, is hidden during the intentional change
- Forced `overflow: visible`, removed clipping/containment from avatar stage/button/canvas, and verified extended point/walk poses remain complete

### New persistent source assets

- `assets/avatar-student-action-v1-source.png`
- `assets/avatar-formal-action-v1-source.png`
- `assets/walk-casual-left-v1-source.png`
- `assets/walk-casual-right-v1-source.png`
- `assets/walk-student-left-v1-source.png`
- `assets/walk-student-right-v1-source.png`
- `assets/walk-formal-left-v1-source.png`
- `assets/walk-formal-right-v1-source.png`

### Latest local QA

- Production build passed after the final CSS adjustment
- Desktop local preview verified casual, graduation, and formal completed states
- Desktop verified curtain-closed state does not expose shoes or limbs
- Desktop verified both student left and right travel poses stay on the shared ground line
- Mobile 390 × 844 verified the avatar and curtain remain inside the viewport without cropping
- Browser console showed no site runtime errors

### Revised next-round priorities

1. Add more scene-specific non-walking gestures for graduation and formal branches if additional narrative detail is desired
2. Refine content reveal timing and hotspot choreography now that outfit switching is stable
3. Replace education placeholders when exact resume information is available
4. For an even tighter facial likeness pass, reattach the original portrait/full-body references

### Avatar v3 rebuild command

```powershell
& 'C:\Users\Yunan.Lv\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe' scripts\build_avatar_v3.py
```

## 2026-07-28 slower integrated wardrobe pass

- Reduced idle playback to 6 fps and all walk, start, stop, and gesture playback to 8 fps
- Extended the wardrobe sequence to about 5 seconds: current outfit walks in, curtains close in 8 pixel steps, a fully closed hold switches clothing, curtains open in 8 pixel steps, and the new outfit walks out
- Added explicit `closed` and `exiting` phases so outfit switching and avatar movement cannot overlap visibly
- Every branch selection now plays the complete wardrobe sequence, including when the target outfit is already active
- Avatar travel uses 16 discrete pixel steps rather than continuous easing; each phase begins at the previous phase's exact transform to avoid position teleporting
- Restored the casual walking shirt to the approved dark-navy palette while preserving the light-blue crossbody bag and strap
- Applied the same subtle 6% head-width reduction to all three outfits and every action/walk frame for a slimmer, more angular, identity-consistent face
- Rebuilt all 852 frames; ground line remains `y=153`, with at least 6 px safety margin on every side
- Final production build and rendered HTML test both pass; no publishing was performed

## 2026-07-28 source-image cleanup and integrated changing scene

- Replaced the casual left/right walk sources with fully redrawn v2 atlases; the entire shirt, including both sleeves and shoulder, is consistently dark navy while the bag and strap remain pale blue
- Removed the runtime/programmatic casual-shirt recoloring pass; clothing color now comes directly from the approved source images
- Removed the procedural head-width transform that cut holes into the graduation cap and tassel
- Replaced the separate CSS booth/curtains with three 16-frame bitmap scenes in which character, booth, curtains, entry, full concealment, outfit switch, and exit are generated together
- The integrated changing animation runs at 4 fps (4 seconds total), using frames 0-8 from the current outfit and 9-15 from the target outfit; clothing switches only while the curtain is fully closed
- Whole source cells use a shared fixed transform and are never cropped/recentered per frame, preventing booth movement or character teleporting
- Tightened magenta-key removal while preserving burgundy curtain and dark-blue cap/tassel pixels; tiny row-boundary bleed components are removed during packaging
- `public/avatar-v3` now contains 900 validated frames across three outfits, including the three wardrobe sheets
- Desktop local preview verified casual-to-graduation and graduation-to-formal transitions, fully closed curtain frames, final graduation cap/tassel, final formal suit, no edge clipping, and no pale-blue casual sleeve exposure
- Production build and rendered HTML test pass; nothing was published

### New persistent source assets

- `assets/walk-casual-left-v2-source.png`
- `assets/walk-casual-right-v2-source.png`
- `assets/wardrobe-casual-v1-source.png`
- `assets/wardrobe-student-v1-source.png`
- `assets/wardrobe-formal-v1-source.png`

## 2026-07-28 fixed-axis and transition-occlusion correction

- Replaced per-pose bounding-box centering with a shared lower-body pivot; all normal action and walk frames now anchor around `x=63-64`
- Before correction, the casual wave route's lower-body center jumped between roughly `x=46` and `x=69`; after correction all three outfits stay within about one pixel of the shared axis
- Scale calculation now uses maximum left/right reach from the fixed pivot, preserving raised hands, pointing arms, graduation caps, tassels and extended walk poses inside the 6 px safety zone
- Removed the 0.12-second alpha crossfade between actions because it created pale duplicate silhouettes behind hats, shoes and bodies during navigation
- Raised the avatar stage above story content and clipped story-card travel to the left content panel, preventing text and character from crossing or covering each other during scene transitions
- Rebuilt 900 frames, passed the production build and rendered HTML test, and verified the education scene transition in the local browser without axis shake, ghosting, clipping or overlap

## 2026-07-28 scene registration and walk-scale normalization

- Measured the separately generated casual walk frames at 115-125 px tall versus the 135 px standing frame; normalized every walk source frame to its outfit's standing height before final rendering
- Final casual idle/left/right frames are all exactly 135 px tall at top `y=18`; student walk varies by at most 1 px around 140 px, and formal walk varies by at most 1 px around 141 px
- Detected that the generated integrated booth shrank from roughly 172 px to 153 px and drifted horizontally between atlas rows
- Registered every integrated wardrobe frame from the booth's largest solid component to a fixed 172 px booth height and fixed anchor: top `y=30`, right `x=220`, bottom `y=202`
- The complete person+curtain bitmap is transformed together, preserving the integrated-scene requirement while eliminating booth and scene wobble
- Removed automatic semantic gestures from page entry, branch completion, return-to-hub and stop completion; those states now settle to idle
- Scene navigation now uses only start/walk/stop/idle automatically; read, point, type, wave and other gestures play only after explicit character or hotspot interaction
- Production build and rendered HTML test pass; local browser verified entry idle and the clean `walk_right -> stop_right -> idle` navigation sequence

## 2026-07-28 compact avatar and option-only interaction pass

- Reduced desktop avatar display from 384 x 480 to 320 x 400 and mobile from 256 x 320 to 224 x 280; character remains centered in the lower-middle stage
- Reduced the integrated wardrobe display to 520 px desktop / 346 px mobile and applied a fixed horizontal offset so the final exit character center aligns with the normal avatar center
- Curated generated walk atlases to remove mixed-viewpoint identity drift: casual right uses its stable side-view 8-step cycle; formal left/right use their consistent first 8-step cycles; each is repeated to preserve a 16-frame sheet
- Scaled detached formal exit characters to the shared wardrobe character height and baseline before compositing, reducing outfit-handoff size changes
- Shortened start and stop sheets from 12 to 6 frames; wardrobe completion now plays `stop_left` before settling to idle instead of switching directly from the integrated walking frame to normal idle
- Removed avatar click interaction, wheel navigation, drag navigation and keyboard navigation; only explicit branch, hotspot, scene, next/previous and route option buttons can trigger state changes
- Hotspot options trigger one action only when the character is idle; they no longer queue a second scene action
- Navigation ignores additional commands while travel is active, preventing repeated clicks from overwriting or duplicating the action queue
- Final sprite build contains 828 validated frames. Production build and rendered HTML test pass
- Local browser verified the smaller stage composition, wardrobe-to-normal stop handoff, and rapid double-click behavior resolving once as `walk_right -> stop_right -> idle`

## 2026-07-28 fixed-scale 16-frame refinement pass

- Reduced the normal avatar to an exact 2x pixel presentation: 256 x 320 desktop and 192 x 240 mobile; the character remains in the lower-middle of the page
- Replaced the curated/repeated walk cycles with real 16-pose source atlases for casual right and formal left/right walking
- Added core-body measurement through the lower-body pivot so extended arms, pointing, waving and wide steps cannot change the perceived character scale
- Normalized every outfit and every normal action to a shared final 127 px head-to-shoe core height; student source rounding is limited to a single pixel
- All 828 normal and wardrobe frames retain the fixed `y=153` shoe baseline and at least 6 px safety margin; both left and right walk sheets contain 16 unique frames per outfit
- Reduced the integrated wardrobe scene to 384 px desktop / 288 px mobile so the person inside the combined curtain scene no longer appears larger than the normal avatar
- Bumped sprite cache keys to v11 so the local preview cannot mix old enlarged sheets with corrected sheets
- Production build and rendered HTML test pass
- Local browser verified casual, graduation and formal at the same 256 x 320 canvas size with no CSS transform; action playback stays fixed-size and reverse navigation resolves once as `walk_left -> stop_left -> idle`
- Nothing was published

### New persistent source assets

- `assets/walk-casual-right-v3-source.png`
- `assets/walk-formal-right-v2-source.png`
- `assets/walk-formal-left-v2-source.png`

## 2026-07-28 ultra-smooth 32-frame walk pass

- Expanded every outfit and direction from 16 to 32 genuinely distinct walk drawings by interleaving 16 calibrated main poses with 16 generated in-between poses
- Walk playback now runs at 16 fps while preserving an approximately two-second gait cycle; the character moves through heel strike, foot-flat, passing and toe-off stages instead of skipping directly between major poses
- Expanded both start and stop transitions from 6 to 8 unique frames and raised them to 12 fps
- Slowed scene travel easing from `4.2` to `2.5`, giving the full walk cycle enough time to play before the stop sequence
- Final travel rhythm is approximately 0.67 seconds start, 3 seconds continuous walking, and 0.67 seconds stop
- Rebuilt 948 safe frames across the three outfits; all normal frames retain the fixed `y=153` shoe baseline and shared 127 px core height (student left has a maximum one-pixel source rounding difference)
- Verified every left/right walk sheet is 32/32 unique and every start/stop sheet is 8/8 unique
- Local browser verified the sequence `walk_right -> stop_right -> idle`, constant 256 x 320 display size, and no runtime canvas transform
- Sprite cache version advanced to v12; nothing was published

### New persistent source assets

- `assets/walk-casual-right-inbetweens-v1-source.png`
- `assets/walk-casual-left-inbetweens-v1-source.png`
- `assets/walk-student-right-inbetweens-v1-source.png`
- `assets/walk-student-left-inbetweens-v1-source.png`
- `assets/walk-formal-right-inbetweens-v1-source.png`
- `assets/walk-formal-left-inbetweens-v1-source.png`

## 2026-07-28 native-pixel scale, constant-speed travel, and 32-frame wardrobe pass

- Reduced the avatar to its native 1x canvas size: 128 x 160 on desktop and mobile; this is the sharpest possible presentation for the current raster sheets and uses no fractional or browser interpolation scaling
- Added a final post-height head-width normalization pass for every left/right walk frame, reducing the remaining perceived scale pulse to roughly 1-2 output pixels of pose-dependent rounding
- Replaced exponential scene easing with constant chapter-space velocity (`0.38` chapters/second), eliminating the apparent fast-then-slow foot sliding while keeping fixed 16 fps leg animation
- Expanded all three integrated person+curtain wardrobe scenes from 16 frames / 4 fps to 32 unique frames / 8 fps while preserving the same four-second total duration
- Widened only the transparent wardrobe canvas from 256 to 320 px to contain full exit poses; booth/person scale is unchanged and the rendered scene remains 0.75x at 240 x 156
- Registered every wardrobe booth to a shared `(237, 197)` anchor on the wider canvas; largest solid booth component stays within approximately x=236-238 and y=196-198 after output rounding
- Rebuilt 996 validated frames; all normal frames retain the fixed y=153 shoe baseline and shared 127 px core height
- Local browser verified native 128 x 160 avatar geometry, no transform, fully closed curtain concealment, final graduation handoff, and constant-step scene progress
- Sprite cache version advanced to v13; nothing was published

### New persistent source assets

- `assets/wardrobe-casual-inbetweens-v1-source.png`
- `assets/wardrobe-student-inbetweens-v1-source.png`
- `assets/wardrobe-formal-inbetweens-v1-source.png`

## 2026-07-29 resume content integration

- Integrated `吕雨南_中文简历.pdf` into the existing education, work, and projects branches
- Education now presents the University of Amsterdam master's degree and CUHK-Shenzhen bachelor's degree as separate scenes
- Work now presents OMTech, CUHK Business School, and Mercado Libre as three chronological experience scenes
- Projects now present the OMTech K40 growth program, the reusable AI operations system, and this interactive personal workspace
- Each scene has three resume-specific exploration points; selecting one plays a matching existing avatar action such as read, type, point, look, glasses, or celebrate
- Preserved all existing avatar, outfit, walking, wardrobe, and sprite assets; no image source was regenerated or replaced
- Removed placeholder education copy and generic work copy from the active branches
- Local production build and rendered HTML test pass
- Nothing was published

## 2026-07-29 wheel navigation and motion consistency pass

- Restored wheel-driven navigation inside education, work, and project branches
- Wheel down advances one scene with `start_right -> walk_right -> stop_right -> idle`; wheel up reverses with the corresponding left sequence
- Avatar horizontal position now follows chapter progress, so it visibly travels right through later scenes and returns left through earlier scenes
- Added wheel accumulation and cooldown so one gesture advances only one resume scene
- Replaced floating resume hotspots with an editorial timeline list inside each scene; each fact remains clickable and plays its matching existing avatar action
- Preloads idle, left/right walk, start, stop, and wardrobe sheets for every outfit before enabling the experience
- Verified all three wardrobe sheets contain 32 distinct frames with consistent dimensions; the main module-click stutter was caused by 8 fps wardrobe playback rather than missing or mismatched frames
- Raised wardrobe playback from 8 fps to 16 fps, walk playback from 16 fps to 20 fps, and start/stop playback from 12 fps to 16 fps
- Scene travel begins gently during the start animation, then continues at a constant faster walk speed instead of pausing before movement
- Local browser verified module switching settles from `CHANGING` to the correct outfit `IDLE`, wheel down resolves to scene 02 with right-facing motion, and wheel up returns to scene 01 with left-facing motion
- Local build and rendered HTML test pass; nothing was published

## 2026-07-29 visual-stutter root-cause fix and resume-copy cleanup

- Replaced narrative embellishments in the education, work, and project branches with wording taken directly from `吕雨南_中文简历.pdf`
- Removed the invented `Personal Workspace` project entry; active project scenes now cover only the K40 growth program and AI-driven operations workflow from the resume
- Confirmed that the remaining visual stutter was not caused by a simple frame-rate mismatch: the wardrobe builder had interleaved two source atlases cell-for-cell even though their poses were not matching temporal midpoints, and their final rows needed reverse chronological playback
- Rebuilt each 32-frame wardrobe sequence in actual action order; casual, graduation, and formal exit openings now use outfit-specific ordering, followed by a correctly reversed walking-away row
- Aligned normal transitions to the source poses: the last start pose connects to walk frame 5/6, and arrival switches immediately into the stop sequence whose first pose matches walk frame 26
- Wardrobe playback remains 16 fps, walk playback 20 fps, start/stop playback 16 fps, and gestures 10 fps
- Rebuilt 996 validated frames and advanced the sprite cache key to v14
- Production build and rendered HTML test pass; local browser verified module change, right travel, left travel, arrival, and idle states
- Nothing was published

## 2026-07-29 walk-cycle temporal-order repair

- Confirmed that adding more drawings was not the solution: all six directional walk sheets already contained 32 distinct frames, but the generated in-between atlases were not indexed as true temporal midpoints
- Measured adjacent-frame discontinuities across casual, graduation, and formal outfits; the worst head-position jump reached roughly 7 px and several cycles visibly advanced, recoiled, then advanced again
- Reordered all six 32-frame cycles by audited silhouette and torso continuity while retaining every source drawing, then rotated each loop so it begins at the pose closest to idle
- Reduced median full-body centroid movement to approximately 0.7–0.9 px for most cycles; graduation-left median dropped from 0.97 px to 0.68 px and its head-jump maximum dropped from 3.74 px to 2.23 px
- Added a 120 ms action handoff blend for idle/start, start/walk, walk/stop, and stop/idle transitions so arrival at an arbitrary gait phase no longer hard-cuts to the stop sheet
- Advanced sprite cache keys to v15 and rebuilt 996 validated frames
- Production build, rendered HTML test, and local browser right/left/idle state checks pass; nothing was published

## 2026-07-29 self-timed travel and wardrobe animations

- Replaced runtime-stepped navigation playback with one self-timed transparent animation asset per outfit and direction
- Every scene move now triggers a complete 2.4-second `start -> walk -> stop` animation; browser image decoding owns frame timing instead of the React animation loop
- Avatar translation uses the same fixed timeline: 0.4 seconds to start, 1.6 seconds of constant travel, and 0.4 seconds to stop, so every adjacent scene move has identical speed and duration
- Packaged wardrobe changes as complete source-to-target transparent animations for all nine outfit combinations
- Every wardrobe change now runs for exactly 1.92 seconds, switches outfit at 0.96 seconds, and enters the selected branch only after the animation finishes
- Added restrained motion lighting: a breathing ambient glow and soft ground shadow during travel, plus a short light sweep and depth shadow during wardrobe changes
- Added reduced-motion fallbacks for the new decorative lighting
- Advanced animation cache keys to v16; production build and rendered HTML test pass
- Local browser verified wardrobe changing/idle states, fixed-duration travel in both active and final states, scene arrival, and active travel-light/travel-shadow effects
- Nothing was published

## 2026-07-29 direct animated-layer and high-frame-rate fix

- Found why the first self-timed version appeared frozen: animated PNGs were being sampled into Canvas, which preserved only the currently decoded bitmap instead of reliably presenting the animation timeline
- Travel and wardrobe assets now render as direct visible browser image layers; Canvas is hidden during complete travel playback and remains responsible only for idle and ordinary interaction poses
- Increased each complete travel motion from 48 source poses to 72 temporally blended motion frames at 30 fps while preserving the fixed 2.4-second duration
- Increased each wardrobe motion from 32 source poses to 60 temporally blended motion frames at 31.25 fps while preserving the fixed 1.92-second duration
- Added quiet final-frame buffers to both asset types so delayed UI callbacks cannot expose an animation restart seam
- Advanced animation cache keys to v17 and rebuilt 1,536 validated motion frames across the three outfits
- Production build passes
- Local browser verified that the visible travel layer is loaded at 128 x 160 while Canvas is hidden, and that the visible wardrobe layer is loaded at 320 x 208 with synchronized `wardrobe-light`
- Nothing was published

## 2026-07-29 generated complete gait cycle and Canvas removal

- Confirmed the perceived scaling was inside the motion artwork: the previous start sequence changed visible width from roughly 46 px to 72 px and back within the first few frames, while blended in-betweens double-exposed two silhouettes
- Generated a new three-outfit pixel-art gait source with complete heel-contact, compression, passing, lift, opposite-contact, and return phases using the built-in image generation workflow
- Saved the project-bound generated source as `assets/walk-cycles-generated-v1-source.png` and its locally chroma-keyed alpha version as `assets/walk-cycles-generated-v1-alpha.png`
- Replaced the prior 32-frame nearest-neighbor/TSP walk sources with the generated ten-key-pose chronological cycles; right-facing motion is an exact mirror of left-facing motion
- Locked generated walking sprites to each outfit's idle core height and head width before rendering
- Removed false blended in-betweens; the final 30 fps asset presents hand-drawn key poses on twos rather than overlapping two bodies
- Removed avatar and wardrobe Canvas elements from the character stage entirely; idle, gestures, walking, and wardrobe changes now all play as direct animated PNG image layers
- Advanced direct-animation cache keys to v18 and rebuilt 1,404 validated frames
- Production build and rendered HTML test pass
- Local browser verified zero Canvas elements in the character stage, direct 128 x 160 graduation travel playback, fixed 128 x 160 rendered geometry before and after travel, and direct idle handoff
- Nothing was published
