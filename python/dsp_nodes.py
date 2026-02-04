"""
DSP processing nodes for TTS-Soundboard voice profiles.

Each node is a function: (audio: ndarray, sample_rate: int, params: dict) -> ndarray
Audio is a 1D float64 array normalized to [-1.0, 1.0].
"""

import numpy as np
from scipy import signal
from scipy.ndimage import uniform_filter1d


def gain(audio: np.ndarray, sr: int, params: dict) -> np.ndarray:
    """Simple gain/attenuation. params: {db: float}"""
    db = params.get("db", 0.0)
    return audio * (10.0 ** (db / 20.0))


def pitch_shift(audio: np.ndarray, sr: int, params: dict) -> np.ndarray:
    """Pitch shift via resampling. params: {semitones: float}"""
    semitones = params.get("semitones", 0.0)
    if semitones == 0:
        return audio
    factor = 2.0 ** (semitones / 12.0)
    # Resample to shift pitch, then time-stretch back to original length
    n_out = int(len(audio) / factor)
    shifted = signal.resample(audio, n_out)
    # Resample back to original length to preserve duration
    return signal.resample(shifted, len(audio))


def time_stretch(audio: np.ndarray, sr: int, params: dict) -> np.ndarray:
    """Time stretch via phase vocoder. params: {factor: float} (>1 = slower, <1 = faster)"""
    factor = params.get("factor", 1.0)
    if factor == 1.0:
        return audio
    n_out = int(len(audio) * factor)
    return signal.resample(audio, n_out)


def reverb(audio: np.ndarray, sr: int, params: dict) -> np.ndarray:
    """Simple algorithmic reverb. params: {decay: float 0-1, wet: float 0-1, delay_ms: float}"""
    decay = np.clip(params.get("decay", 0.5), 0.0, 0.99)
    wet = np.clip(params.get("wet", 0.3), 0.0, 1.0)
    delay_ms = params.get("delay_ms", 40.0)

    delay_samples = int(sr * delay_ms / 1000.0)
    if delay_samples < 1:
        return audio

    output = np.copy(audio)
    # Multi-tap feedback delay
    for tap in range(4):
        tap_delay = delay_samples * (tap + 1)
        tap_decay = decay ** (tap + 1)
        if tap_delay < len(output):
            delayed = np.zeros_like(output)
            delayed[tap_delay:] = output[:-tap_delay] * tap_decay
            output = output + delayed

    # Mix wet/dry
    return audio * (1.0 - wet) + output * wet


def eq_parametric(audio: np.ndarray, sr: int, params: dict) -> np.ndarray:
    """Parametric EQ. params: {low_db: float, mid_db: float, high_db: float, low_freq: int, high_freq: int}"""
    low_db = params.get("low_db", 0.0)
    mid_db = params.get("mid_db", 0.0)
    high_db = params.get("high_db", 0.0)
    low_freq = params.get("low_freq", 300)
    high_freq = params.get("high_freq", 3000)

    nyq = sr / 2.0
    output = np.copy(audio)

    if low_db != 0.0 and low_freq < nyq:
        b, a = signal.butter(2, low_freq / nyq, btype='low')
        low_band = signal.lfilter(b, a, audio)
        output = output + low_band * (10.0 ** (low_db / 20.0) - 1.0)

    if high_db != 0.0 and high_freq < nyq:
        b, a = signal.butter(2, high_freq / nyq, btype='high')
        high_band = signal.lfilter(b, a, audio)
        output = output + high_band * (10.0 ** (high_db / 20.0) - 1.0)

    if mid_db != 0.0 and low_freq < nyq and high_freq < nyq:
        b, a = signal.butter(2, [low_freq / nyq, high_freq / nyq], btype='band')
        mid_band = signal.lfilter(b, a, audio)
        output = output + mid_band * (10.0 ** (mid_db / 20.0) - 1.0)

    return output


def ring_modulation(audio: np.ndarray, sr: int, params: dict) -> np.ndarray:
    """Ring modulation with a sine carrier. params: {freq: float, wet: float 0-1}"""
    freq = params.get("freq", 440.0)
    wet = np.clip(params.get("wet", 1.0), 0.0, 1.0)
    t = np.arange(len(audio)) / sr
    carrier = np.sin(2.0 * np.pi * freq * t)
    modulated = audio * carrier
    return audio * (1.0 - wet) + modulated * wet


