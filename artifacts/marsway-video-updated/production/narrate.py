"""Generate the updated English presentation narration."""
import asyncio
from pathlib import Path
import edge_tts

ROOT = Path(__file__).resolve().parents[1]
LINES = [
    'Where next on Mars?',
    'Marsway combines NASA imagery with scientific evidence.',
    'Compare destinations, distances, and scores.',
    'Adjust your study interests.',
    'Inspect evidence. Terrain suitability remains unknown.',
    'Plan your round trip. Distance estimates, not verified routes.',
    'Then drive your plan in our rover game. Fictional terrain, real adventure.',
    'Marsway.',
]

async def main():
    for index, line in enumerate(LINES):
        await edge_tts.Communicate(line, 'en-US-GuyNeural', rate='+6%').save(
            str(ROOT / 'audio' / f'voice-{index}.mp3')
        )
        print(index, line, flush=True)

asyncio.run(main())
