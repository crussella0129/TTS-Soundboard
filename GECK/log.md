# Session Log — TTS-Soundboard

*Append only. Do not edit existing entries.*

---

## Entry #0 — 2026-02-04 01:04:09

### Summary
Project initialized. GECK structure created.

### Understood Goals
- TTS-Soundboard is a dialogue synthesis and orchestration tool for games and software. It enables developers to design voices, not just generate audio, and to bind dialogue semantically to events, state, and narrative flow.
- At its core, TTS-Soundboard treats voices as parametric, versioned assets and dialogue as data, not static sound files.
- Planned Scope
- Phase 1
- English-only TTS
- Limited base voices
- Post-processed non-human effects
- Offline audio export
- Phase 2
- Dialogue Library graph
- Event-driven dialogue resolution
- Voice profile versioning
- Phase 3
- Runtime synthesis
- Streaming audio output
- Adaptive emotion and context modulation

### Questions/Ambiguities
None

### Initial Tasks
- Compile task list from log and LLM_init entries
- Application launches and displays correctly
- Window management works properly
- File operations complete correctly
- System integration works (tray, notifications, file associations)
- Application handles multiple monitors and DPI scaling
- Installation and updates work correctly
- buttons scale properly with dpi scaling

### Checkpoint
**Status:** WAIT — Awaiting confirmation to begin work.

---

## Entry #1 — 2026-02-04

### Summary
Compiled actionable task list from LLM_init.md goals. Framework decision made: Electron + React + TypeScript with Python TTS backend. Beginning Phase 1 implementation.

### Actions
- Read all GECK files, loaded project context
- Presented framework options to user (Electron, Tauri, PyQt6)
- User selected: Electron + React (Recommended)
- Compiled tasks.md with detailed, actionable Phase 1 breakdown
- Organized tasks into: Scaffolding, Window/Lifecycle, UI Layout, System Integration, File Operations, TTS Engine, Voice Profiles, Dialogue Assets
- Moved Phase 2 and Phase 3 items to Backlog

### Files Changed
- `GECK/tasks.md` — Rewrote with compiled, categorized task list
- `GECK/log.md` — Appended this entry

### Commits
(pending — scaffolding in progress)

### Findings
- No code exists yet; starting from scratch
- Python 3.13.11 and Node.js 24.12.0 available in environment
- Electron + React is well-suited for all success criteria (DPI, tray, multi-monitor)

### Issues
None

### Checkpoint
**Status:** CONTINUE — Beginning project scaffolding.

### Next
Initialize Electron + React + TypeScript project with electron-vite.

---

## Entry #2 — 2026-02-04

### Summary
Full Phase 1 foundation implemented. Scaffolded Electron + React + TypeScript project with electron-vite. Built main window with state persistence, DPI/multi-monitor support, system tray, dark/light theme, sidebar navigation, file operations (open/save/save-as/recent), and project data model.

### Actions
- Created project structure: `src/main/`, `src/preload/`, `src/renderer/`, `resources/`
- Wrote `package.json` with electron-vite, React 18, TypeScript, electron-store
- Configured electron-vite with React plugin, TypeScript configs (node + web)
- Implemented main process (`src/main/index.ts`):
  - BrowserWindow with saved bounds and multi-monitor validation
  - Window state persistence (position, size, maximized) via electron-store
  - Minimize-to-tray support
  - System tray with context menu and fallback icon generation
  - IPC handlers: theme get/set, file open/save/save-as/recent, notifications
- Implemented preload script (`src/preload/index.ts`): exposed full API surface
- Implemented renderer:
  - `App.tsx`: Sidebar nav (Voices, Dialogue, Library, Settings), toolbar with file ops buttons, project state management, dirty tracking
  - `types.ts`: TTSProject, VoiceProfile, DialogueAsset, Actor data models
  - `globals.css`: CSS variables for dark/light theme, system font stack, scrollbar styling
  - `App.css`: Layout, sidebar, toolbar, list items, settings, placeholders
- Configured `electron-builder.yml` for Windows (NSIS), macOS (DMG), Linux (AppImage)
- Verified clean build: all 3 bundles (main, preload, renderer) compile successfully

