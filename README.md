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

## Quick Start: Creating an Altered Voice Profile

This walkthrough creates a "Corrupted Robot" voice using pitch shifting, bitcrushing, and a chorus effect.

### 1. Create a new profile

1. Open TTS-Soundboard and navigate to **Voices** in the sidebar.
2. Click **+ Add Profile**.
3. In the **Parameters** tab:
   - **Name:** `Corrupted Robot`
   - **Accent:** `neutral`
   - **System Voice:** Pick any available voice (e.g. Microsoft David)
   - **Pitch:** `+3 st` (drag the slider right for a slightly higher base pitch)
   - **Rate:** `120 wpm` (slower, more deliberate)
   - **Volume:** `100%`

### 2. Build the DSP graph

1. Switch to the **DSP Graph** tab.
2. You'll see two fixed nodes: **TTS Input** (left) and **Audio Output** (right).
3. **Right-click** on the canvas to open the Add Node menu.

Add these three nodes in order:

| Step | Menu Category | Node | Key Settings |
|------|---------------|------|--------------|
| A | basic | **Pitch Shift** | Semitones: `+5` |
| B | lo-fi | **Bitcrush** | Bit Depth: `8`, Downsample: `4` |
| C | modulation | **Chorus** | Rate: `2.0 Hz`, Depth: `8 ms`, Wet Mix: `0.6`, Voices: `3` |

### 3. Connect the chain

Drag from each node's output handle (right side) to the next node's input handle (left side):

```
TTS Input --> Pitch Shift --> Bitcrush --> Chorus --> Audio Output
```

### 4. Preview and save

1. Type some text in the **Preview Text** field (e.g. `Warning. System integrity compromised.`).
2. Click **Preview** to hear the processed voice.
3. Adjust parameters on any node by dragging its sliders directly in the graph.
4. Click **Create** to save the profile.

### 5. Use it in dialogue

1. Go to **Dialogue** in the sidebar and add a new dialogue asset.
2. Set the **Voice Profile** to `Corrupted Robot`.
3. When you play or export that dialogue entry, the full DSP chain is applied automatically.

### Tips

- **Chain order matters.** Bitcrushing before chorus sounds different than chorus before bitcrushing. Experiment with node order.
- **Start subtle.** Small parameter changes add up fast once you chain 3+ effects. Pull wet mixes back to 0.3-0.5 to keep things intelligible.
- **Use filters to clean up.** Add a **Low-Pass Filter** (filter category) at the end of your chain to tame harsh high frequencies from distortion or bitcrushing.
- **Preview often.** The Preview button runs the full DSP pipeline so you can iterate without saving.

---

TTS-Soundboard is designed to replace brittle voice-over pipelines with a **parametric, semantic, and programmable dialogue system**.

