"""
TTS Engine — persistent subprocess for TTS-Soundboard.

Reads JSON commands from stdin, writes JSON responses to stdout.
One command per line, one response per line.

Commands:
  {"cmd": "list_voices"}
  {"cmd": "synthesize", "text": "...", "voice_id": "...", "rate": 150, "volume": 1.0, "pitch": 0, "output": "path.wav"}
  {"cmd": "preview", "text": "...", "voice_id": "...", "rate": 150, "volume": 1.0, "pitch": 0}
  {"cmd": "quit"}
"""

import json
import sys
import os
import tempfile
import traceback
import subprocess

try:
    import pyttsx3
except ImportError:
    # Output error and exit if pyttsx3 is not installed
    print(json.dumps({"error": "pyttsx3 not installed. Run: pip install pyttsx3"}), flush=True)
    sys.exit(1)


def init_engine():
    """Initialize the TTS engine."""
    engine = pyttsx3.init()
    return engine


def list_voices(engine):
    """Return available system voices."""
    voices = engine.getProperty("voices")
    result = []
    for v in voices:
        result.append({
            "id": v.id,
            "name": v.name,
            "languages": [str(lang) for lang in (v.languages or [])],
            "gender": getattr(v, "gender", None),
        })
    return result


def apply_voice_params(engine, voice_id=None, rate=150, volume=1.0, pitch=0):
    """Apply voice parameters to the engine."""
    if voice_id:
        engine.setProperty("voice", voice_id)

    # pyttsx3 rate is in words per minute
    engine.setProperty("rate", int(rate))

    # Volume 0.0 to 1.0
    engine.setProperty("volume", max(0.0, min(1.0, float(volume))))

    # Pitch: pyttsx3 doesn't directly support pitch shifting on all backends.
    # On SAPI5 (Windows), we can attempt via XML markup.
    # Store pitch for use in synthesis text wrapping.
    return pitch


def synthesize_to_file(engine, text, output_path, voice_id=None, rate=150, volume=1.0, pitch=0):
    """Synthesize text to a .wav file.

    Spawns a fresh Python process for each synthesis to avoid the SAPI5 COM
    runAndWait() deadlock that occurs on repeated calls within the same process.
    """
    params = json.dumps({
        "text": text,
        "output": output_path,
        "voice_id": voice_id,
        "rate": rate,
        "volume": volume,
        "pitch": pitch,
    })
    result = subprocess.run(
        [sys.executable, os.path.join(os.path.dirname(__file__), "tts_engine.py"), "--synth"],
        input=params,
        capture_output=True,
        text=True,
        timeout=30,
    )
    if result.returncode != 0:
        raise RuntimeError(f"Synthesis failed: {result.stderr.strip() or result.stdout.strip()}")
    return output_path


def preview_speech(engine, text, voice_id=None, rate=150, volume=1.0, pitch=0):
    """Speak text aloud (preview, no file output)."""
    pitch_val = apply_voice_params(engine, voice_id, rate, volume, pitch)

    if pitch_val != 0 and sys.platform == "win32":
        sapi_pitch = max(-10, min(10, int(pitch_val * 10 / 12)))
        text = f'<pitch absmiddle="{sapi_pitch}"/>{text}'

    engine.say(text)
    engine.runAndWait()


