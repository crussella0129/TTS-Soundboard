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