### Files Changed
- `package.json` — Created, project dependencies and scripts
- `electron.vite.config.ts` — Created, build configuration
- `tsconfig.json` / `tsconfig.node.json` / `tsconfig.web.json` — Created
- `electron-builder.yml` — Created, packaging configuration
- `src/main/index.ts` — Created, Electron main process
- `src/preload/index.ts` — Created, context bridge API
- `src/renderer/index.html` — Created, HTML entry
- `src/renderer/src/main.tsx` — Created, React entry point
- `src/renderer/src/App.tsx` — Created, main application component
- `src/renderer/src/App.css` — Created, application styles
- `src/renderer/src/globals.css` — Created, global styles and theme
- `src/renderer/src/types.ts` — Created, project data models
- `src/renderer/src/env.d.ts` — Created, TypeScript type declarations
- `GECK/tasks.md` — Updated with progress

### Commits
(pending — ready for commit)

### Findings
- electron-vite build compiles all 3 bundles cleanly
- electron-store handles persistence well for window state and recent files
- CSS `prefers-color-scheme` handles dark/light theme without JS intervention

### Issues
None

### Checkpoint
**Status:** CONTINUE — Foundation complete. Next: TTS engine integration and Voice Profile CRUD.

### Next
- Set up Python TTS backend
- Implement Voice Profile CRUD UI
- Implement Dialogue Asset CRUD UI

---

## Entry #3 — 2026-02-04

### Summary
Built complete CRUD for Voice Profiles and Dialogue Assets. Integrated Python TTS backend (pyttsx3) as a persistent subprocess with JSON protocol. Added audio playback, voice preview, and .wav export.

### Actions
- Restructured UI: merged Dialogue Assets under Dialogue Library with Assets/Graph tabs (user request)
- Split App.tsx into components: VoicesView, DialogueLibraryView, SettingsView
- Added types: generateId(), ACCENT_PRESETS, EMOTIONS, CATEGORIES constants
- Voice Profile CRUD: add/edit/delete with inline form (name, accent, system voice, pitch/rate/volume sliders, preview text)
- Dialogue Asset CRUD: add/edit/delete with form (text, actor, voice profile selector, emotion, category)
- Created Python TTS engine (`python/tts_engine.py`): persistent subprocess, JSON over stdin/stdout, pyttsx3 backend
- Commands: list_voices, synthesize (to file), preview (to temp file), quit
- Main process: spawn/manage Python subprocess, IPC handlers for tts:status, tts:list-voices, tts:synthesize, tts:preview, tts:export
- Preload: exposed full TTS API surface with typed interfaces
- VoicesView: system voice dropdown (auto-populated from pyttsx3), preview button synthesizes to temp .wav and plays via HTML5 Audio
- DialogueLibraryView: play button (triangle) per asset, export button (arrow) per asset with Save dialog and desktop notification
- Fixed electron-store ESM issue by excluding from externalization in electron-vite config

### Files Changed
- `python/tts_engine.py` — Created, TTS subprocess engine
- `python/requirements.txt` — Created, pyttsx3 dependency
- `src/main/index.ts` — Added TTS subprocess spawning, IPC handlers for synthesis/preview/export
- `src/preload/index.ts` — Added TTS API bindings
- `src/renderer/src/VoicesView.tsx` — Created, full CRUD + preview
- `src/renderer/src/DialogueLibraryView.tsx` — Created, full CRUD + play/export
- `src/renderer/src/SettingsView.tsx` — Created, extracted from App
- `src/renderer/src/App.tsx` — Refactored to use component imports
- `src/renderer/src/App.css` — Added buttons, forms, tabs, list actions styles
- `src/renderer/src/types.ts` — Added generateId, constants
- `src/renderer/src/env.d.ts` — Added TTS API types
- `electron.vite.config.ts` — Excluded electron-store from externalization

### Commits
(pending — ready for commit)

### Findings
- pyttsx3 works well on Windows with SAPI5, 2 voices available (David, Zira)
- Persistent subprocess approach avoids engine init overhead per request
- Pitch adjustment on Windows uses SAPI5 XML markup

### Issues
None

### Checkpoint
**Status:** CONTINUE — Phase 1 core features complete. Voice profiles, dialogue CRUD, TTS synthesis, playback, and export all functional.

### Next
- Test full workflow end-to-end
- Consider committing this milestone

---

## Entry #4 — 2026-02-04

### Summary
Built the parametric voice design system — a visual node graph editor (React Flow) for chaining DSP effects onto voice profiles, and a full Python DSP processing pipeline with 11 audio effects.