def handle_command(engine, cmd):
    """Process a single command and return a response dict."""
    action = cmd.get("cmd")

    if action == "list_voices":
        voices = list_voices(engine)
        return {"ok": True, "voices": voices}

    elif action == "synthesize":
        text = cmd.get("text", "")
        if not text.strip():
            return {"ok": False, "error": "Empty text"}

        output = cmd.get("output")
        if not output:
            # Generate a temp file if no output path specified
            fd, output = tempfile.mkstemp(suffix=".wav", prefix="tts_")
            os.close(fd)

        synthesize_to_file(
            engine,
            text,
            output,
            voice_id=cmd.get("voice_id"),
            rate=cmd.get("rate", 150),
            volume=cmd.get("volume", 1.0),
            pitch=cmd.get("pitch", 0),
        )
        return {"ok": True, "output": output}

    elif action == "preview":
        text = cmd.get("text", "")
        if not text.strip():
            return {"ok": False, "error": "Empty text"}

        # For preview, synthesize to a temp file so the renderer can play it
        fd, output = tempfile.mkstemp(suffix=".wav", prefix="tts_preview_")
        os.close(fd)

        synthesize_to_file(
            engine,
            text,
            output,
            voice_id=cmd.get("voice_id"),
            rate=cmd.get("rate", 150),
            volume=cmd.get("volume", 1.0),
            pitch=cmd.get("pitch", 0),
        )
        return {"ok": True, "output": output}

    elif action == "list_dsp_nodes":
        from dsp_nodes import get_registry_info
        return {"ok": True, "nodes": get_registry_info()}

    elif action == "process_graph":
        # Synthesize TTS then process through DSP node graph
        import numpy as np
        import soundfile as sf
        from dsp_nodes import process_graph

        text = cmd.get("text", "")
        graph = cmd.get("graph", {})

        if not text.strip():
            return {"ok": False, "error": "Empty text"}

        # Step 1: Synthesize raw TTS to temp file
        fd, raw_path = tempfile.mkstemp(suffix=".wav", prefix="tts_raw_")
        os.close(fd)
        synthesize_to_file(
            engine,
            text,
            raw_path,
            voice_id=cmd.get("voice_id"),
            rate=cmd.get("rate", 150),
            volume=cmd.get("volume", 1.0),
            pitch=0,  # pitch is handled by DSP nodes now
        )

        # Step 2: Load audio
        audio, sr = sf.read(raw_path, dtype="float64")
        if audio.ndim > 1:
            audio = audio.mean(axis=1)  # mono

        # Step 3: Process through node graph
        processed = process_graph(audio, sr, graph)

        # Step 4: Write output
        output = cmd.get("output")
        if not output:
            fd, output = tempfile.mkstemp(suffix=".wav", prefix="tts_dsp_")
            os.close(fd)

        sf.write(output, processed, sr)

        # Clean up raw file
        try:
            os.unlink(raw_path)
        except OSError:
            pass

        return {"ok": True, "output": output}

    elif action == "quit":
        return {"ok": True, "quit": True}

    else:
        return {"ok": False, "error": f"Unknown command: {action}"}


def main():
    """Main loop: read JSON commands from stdin, write JSON responses to stdout."""
    try:
        engine = init_engine()
    except Exception as e:
        print(json.dumps({"error": f"Failed to initialize TTS engine: {e}"}), flush=True)
        sys.exit(1)

    # Signal ready
    print(json.dumps({"ok": True, "status": "ready"}), flush=True)

    for line in sys.stdin:
        line = line.strip()
        if not line:
            continue

        try:
            cmd = json.loads(line)
        except json.JSONDecodeError as e:
            print(json.dumps({"ok": False, "error": f"Invalid JSON: {e}"}), flush=True)
            continue

        try:
            response = handle_command(engine, cmd)
        except Exception as e:
            response = {"ok": False, "error": str(e), "traceback": traceback.format_exc()}

        print(json.dumps(response), flush=True)

        if response.get("quit"):
            break

    engine.stop()


def single_synth():
    """Single-shot synthesis mode: read JSON params from stdin, synthesize, exit."""
    params = json.loads(sys.stdin.read())
    engine = pyttsx3.init()
    try:
        text = params["text"]
        output_path = params["output"]
        apply_voice_params(
            engine,
            voice_id=params.get("voice_id"),
            rate=params.get("rate", 150),
            volume=params.get("volume", 1.0),
            pitch=params.get("pitch", 0),
        )
        pitch = params.get("pitch", 0)
        if pitch != 0 and sys.platform == "win32":
            sapi_pitch = max(-10, min(10, int(pitch * 10 / 12)))
            text = f'<pitch absmiddle="{sapi_pitch}"/>{text}'
        engine.save_to_file(text, output_path)
        engine.runAndWait()
    finally:
        engine.stop()


if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "--synth":
        single_synth()
    else:
        main()
