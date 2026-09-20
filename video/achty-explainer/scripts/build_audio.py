import asyncio
import json
import math
import os
import subprocess
from pathlib import Path

import edge_tts

ROOT = Path(__file__).resolve().parents[1]
SCENES = json.loads((ROOT / "script" / "scenes.json").read_text(encoding="utf-8"))
OUT = ROOT / "public" / "audio"
OUT.mkdir(parents=True, exist_ok=True)
FPS = 30
VOICE = "tr-TR-AhmetNeural"
RATE = "-5%"

async def synthesize():
    durations = []
    for idx, scene in enumerate(SCENES, 1):
        target = OUT / ("scene-" + str(idx) + ".mp3")
        text = scene["narration"]
        communicate = edge_tts.Communicate(text, VOICE, rate=RATE)
        await communicate.save(str(target))
        probe = subprocess.check_output([
            "ffprobe", "-v", "error", "-show_entries", "format=duration",
            "-of", "default=noprint_wrappers=1:nokey=1", str(target)
        ], text=True).strip()
        seconds = float(probe)
        frames = max(90, math.ceil((seconds + 0.45) * FPS))
        durations.append(frames)
        print("scene", idx, round(seconds, 2), "sec ->", frames, "frames")

    starts = []
    total = 0
    for frames in durations:
        starts.append(total)
        total += frames

    generated = (
        "export const SCENE_DURATIONS = " + json.dumps(durations) + " as const;\n"
        "export const SCENE_STARTS = " + json.dumps(starts) + " as const;\n"
        "export const TOTAL_FRAMES = " + str(total) + ";\n"
    )
    (ROOT / "src" / "generated.ts").write_text(generated, encoding="utf-8")
    print("TOTAL", total, "frames =", round(total / FPS, 2), "seconds")

asyncio.run(synthesize())
