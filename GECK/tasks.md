# Tasks — TTS-Soundboard

**Last Updated:** 2026-02-04
**Architecture:** Electron + React + TypeScript (Python TTS backend)

## Legend

- `[ ]` — Not started
- `[x]` — Complete
- `[BLOCKED: reason]` — Cannot proceed
- `[DECISION: topic]` — Awaiting human input

## Current Sprint — Phase 1 Foundation

### Scaffolding
- [x] Choose framework → Electron + React + TypeScript
- [x] Initialize Electron + React + TypeScript project (electron-vite)
- [x] Configure build tooling (Vite, TypeScript)
- [x] Verify build: `npx electron-vite build` compiles cleanly

### Application Window & Lifecycle
- [x] Create main BrowserWindow with proper defaults
- [x] Implement window state persistence (position, size, maximized)
- [x] Handle graceful close, minimize-to-tray option
- [x] Support DPI scaling and multi-monitor awareness
- [x] Buttons and UI elements scale properly with DPI (CSS relative units)

### Main UI Layout
- [x] Design main layout (sidebar, content area, toolbar)
- [x] Implement dark/light theme support (system theme detection via prefers-color-scheme)
- [x] Ensure accessible UI (keyboard nav, ARIA labels, aria-current)

### System Integration
- [x] System tray icon with context menu (Show/Quit)
- [ ] Desktop notifications
- [ ] File associations (.ttsp)

### File Operations
- [x] Define project file format (JSON-based .ttsp) — types.ts
- [x] Implement save/load project via IPC
- [x] Implement recent files list (electron-store, max 10)
- [x] File dialogs (open, save-as)

### TTS Engine Integration
- [x] Set up Python TTS backend (persistent subprocess, JSON protocol)
- [x] Basic English TTS synthesis (pyttsx3, SAPI5 on Windows)
- [x] Audio playback in Electron (HTML5 Audio from temp .wav)
- [x] Offline audio export (.wav via save dialog)

### Voice Profiles (Phase 1 — Basic)
- [x] Voice profile data model (pitch, rate, volume, accent preset)
- [x] Voice profile CRUD UI (add/edit/delete with inline form)
- [x] Voice preview (synthesize + play sample, system voice selection)

### Dialogue Assets (Phase 1 — Basic)
- [x] Dialogue asset data model (id, actor, text, voice_profile, emotion, category)
- [x] Dialogue asset list/table UI (inside Dialogue Library view)
- [x] Add/edit/delete dialogue entries
- [ ] Batch synthesis for dialogue assets

### Parametric Voice Design (Phase 1.5)
- [x] Python DSP engine with audio effect processors (16 nodes)
- [x] Node registry with typed parameters (float/int/select)
- [x] Graph processing via topological sort
- [x] IPC integration for list_dsp_nodes and process_graph
- [x] Visual node graph editor (React Flow) — NodeGraphEditor.tsx
- [x] Custom IO nodes (TTS Input / Audio Output) and DSP effect nodes
- [x] Right-click context menu for adding nodes by category
- [x] Parameter controls (sliders, selects) on DSP nodes
- [x] VoiceGraph data model and serialization
- [x] Integration into VoicesView (Parameters/DSP Graph tabs)
- [x] Graph-aware preview (ttsProcessGraph when DSP nodes present)
- [x] Graph-aware dialogue playback and export
- [x] System voice ID persistence per profile
- [x] Install and verify Python DSP dependencies (numpy, scipy, soundfile)
- [x] End-to-end test: TTS → DSP graph → audio playback (gain node verified working)
- [x] Fix pyttsx3 SAPI5 deadlock (subprocess-per-synthesis)
- [x] Fix audio playback in dev mode (base64 data URL via IPC)
- [ ] Node deletion UI (Delete key or context menu to remove DSP nodes)
- [x] Fix Pitch Shift node (interpolation resample + WSOLA time restore)
- [x] Fix Time Stretch node (WSOLA instead of signal.resample)
- [x] Systematic test of all 16 DSP nodes (all pass, pitch shift ±2 cents accuracy)

## Backlog — Phase 2

- [ ] Dialogue Library graph visualization
- [ ] Event-driven dialogue resolution
- [ ] Voice profile versioning and hash-based cache invalidation
- [ ] Dialogue import/export (CSV, JSON)

## Backlog — Phase 3

- [ ] Runtime synthesis API
- [ ] Streaming audio output
- [ ] Adaptive emotion and context modulation
- [ ] Multi-language support
- [ ] CUDA/GPU-accelerated DSP processing (batch convolution, real-time spectral transforms via cuFFT/cuSignal)

## Completed (Recent)

- [x] GECK initialization (Entry #0)
- [x] Framework decision: Electron + React + TypeScript
- [x] Project scaffolding (electron-vite + React + TS)
- [x] Window management (state persistence, multi-monitor, DPI)
- [x] Main UI layout (sidebar, toolbar, theme, a11y)
- [x] System tray (context menu, double-click show)
- [x] File operations (open/save/save-as/recent, .ttsp format)
- [x] Project data model (TTSProject, VoiceProfile, DialogueAsset, Actor)
- [x] UI restructure: merged Dialogue Assets under Dialogue Library (Assets/Graph tabs)
- [x] Voice Profile CRUD (add/edit/delete, inline form with sliders)
- [x] Dialogue Asset CRUD (add/edit/delete, voice profile selector, emotion/category)
- [x] Component split (VoicesView, DialogueLibraryView, SettingsView)
- [x] Python DSP engine (16 audio effects: gain, pitch_shift, time_stretch, reverb, EQ, ring_mod, distortion, bitcrush, formant_shift, granular, envelope_follower, lowpass, highpass, chorus, delay, compressor)
- [x] React Flow visual node graph editor (NodeGraphEditor.tsx)
- [x] Fixed NodeGraphEditor coordinate conversion (ReactFlowProvider + screenToFlowPosition)
- [x] Added 5 new DSP nodes: low-pass filter, high-pass filter, chorus, delay, compressor
- [x] Integrated parametric voice design into VoicesView
- [x] Graph-aware dialogue playback and export
- [x] Fixed Pitch Shift node (interpolation resample + WSOLA, ±2 cents accuracy)
- [x] Fixed Time Stretch node (WSOLA instead of Fourier resample)
- [x] All 16 DSP nodes tested and verified working
