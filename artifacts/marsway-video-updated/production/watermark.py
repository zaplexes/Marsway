# AI-assisted project code. See AI-USE.md and assets/ai-disclosure.json.
"""Add a persistent English AI disclosure to the existing presentation."""
from pathlib import Path
import subprocess

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / 'marsway-30s-ai-watermark.mp4'
FONT = '/usr/share/fonts/noto/NotoSans-Regular.ttf'
BOLD = '/usr/share/fonts/noto/NotoSans-Bold.ttf'

filters = ','.join([
    'drawbox=x=1240:y=12:w=640:h=62:color=0x0b171b:t=fill',
    f"drawtext=fontfile={BOLD}:text='AI-GENERATED CONTENT':fontsize=23:fontcolor=0xffce78:x=1260:y=18",
    f"drawtext=fontfile={FONT}:text='Narration + logo | Real website and game footage':fontsize=20:fontcolor=white:x=1260:y=47",
    'fade=t=out:st=29.6:d=0.2',
])

subprocess.run([
    'ffmpeg', '-y', '-hide_banner', '-loglevel', 'error',
    '-i', str(ROOT / 'marsway-30s.mp4'),
    '-vf', filters,
    '-af', 'afade=t=out:st=29.45:d=0.35',
    '-map', '0:v:0', '-map', '0:a:0',
    '-c:v', 'libx264', '-preset', 'slow', '-crf', '18',
    '-pix_fmt', 'yuv420p', '-r', '30', '-threads', '4',
    '-c:a', 'aac', '-b:a', '192k', '-ar', '48000',
    '-t', '29.8', '-movflags', '+faststart+use_metadata_tags',
    '-metadata', 'title=Marsway | Explore, Plan & Drive',
    '-metadata', 'description=AI-generated English narration and Marsway logo. AI-assisted code, writing and video editing. Website and gameplay are actual screen recordings.',
    '-metadata', 'comment=Persistent visible AI disclosure. Fictional game terrain; distance estimates are not verified routes.',
    '-metadata:s:a:0', 'title=AI-generated English narration with procedural ambient audio',
    str(OUTPUT),
], check=True)
print(OUTPUT)
