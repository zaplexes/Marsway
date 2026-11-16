# AI-assisted project code. See AI-USE.md and assets/ai-disclosure.json.
"""Embed provenance in generated voice segments and procedural ambient audio."""
from pathlib import Path
import shutil
import subprocess
import tempfile

root = Path(__file__).resolve().parents[1]
folder = root / 'artifacts/marsway-video-updated/audio'
for source in sorted(folder.glob('*')):
    if source.name.startswith('voice-') and source.suffix == '.mp3':
        description = 'AI-generated English narration; en-US-GuyNeural through edge-tts. AI-assisted script. See AI-USE.md.'
    elif source.name == 'ambience.wav':
        description = 'Original procedural sine-tone ambience from AI-assisted code; not a recording of Mars. See AI-USE.md.'
    else:
        continue
    with tempfile.TemporaryDirectory(prefix='marsway-audio-metadata-') as temporary:
        output = Path(temporary) / source.name
        subprocess.run(['ffmpeg', '-y', '-v', 'error', '-i', str(source), '-c', 'copy', '-metadata', f'comment={description}', '-metadata', f'title={description}', str(output)], check=True)
        shutil.copyfile(output, source)
    print(source.name)