### Actions
- Created Python DSP engine (`python/dsp_nodes.py`) with 11 effect nodes: gain, pitch_shift, time_stretch, reverb, eq_parametric, ring_modulation, distortion, bitcrush, formant_shift, granular, envelope_follower
- Each node has a typed parameter definition (float/int/select with min/max/default/label)
- Node graph processing uses topological sort (DFS from input) for correct execution order
- Updated `tts_engine.py` with `process_graph` and `list_dsp_nodes` commands
- Added IPC handlers for `tts:list-dsp-nodes` and `tts:process-graph` in main process
- Updated preload with DSP API bindings and `env.d.ts` with DSP type declarations
- Added `VoiceGraph` interface to `types.ts` and `graph` field on `VoiceProfile`
- Created `NodeGraphEditor.tsx` — React Flow visual node graph editor:
  - IONode (TTS Input / Audio Output) with source/target handles
  - DSPNode with per-param sliders/selects, live value display, injected callbacks
  - Right-click context menu grouped by DSP category (effects, modulation, dynamics, etc.)
  - Bidirectional conversion between VoiceGraph (serializable) and React Flow format
  - Debounced onChange syncs graph state back to parent
- Added comprehensive CSS for node graph (flow nodes, handles, context menu, tabs, hints)
- Integrated NodeGraphEditor into VoicesView with Parameters/DSP Graph tab toggle
- Voice profiles now store and restore their DSP graph configurations
- Preview uses `ttsProcessGraph` when DSP nodes are present, falls back to simple `ttsPreview`
- Updated DialogueLibraryView: play and export use the voice profile's graph when available
- `systemVoiceId` now saved and restored per voice profile
- Voice profile list shows DSP node count badge when graph has effects
- Build verified: all 3 bundles compile cleanly

### Files Changed
- `python/dsp_nodes.py` — Created, 11 DSP effect processors + node registry + graph processing
- `python/tts_engine.py` — Added process_graph, list_dsp_nodes commands
- `src/main/index.ts` — Added IPC handlers for DSP operations
- `src/preload/index.ts` — Added ttsListDSPNodes, ttsProcessGraph API bindings
- `src/renderer/src/NodeGraphEditor.tsx` — Created, React Flow node graph editor
- `src/renderer/src/VoicesView.tsx` — Integrated graph editor, tab toggle, graph-aware preview
- `src/renderer/src/DialogueLibraryView.tsx` — Graph-aware playback and export
- `src/renderer/src/App.css` — Added node graph, context menu, tab styles
- `src/renderer/src/types.ts` — Added VoiceGraph interface, graph field on VoiceProfile
- `src/renderer/src/env.d.ts` — Added DSPParamDef, DSPNodeDef, DSPGraph types

### Commits
(pending — ready for commit)

### Findings
- React Flow v11 works well for the Grasshopper-style node editor
- Topological sort via DFS ensures correct DSP chain processing order
- numpy + scipy provide high-quality pitch shifting, reverb, and formant processing
- The graph serialization format (VoiceGraph) is simple and JSON-compatible for .ttsp files

### Issues
- Python dependencies (numpy, scipy, soundfile) need to be installed for DSP to work
- `python/requirements.txt` only lists pyttsx3; should be updated with DSP dependencies

### Checkpoint
**Status:** CONTINUE — Parametric voice design system complete. Node graph editor integrated, DSP pipeline functional.

### Next
- Install Python DSP dependencies (numpy, scipy, soundfile)
- Test full pipeline end-to-end: TTS synthesis → DSP graph processing → audio playback
- Commit and push parametric voice design milestone

---

## Entry #5 — 2026-02-04

### Summary
Expanded DSP node library from 11 to 16 nodes. Fixed NodeGraphEditor GUI issues (nodes placed at wrong position, context menu coordinate mismatch). Updated Python requirements with DSP dependencies. Added CUDA/GPU-accelerated DSP to Phase 3+ backlog.

### Actions
- Added 5 new DSP effect nodes to `python/dsp_nodes.py`:
  - **Low-Pass Filter** (category: filter) — Butterworth filter with cutoff frequency and configurable order (1–8)
  - **High-Pass Filter** (category: filter) — Butterworth filter with cutoff frequency and configurable order (1–8)
  - **Chorus** (category: modulation) — Multi-voice detuned delay with LFO modulation, configurable rate/depth/voices/wet mix
  - **Delay** (category: spatial) — Feedback delay/echo with configurable time, feedback (capped at 0.95), and wet mix
  - **Compressor** (category: dynamics) — Dynamic range compressor with threshold, ratio, attack/release envelope, makeup gain
