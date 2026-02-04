# TTS-Soundboard

**TTS-Soundboard** is a dialogue synthesis and orchestration tool for games and software. It enables developers to *design voices*, not just generate audio, and to bind dialogue semantically to events, state, and narrative flow.

At its core, TTS-Soundboard treats voices as **parametric, versioned assets** and dialogue as **data**, not static sound files.

---

## Core Capabilities

### 1. Custom TTS Voice Profiles

Design reusable voice profiles with deterministic output and versioning.

#### Human Voices (English – v1)

* Accent / dialect presets
* Pitch range and variance
* Speaking rate
* Prosody and emphasis bias
* Formant shaping

#### Non-Human Voices

Apply synthesis and signal-processing techniques to intelligible speech:

* Ring and amplitude modulation
* Granular and spectral effects
* Harmonic distortion
* Bit-depth and sample-rate reduction
* Envelope followers and side-chain modulation

> The design paradigm is closer to a **modular synth or guitar pedalboard** than a traditional TTS interface.

---

### 2. Dialogue Assets (Per Actor)

Each character owns a **Dialogue Asset Table** that maps semantic dialogue to generated or cached audio.

**DialogueAsset (conceptual schema):**

* `id` (deterministic hash)
* `actor_id`
* `text`
* `voice_profile_id`
* `synth_settings`
* `emotion_tag`
* `category` (bark, narration, combat, ambient, etc.)
* `event_triggers[]`
* `conditions[]`
* `audio_cache_refs[]` (.wav, .ogg, stream)

Audio files are treated as **derived cache artifacts**, not the source of truth.

---

### 3. Dialogue Library (Global)

All character Dialogue Asset tables feed into a global **Dialogue Library**.

The Dialogue Library functions as a **semantic dialogue map**:

* Links dialogue via calling events
* Supports conditional branching
* Enables state-aware and event-driven dialogue resolution

Conceptually, this forms a **directed dialogue graph** where:

* Nodes = Dialogue Assets
* Edges = Events, state transitions, semantic relationships

---

## Hash-Based Asset Pipeline

Dialogue assets are identified by deterministic hashes derived from:

* Dialogue text
* Voice profile + version
* Emotion and synthesis parameters
* Language

This enables:

* Automatic cache invalidation
* Reproducible builds
* Efficient deduplication
* Regeneration when voice profiles evolve

---

## Intended Use Cases

* Game dialogue and NPC systems
* Procedural or reactive narration
* Accessibility-focused voice systems
* Machinima and animation
* Diegetic UI voices and in-world AI characters

---

## Design Philosophy

* **Voices are functions, not files**
* **Dialogue is data, not script glue**
* **Audio is a cache, not a dependency**
* **Semantics drive synthesis**

---

## Planned Scope

**Phase 1**

* English-only TTS
* Limited base voices
* Post-processed non-human effects
* Offline audio export

**Phase 2**

* Dialogue Library graph
* Event-driven dialogue resolution
* Voice profile versioning

**Phase 3**

* Runtime synthesis
* Streaming audio output
* Adaptive emotion and context modulation

---

TTS-Soundboard is designed to replace brittle voice-over pipelines with a **parametric, semantic, and programmable dialogue system**.