def distortion(audio: np.ndarray, sr: int, params: dict) -> np.ndarray:
    """Soft/hard clipping distortion. params: {drive: float 1-100, mode: 'soft'|'hard'}"""
    drive = np.clip(params.get("drive", 1.0), 1.0, 100.0)
    mode = params.get("mode", "soft")
    driven = audio * drive
    if mode == "hard":
        return np.clip(driven, -1.0, 1.0)
    else:
        # Soft clipping via tanh
        return np.tanh(driven)


def bitcrush(audio: np.ndarray, sr: int, params: dict) -> np.ndarray:
    """Bit-depth and sample-rate reduction. params: {bits: int 2-16, downsample: int 1-32}"""
    bits = int(np.clip(params.get("bits", 16), 2, 16))
    downsample = int(np.clip(params.get("downsample", 1), 1, 32))

    # Reduce bit depth
    levels = 2 ** bits
    output = np.round(audio * levels / 2) / (levels / 2)

    # Reduce sample rate (sample-and-hold)
    if downsample > 1:
        indices = np.arange(0, len(output), downsample)
        held = np.repeat(output[indices], downsample)[:len(output)]
        output = held

    return output


def formant_shift(audio: np.ndarray, sr: int, params: dict) -> np.ndarray:
    """Formant shifting via spectral envelope manipulation.
    params: {shift: float semitones, preserve_pitch: bool}
    """
    shift = params.get("shift", 0.0)
    if shift == 0:
        return audio

    # STFT-based formant shifting
    nperseg = 1024
    noverlap = nperseg // 4

    f, t_arr, Zxx = signal.stft(audio, sr, nperseg=nperseg, noverlap=noverlap)

    factor = 2.0 ** (shift / 12.0)
    n_bins = Zxx.shape[0]
    shifted = np.zeros_like(Zxx)

    for i in range(n_bins):
        src_bin = int(i / factor)
        if 0 <= src_bin < n_bins:
            shifted[i] = Zxx[src_bin]

    _, output = signal.istft(shifted, sr, nperseg=nperseg, noverlap=noverlap)

    # Match length
    if len(output) > len(audio):
        output = output[:len(audio)]
    elif len(output) < len(audio):
        output = np.pad(output, (0, len(audio) - len(output)))

    return output


def granular(audio: np.ndarray, sr: int, params: dict) -> np.ndarray:
    """Granular synthesis effect. params: {grain_size_ms: float, density: float 0.5-4, scatter: float 0-1}"""
    grain_ms = params.get("grain_size_ms", 50.0)
    density = np.clip(params.get("density", 1.0), 0.5, 4.0)
    scatter = np.clip(params.get("scatter", 0.0), 0.0, 1.0)

    grain_samples = int(sr * grain_ms / 1000.0)
    if grain_samples < 2:
        return audio

    hop = int(grain_samples / density)
    output = np.zeros(len(audio) + grain_samples)

    # Window for smooth grain crossfade
    window = np.hanning(grain_samples)
    rng = np.random.default_rng(42)  # deterministic for reproducibility

    pos = 0
    while pos < len(audio) - grain_samples:
        # Apply scatter to read position
        read_pos = pos + int(rng.uniform(-scatter, scatter) * grain_samples)
        read_pos = max(0, min(read_pos, len(audio) - grain_samples))

        grain = audio[read_pos:read_pos + grain_samples] * window
        write_pos = pos
        if write_pos + grain_samples <= len(output):
            output[write_pos:write_pos + grain_samples] += grain
        pos += hop

    return output[:len(audio)]


def lowpass_filter(audio: np.ndarray, sr: int, params: dict) -> np.ndarray:
    """Low-pass filter. params: {cutoff: float Hz, order: int 1-8}"""
    cutoff = params.get("cutoff", 5000.0)
    order = int(np.clip(params.get("order", 2), 1, 8))
    nyq = sr / 2.0
    cutoff = min(cutoff, nyq * 0.99)
    b, a = signal.butter(order, cutoff / nyq, btype='low')
    return signal.lfilter(b, a, audio)


def highpass_filter(audio: np.ndarray, sr: int, params: dict) -> np.ndarray:
    """High-pass filter. params: {cutoff: float Hz, order: int 1-8}"""
    cutoff = params.get("cutoff", 200.0)
    order = int(np.clip(params.get("order", 2), 1, 8))
    nyq = sr / 2.0
    cutoff = min(cutoff, nyq * 0.99)
    if cutoff <= 0:
        return audio
    b, a = signal.butter(order, cutoff / nyq, btype='high')
    return signal.lfilter(b, a, audio)