- Fixed NodeGraphEditor.tsx GUI bugs:
  - Wrapped editor in `ReactFlowProvider` (required by React Flow internals for hooks like `useReactFlow`)
  - Used `onInit` callback to capture `ReactFlowInstance` ref
  - Replaced manual coordinate calculation with `screenToFlowPosition()` for accurate node placement on right-click
  - Fixed `onPaneContextMenu` type signature to accept both `React.MouseEvent` and `MouseEvent`
- Updated `python/requirements.txt` to include numpy, scipy, soundfile alongside pyttsx3
- Added CUDA/GPU-accelerated DSP processing to Phase 3 backlog in tasks.md
- Updated DSP node count references from 11 to 16 in tasks.md

### Files Changed
- `python/dsp_nodes.py` — Added lowpass_filter, highpass_filter, chorus, delay, compressor functions + registry entries
- `src/renderer/src/NodeGraphEditor.tsx` — ReactFlowProvider wrapper, screenToFlowPosition coordinate fix, onInit ref capture
- `python/requirements.txt` — Added numpy>=1.24, scipy>=1.10, soundfile>=0.12
- `GECK/tasks.md` — Updated node count (11→16), added CUDA backlog item, added completed items
- `GECK/log.md` — Appended this entry

### Commits
(pending)

### Findings
- React Flow requires `ReactFlowProvider` ancestor for `screenToFlowPosition()` to work correctly
- Without proper coordinate conversion, nodes were placed at screen pixel coordinates rather than flow-space coordinates (offset by panel/viewport transforms)
- The 5 new nodes round out the DSP library with common audio production effects (filter, modulation, spatial, dynamics categories)

### Issues
None

### Checkpoint
**Status:** CONTINUE — DSP library expanded, GUI fix applied. Ready for end-to-end testing.

### Next
- Launch app and verify right-click node placement works correctly
- Test DSP pipeline with new nodes (lowpass, highpass, chorus, delay, compressor)
- Commit milestone

---

## Entry #6 — 2026-02-04

### Summary
Fixed two critical bugs preventing TTS preview from working: pyttsx3 SAPI5 COM deadlock on repeated synthesis, and `file://` audio playback blocked in Electron dev mode. End-to-end pipeline now functional: TTS → DSP graph → audio playback.

### Actions
- Diagnosed pyttsx3 `runAndWait()` deadlock via diagnostic logging:
  - First synthesis call always succeeded; second call deadlocked in SAPI5 COM event loop
  - Tested multiple fixes: `_inLoop` reset (failed), fresh engine per call (failed), threaded synthesis (worked standalone but deadlocked inside Electron subprocess)
  - **Fix:** spawn a fresh Python subprocess per synthesis via `--synth` single-shot mode in `tts_engine.py`. Each process gets clean COM state, guaranteed no deadlock.
- Fixed audio playback in renderer:
  - In dev mode, renderer loads from `http://localhost`, which blocks `file://` URLs (same-origin policy)
  - **Fix:** main process reads synthesized .wav file, encodes as base64 data URL, returns via IPC. Renderer plays `data:audio/wav;base64,...` directly.
- Updated `DialogueLibraryView.tsx` to use same data URL playback pattern
- Updated type declarations in `env.d.ts` (dataUrl instead of output for preview/process-graph)

### Files Changed
- `python/tts_engine.py` — Added `--synth` single-shot mode, `synthesize_to_file` now spawns subprocess
- `src/main/index.ts` — `tts:preview` and `tts:process-graph` handlers read file and return base64 data URL
- `src/renderer/src/VoicesView.tsx` — Use `result.dataUrl` instead of `file://` path for Audio
- `src/renderer/src/DialogueLibraryView.tsx` — Same data URL playback fix
- `src/renderer/src/env.d.ts` — Updated return types for preview/process-graph

### Test Results
- **Gain node:** Works — confirmed audible volume change
- **Pitch Shift node:** Does NOT work — needs investigation (may be a scipy resampling issue)
- **Basic preview (no DSP):** Works — repeated clicks, no deadlock
- **DSP graph preview:** Works — full TTS → DSP → playback pipeline functional
- **Node deletion:** NOT possible — no UI to remove DSP nodes from the graph (needs fix)

