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
    """Synthesize text to a .wav file."""
    pitch_val = apply_voice_params(engine, voice_id, rate, volume, pitch)

    # On Windows SAPI5, we can use SSML-like pitch adjustment
    if pitch_val != 0 and sys.platform == "win32":
        # SAPI5 pitch range is roughly -10 to +10
        sapi_pitch = max(-10, min(10, int(pitch_val * 10 / 12)))
        text = f'<pitch absmiddle="{sapi_pitch}"/>{text}'

    engine.save_to_file(text, output_path)
    engine.runAndWait()
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


if __name__ == "__main__":
    main()