def chorus(audio: np.ndarray, sr: int, params: dict) -> np.ndarray:
    """Chorus effect — multiple detuned delays. params: {rate: float Hz, depth_ms: float, wet: float 0-1, voices: int 2-4}"""
    rate = params.get("rate", 1.5)
    depth_ms = params.get("depth_ms", 5.0)
    wet = np.clip(params.get("wet", 0.5), 0.0, 1.0)
    n_voices = int(np.clip(params.get("voices", 2), 2, 4))

    depth_samples = int(sr * depth_ms / 1000.0)
    max_delay = depth_samples * 2
    if max_delay < 1:
        return audio

    t = np.arange(len(audio)) / sr
    output = np.zeros_like(audio)

    for v in range(n_voices):
        phase = 2.0 * np.pi * v / n_voices
        lfo = np.sin(2.0 * np.pi * rate * t + phase)
        delay_samples = (max_delay + depth_samples * lfo).astype(int)
        delay_samples = np.clip(delay_samples, 0, len(audio) - 1)

        indices = np.arange(len(audio)) - delay_samples
        indices = np.clip(indices, 0, len(audio) - 1)
        output += audio[indices]

    output /= n_voices
    return audio * (1.0 - wet) + output * wet


def delay(audio: np.ndarray, sr: int, params: dict) -> np.ndarray:
    """Delay/echo effect. params: {time_ms: float, feedback: float 0-0.95, wet: float 0-1}"""
    time_ms = params.get("time_ms", 250.0)
    feedback = np.clip(params.get("feedback", 0.4), 0.0, 0.95)
    wet = np.clip(params.get("wet", 0.5), 0.0, 1.0)

    delay_samples = int(sr * time_ms / 1000.0)
    if delay_samples < 1:
        return audio

    output = np.copy(audio)
    # Apply feedback iterations
    n_taps = int(np.log(0.01) / np.log(max(feedback, 0.01)))  # taps until -40dB
    n_taps = min(max(n_taps, 1), 20)

    for tap in range(1, n_taps + 1):
        offset = delay_samples * tap
        gain_val = feedback ** tap
        if offset >= len(output):
            break
        output[offset:] += audio[:len(audio) - offset] * gain_val

    return audio * (1.0 - wet) + output * wet


def compressor(audio: np.ndarray, sr: int, params: dict) -> np.ndarray:
    """Dynamic range compressor. params: {threshold_db: float, ratio: float, attack_ms: float, release_ms: float, makeup_db: float}"""
    threshold_db = params.get("threshold_db", -20.0)
    ratio = max(params.get("ratio", 4.0), 1.0)
    attack_ms = params.get("attack_ms", 5.0)
    release_ms = params.get("release_ms", 50.0)
    makeup_db = params.get("makeup_db", 0.0)

    threshold_lin = 10.0 ** (threshold_db / 20.0)
    attack_coeff = np.exp(-1.0 / (sr * attack_ms / 1000.0)) if attack_ms > 0 else 0.0
    release_coeff = np.exp(-1.0 / (sr * release_ms / 1000.0)) if release_ms > 0 else 0.0

    envelope = np.zeros(len(audio))
    env = 0.0
    for i in range(len(audio)):
        level = abs(audio[i])
        if level > env:
            env = attack_coeff * env + (1.0 - attack_coeff) * level
        else:
            env = release_coeff * env + (1.0 - release_coeff) * level
        envelope[i] = env

    # Calculate gain reduction
    gain_reduction = np.ones(len(audio))
    above = envelope > threshold_lin
    if np.any(above):
        gain_reduction[above] = (threshold_lin / envelope[above]) ** (1.0 - 1.0 / ratio)

    # Apply compression and makeup gain
    makeup_lin = 10.0 ** (makeup_db / 20.0)
    return audio * gain_reduction * makeup_lin


def envelope_follower(audio: np.ndarray, sr: int, params: dict) -> np.ndarray:
    """Envelope follower — modulates a carrier with the input envelope.
    params: {carrier_freq: float, attack_ms: float, release_ms: float, wet: float 0-1}
    """
    carrier_freq = params.get("carrier_freq", 220.0)
    attack_ms = params.get("attack_ms", 10.0)
    release_ms = params.get("release_ms", 50.0)
    wet = np.clip(params.get("wet", 0.5), 0.0, 1.0)

    # Extract envelope via RMS
    window_size = max(1, int(sr * attack_ms / 1000.0))
    envelope = np.sqrt(uniform_filter1d(audio ** 2, size=window_size))

    # Smooth with release
    release_samples = max(1, int(sr * release_ms / 1000.0))
    for i in range(1, len(envelope)):
        if envelope[i] < envelope[i - 1]:
            alpha = 1.0 / release_samples
            envelope[i] = envelope[i - 1] * (1.0 - alpha) + envelope[i] * alpha

    # Generate carrier
    t = np.arange(len(audio)) / sr
    carrier = np.sin(2.0 * np.pi * carrier_freq * t)

    # Modulate carrier with envelope
    modulated = carrier * envelope
    return audio * (1.0 - wet) + modulated * wet