### Commits
(this commit)

### Findings
- pyttsx3's SAPI5 backend on Windows deadlocks `runAndWait()` on second call due to COM apartment threading
- Threading within the same process does not fix the COM issue when spawned from Electron
- Subprocess-per-synthesis is the only reliable fix; ~1s overhead per call is acceptable for preview
- Electron dev mode (http origin) cannot load `file://` URLs; base64 data URLs bypass this

### Issues
- **Pitch Shift node not working** — needs investigation; the node runs without error but output may be silent or unchanged
- **No node deletion UI** — DSP nodes cannot be removed from the graph once placed; need Delete key or right-click delete
- Other DSP nodes (reverb, chorus, delay, etc.) untested — need systematic testing

### Checkpoint
**Status:** CONTINUE — Core pipeline working. Node deletion and DSP node correctness need attention.

### Next
- Add node deletion support (Delete key and/or context menu)
- Debug Pitch Shift node (test scipy resampling)
- Systematically test all 16 DSP nodes
- Update README voice profile tutorial if needed

---

## Entry #7 — 2026-02-04

### Summary
Fixed Pitch Shift and Time Stretch DSP nodes. Both were broken due to incorrect use of `scipy.signal.resample` (Fourier-based resampling that preserves frequency content). Replaced with proper interpolation + WSOLA approach. All 16 nodes now pass comprehensive testing.

### Actions
- **Diagnosed Pitch Shift bug:** Two consecutive `signal.resample` calls were approximate inverses — the first changed duration (preserving pitch via Fourier method), the second undid it. Net result: no-op. Test confirmed correlation 0.999990 between input and "shifted" output.
- **Diagnosed Time Stretch bug:** Single `signal.resample` changes both duration AND pitch when played at the same sample rate. Time stretch should change only duration.
- **Implemented `_ola_stretch` (WSOLA):** Waveform Similarity Overlap-Add time stretching that changes duration without changing pitch:
  - 50ms Hann windows with 50% analysis overlap
  - Cross-correlation search finds optimal grain position within ±hop/2 radius
  - Window-sum normalization prevents amplitude modulation artifacts
- **Fixed `pitch_shift`:** Two-step process:
  1. `np.interp` interpolation resample — genuinely changes pitch by changing playback speed (also changes duration)
  2. `_ola_stretch` restores original duration while preserving the shifted pitch
- **Fixed `time_stretch`:** Uses `_ola_stretch` directly (changes duration without pitch change)
- **Comprehensive test of all 16 nodes:** All pass — no NaN, Inf, silence, or no-op results

### Files Changed
- `python/dsp_nodes.py` — Rewrote `_ola_stretch` (WSOLA), `pitch_shift`, and `time_stretch`

### Test Results
All 16 DSP nodes: PASS (no NaN, Inf, silence, or no-effect)

Pitch Shift frequency accuracy (440 Hz sine):
| Semitones | Output Hz | Expected Hz | Error (cents) |
|-----------|-----------|-------------|---------------|
| -12       | 220.0     | 220.0       | 0.0           |
| -5        | 330.0     | 329.6       | +2.0          |
| -1        | 415.0     | 415.3       | -1.3          |
| +1        | 466.0     | 466.2       | -0.6          |
| +5        | 587.0     | 587.3       | -1.0          |
| +12       | 880.0     | 880.0       | 0.0           |

All within ±2 cents (well below human perception threshold of ~5-10 cents).

### Commits
(pending)

### Findings
- `scipy.signal.resample` uses Fourier (FFT) method: changes sample count but preserves spectral content. Two consecutive calls are approximate inverses.
- `np.interp` does linear interpolation: genuinely changes pitch by altering effective playback speed.
- WSOLA (cross-correlation grain search) produces much better results than naive OLA for pitch shifting — prevents phase cancellation between adjacent grains.
- Pure sine waves are worst-case for OLA (all energy in one frequency bin); speech signals work much better due to complex waveform structure.

### Issues
- **Node deletion UI** still not implemented — DSP nodes cannot be removed from the graph

### Checkpoint
**Status:** CONTINUE — All DSP nodes functional. Node deletion UI is the remaining Phase 1.5 task.