# Registry of all available nodes
NODE_REGISTRY = {
    "gain": {
        "fn": gain,
        "label": "Gain",
        "category": "basic",
        "params": {
            "db": {"type": "float", "min": -40, "max": 40, "default": 0, "label": "Gain (dB)"}
        }
    },
    "pitch_shift": {
        "fn": pitch_shift,
        "label": "Pitch Shift",
        "category": "basic",
        "params": {
            "semitones": {"type": "float", "min": -24, "max": 24, "default": 0, "label": "Semitones"}
        }
    },
    "time_stretch": {
        "fn": time_stretch,
        "label": "Time Stretch",
        "category": "basic",
        "params": {
            "factor": {"type": "float", "min": 0.25, "max": 4.0, "default": 1.0, "label": "Factor"}
        }
    },
    "reverb": {
        "fn": reverb,
        "label": "Reverb",
        "category": "spatial",
        "params": {
            "decay": {"type": "float", "min": 0, "max": 0.99, "default": 0.5, "label": "Decay"},
            "wet": {"type": "float", "min": 0, "max": 1, "default": 0.3, "label": "Wet Mix"},
            "delay_ms": {"type": "float", "min": 5, "max": 200, "default": 40, "label": "Delay (ms)"}
        }
    },
    "eq": {
        "fn": eq_parametric,
        "label": "EQ",
        "category": "basic",
        "params": {
            "low_db": {"type": "float", "min": -20, "max": 20, "default": 0, "label": "Low (dB)"},
            "mid_db": {"type": "float", "min": -20, "max": 20, "default": 0, "label": "Mid (dB)"},
            "high_db": {"type": "float", "min": -20, "max": 20, "default": 0, "label": "High (dB)"},
            "low_freq": {"type": "int", "min": 60, "max": 1000, "default": 300, "label": "Low Freq"},
            "high_freq": {"type": "int", "min": 1000, "max": 10000, "default": 3000, "label": "High Freq"}
        }
    },
    "ring_mod": {
        "fn": ring_modulation,
        "label": "Ring Mod",
        "category": "modulation",
        "params": {
            "freq": {"type": "float", "min": 20, "max": 2000, "default": 440, "label": "Carrier Freq"},
            "wet": {"type": "float", "min": 0, "max": 1, "default": 1.0, "label": "Wet Mix"}
        }
    },
    "distortion": {
        "fn": distortion,
        "label": "Distortion",
        "category": "dynamics",
        "params": {
            "drive": {"type": "float", "min": 1, "max": 100, "default": 1, "label": "Drive"},
            "mode": {"type": "select", "options": ["soft", "hard"], "default": "soft", "label": "Mode"}
        }
    },
    "bitcrush": {
        "fn": bitcrush,
        "label": "Bitcrush",
        "category": "lo-fi",
        "params": {
            "bits": {"type": "int", "min": 2, "max": 16, "default": 16, "label": "Bit Depth"},
            "downsample": {"type": "int", "min": 1, "max": 32, "default": 1, "label": "Downsample"}
        }
    },
    "formant_shift": {
        "fn": formant_shift,
        "label": "Formant Shift",
        "category": "spectral",
        "params": {
            "shift": {"type": "float", "min": -12, "max": 12, "default": 0, "label": "Shift (st)"}
        }
    },
    "granular": {
        "fn": granular,
        "label": "Granular",
        "category": "spectral",
        "params": {
            "grain_size_ms": {"type": "float", "min": 10, "max": 500, "default": 50, "label": "Grain Size (ms)"},
            "density": {"type": "float", "min": 0.5, "max": 4, "default": 1.0, "label": "Density"},
            "scatter": {"type": "float", "min": 0, "max": 1, "default": 0, "label": "Scatter"}
        }
    },
    "lowpass": {
        "fn": lowpass_filter,
        "label": "Low-Pass Filter",
        "category": "filter",
        "params": {
            "cutoff": {"type": "float", "min": 100, "max": 20000, "default": 5000, "label": "Cutoff (Hz)"},
            "order": {"type": "int", "min": 1, "max": 8, "default": 2, "label": "Order"}
        }
    },
    "highpass": {
        "fn": highpass_filter,
        "label": "High-Pass Filter",
        "category": "filter",
        "params": {
            "cutoff": {"type": "float", "min": 20, "max": 10000, "default": 200, "label": "Cutoff (Hz)"},
            "order": {"type": "int", "min": 1, "max": 8, "default": 2, "label": "Order"}
        }
    },
    "chorus": {
        "fn": chorus,
        "label": "Chorus",
        "category": "modulation",
        "params": {
            "rate": {"type": "float", "min": 0.1, "max": 10, "default": 1.5, "label": "Rate (Hz)"},
            "depth_ms": {"type": "float", "min": 1, "max": 30, "default": 5, "label": "Depth (ms)"},
            "wet": {"type": "float", "min": 0, "max": 1, "default": 0.5, "label": "Wet Mix"},
            "voices": {"type": "int", "min": 2, "max": 4, "default": 2, "label": "Voices"}
        }
    },
    "delay": {
        "fn": delay,
        "label": "Delay",
        "category": "spatial",
        "params": {
            "time_ms": {"type": "float", "min": 10, "max": 2000, "default": 250, "label": "Time (ms)"},
            "feedback": {"type": "float", "min": 0, "max": 0.95, "default": 0.4, "label": "Feedback"},
            "wet": {"type": "float", "min": 0, "max": 1, "default": 0.5, "label": "Wet Mix"}
        }
    },
    "compressor": {
        "fn": compressor,
        "label": "Compressor",
        "category": "dynamics",
        "params": {
            "threshold_db": {"type": "float", "min": -60, "max": 0, "default": -20, "label": "Threshold (dB)"},
            "ratio": {"type": "float", "min": 1, "max": 20, "default": 4, "label": "Ratio"},
            "attack_ms": {"type": "float", "min": 0.1, "max": 100, "default": 5, "label": "Attack (ms)"},
            "release_ms": {"type": "float", "min": 1, "max": 500, "default": 50, "label": "Release (ms)"},
            "makeup_db": {"type": "float", "min": 0, "max": 40, "default": 0, "label": "Makeup (dB)"}
        }
    },
    "envelope_follower": {
        "fn": envelope_follower,
        "label": "Envelope Follower",
        "category": "modulation",
        "params": {
            "carrier_freq": {"type": "float", "min": 20, "max": 2000, "default": 220, "label": "Carrier Freq"},
            "attack_ms": {"type": "float", "min": 1, "max": 200, "default": 10, "label": "Attack (ms)"},
            "release_ms": {"type": "float", "min": 1, "max": 500, "default": 50, "label": "Release (ms)"},
            "wet": {"type": "float", "min": 0, "max": 1, "default": 0.5, "label": "Wet Mix"}
        }
    }
}