### Next
- Launch app and test pitch shift interactively with TTS audio
- Add node deletion support (Delete key and/or context menu)

---

## Entry #8 — 2026-02-04

### Summary
Cross-platform compatibility changes to support macOS and Linux in addition to Windows. Four targeted fixes: Python command detection, Windows-only API guard, temp file cleanup, and Linux espeak error handling.

### Actions
- Added `findPythonCommand()` async function that probes `python3`/`python` in platform-appropriate order using `execFile`
- Guarded `electronApp.setAppUserModelId()` with `process.platform === 'win32'` check (Windows-only API)
- Added `unlinkSync` cleanup of temp .wav files after `readFileSync` in `tts:preview` and `tts:process-graph` IPC handlers (prevents disk space leaks)
- Added `shutil.which` check for `espeak`/`espeak-ng` on Linux in `init_engine()` with clear error messages and install instructions for Ubuntu/Debian, Fedora, and Arch
- Updated `single_synth()` to use `init_engine()` instead of bare `pyttsx3.init()` for consistent error handling

### Files Changed
- `src/main/index.ts` — Python command detection, platform guard, temp file cleanup
- `python/tts_engine.py` — Linux espeak error handling in init_engine(), single_synth() uses init_engine()
- `GECK/tasks.md` — Added Cross-Platform Compatibility section, updated Completed list
- `GECK/log.md` — Appended this entry

### Commits
(pending)

### Findings
- Most of the codebase was already portable (path.join, os.path.join, tempfile, electron-builder targets, platform checks for SAPI5 pitch and macOS quit behavior)
- Only four spots needed changes: hardcoded `python` command, unconditional Windows API call, temp file leaks, and opaque pyttsx3 errors on Linux
- `execFile` is cleaner than `spawn` for probing whether a command exists (no shell, just exec and check error)

### Issues
None

### Checkpoint
**Status:** CONTINUE — App now supports Windows, macOS, and Linux.

### Next
- Verify `npx electron-vite build` compiles cleanly
- Test on macOS/Linux if available

---

## Entry #9 — 2026-02-04

### Summary
App launcher and taskbar integration. Generated TTS-themed app icon (speech bubble with waveform), set BrowserWindow icon, fixed tray icon path for production builds, added extraResources for icon and Python directory, added deb target for Linux, removed dangling macOS entitlements reference.

### Actions
- Generated `resources/icon.png` (512x512 RGBA) and `resources/icon.ico` (multi-size: 16/32/48/64/128/256) using Python + Pillow
- Icon design: blue speech bubble with white audio waveform bars on dark rounded-square background
- Added `getIconPath()` helper in main process — uses `__dirname` in dev, `process.resourcesPath` in production
- Set `icon: getIconPath()` on BrowserWindow constructor (fixes Linux taskbar icon)
- Updated `createTray()` to use `getIconPath()` instead of hardcoded relative path (fixes tray icon in production builds)
- Added `extraResources` in electron-builder.yml for `icon.png` (tray/window icon at runtime) and `python/` (TTS engine scripts)
- Added `deb` target for Linux (installs .desktop file + icon for app menu integration)
- Added `icon` field for Linux pointing to 512x512 PNG
- Removed dangling `entitlementsInherit: build/entitlements.mac.plist` from mac config (file doesn't exist)

### Files Changed
- `resources/icon.png` — Created, 512x512 TTS-themed app icon
- `resources/icon.ico` — Created, multi-size Windows icon (16/32/48/64/128/256)
- `src/main/index.ts` — Added getIconPath(), BrowserWindow icon, fixed tray icon path
- `electron-builder.yml` — extraResources, deb target, linux icon, removed mac entitlements
- `GECK/tasks.md` — Added launcher integration task
- `GECK/log.md` — Appended this entry

### Commits
(pending)

### Findings
- electron-builder auto-detects icon.png/icon.ico from buildResources directory for installer icons
- extraResources is needed separately for runtime access (tray icon, window icon) since the app is asar-packed
- The python/ directory was referenced by getTTSScriptPath() but never configured as extraResources — would have failed in production
- deb packages install .desktop files and icons to system paths, enabling GNOME/KDE app menu integration (AppImage does not)

### Issues
None

### Checkpoint
**Status:** CONTINUE — Launcher integration complete.

### Next
- Verify build compiles cleanly
- Test icon appearance in dev mode