def get_registry_info():
    """Return node registry without function references (for JSON serialization)."""
    info = {}
    for key, node in NODE_REGISTRY.items():
        info[key] = {
            "label": node["label"],
            "category": node["category"],
            "params": node["params"]
        }
    return info


def process_graph(audio: np.ndarray, sr: int, graph: dict) -> np.ndarray:
    """Process audio through a node graph.

    graph format:
    {
        "nodes": [{"id": "...", "type": "gain", "params": {"db": 6}}],
        "edges": [{"source": "input", "target": "node1"}, {"source": "node1", "target": "output"}]
    }

    Resolves the graph into a processing order and applies nodes sequentially.
    """
    nodes = {n["id"]: n for n in graph.get("nodes", [])}
    edges = graph.get("edges", [])

    # Build adjacency: source -> [targets]
    adj = {}
    for e in edges:
        src = e.get("source", "").split("__")[0]  # handle port IDs like "node1__output"
        tgt = e.get("target", "").split("__")[0]
        adj.setdefault(src, []).append(tgt)

    # Topological sort from "input" to "output"
    order = []
    visited = set()

    def dfs(node_id):
        if node_id in visited:
            return
        visited.add(node_id)
        for next_id in adj.get(node_id, []):
            dfs(next_id)
        order.append(node_id)

    dfs("input")
    order.reverse()

    # Process in order, skipping input/output pseudo-nodes
    result = audio
    for node_id in order:
        if node_id in ("input", "output"):
            continue
        node = nodes.get(node_id)
        if not node:
            continue
        node_type = node.get("type", "")
        registry_entry = NODE_REGISTRY.get(node_type)
        if not registry_entry:
            continue
        params = node.get("params", {})
        result = registry_entry["fn"](result, sr, params)

    return np.clip(result, -1.0, 1.0)
