# AI-assisted project code. See AI-USE.md and assets/ai-disclosure.json.
"""Render a 30-second film from genuine browser captures and graphic overlays."""
import json
from pathlib import Path
import subprocess
import wave
import numpy as np
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
RAW = ROOT / 'raw'
OUT = ROOT / 'production'
FONT = '/usr/share/fonts/noto/NotoSans-Regular.ttf'
BOLD = '/usr/share/fonts/noto/NotoSans-Bold.ttf'
ACCENT = '#eb986c'
WHITE = '#f4f1e8'
MUTED = '#b3c6bd'

def run(args):
    subprocess.run(args, check=True)

def font(size, bold=False):
    return ImageFont.truetype(BOLD if bold else FONT, size)

def text(draw, xy, value, size=28, fill=WHITE, bold=False):
    draw.text(xy, value, font=font(size, bold), fill=fill)

def center(draw, y, value, size, fill=WHITE, bold=False):
    f = font(size, bold)
    width = draw.textlength(value, font=f)
    draw.text(((1920-width)/2, y), value, font=f, fill=fill)

def overlay(index, title, subtitles, opening=False):
    image = Image.new('RGBA', (1920, 1080))
    d = ImageDraw.Draw(image)
    text(d, (160, 29), 'MARSWAY  /  ' + title, 25, WHITE, True)
    text(d, (1420, 34), 'MISSION BRIEFING', 18, MUTED)
    d.line((160, 76, 1760, 76), fill=ACCENT, width=2)
    for x, y, dx, dy in [(153,83,35,35),(1767,83,-35,35),(153,997,35,-35),(1767,997,-35,-35)]:
        d.line((x,y,x+dx,y), fill=ACCENT, width=2)
        d.line((x,y,x,y+dy), fill=ACCENT, width=2)
    if opening:
        for x in range(160, 900):
            alpha = int(240 * max(0, 1-(x-160)/740))
            d.line((x,90,x,990), fill=(10,22,25,alpha))
        text(d, (210, 260), 'HUMAN EXPLORATION / MARS', 23, ACCENT, True)
        text(d, (205, 318), 'Where', 110, WHITE, True)
        text(d, (205, 445), 'next?', 110, WHITE, True)
        text(d, (212, 625), 'A decision begins with evidence.', 28, WHITE)
    for j, line in enumerate(subtitles):
        center(d, 1002 + j*36, line, 27)
    image.save(OUT / f'overlay-{index}.png')

def endcard():
    image = Image.new('RGB', (1920,1080), '#0b171b')
    d = ImageDraw.Draw(image)
    for x in range(100,1920,100):
        d.line((x,0,x,1080), fill='#102126')
    for y in range(40,1080,100):
        d.line((0,y,1920,y), fill='#102126')
    center(d, 130, 'NASA SPACE APPS PROJECT', 24, MUTED)
    center(d, 493, 'MARSWAY', 105, WHITE, True)
    center(d, 635, 'EXPLORATION STARTS WITH EVIDENCE', 30, ACCENT, True)
    d.line((650,730,1270,730), fill=ACCENT, width=2)
    center(d, 775, 'zaplexes.github.io/Marsway/', 40)
    center(d, 950, 'Actual website recording · AI-generated narration and logo', 21, MUTED)
    center(d, 990, 'NASA imagery credits and scientific sources: website documentation', 18, MUTED)
    image.save(OUT / 'endcard.png')

scenes = {s['name']: s for s in json.loads((RAW/'scenes.json').read_text())}
# Preserve the recorded sequence so score changes follow the interest adjustment.
timeline = [
    ('01-globe', 2, '01 / THE QUESTION', ['Where next on Mars?']),
    ('02-imagery', 4, '02 / NASA IMAGERY', ['Marsway combines NASA imagery with scientific evidence.']),
    ('03-compare', 3.5, '03 / COMPARE DESTINATIONS', ['Compare destinations, distances, and scores.']),
    ('04-interests', 2.5, '04 / YOUR PRIORITIES', ['Adjust your study interests.']),
    ('05-evidence', 4, '05 / INSPECT THE EVIDENCE', ['Inspect evidence. Terrain suitability remains unknown.']),
    ('06-trip', 5, '06 / PLAN THE RETURN', ['Plan your round trip.', 'Distance estimates, not verified routes.']),
    ('07-game-drive', 4, '07 / DRIVE YOUR PLAN', ['Then drive your plan in our rover game.', 'Arcade experience · fictional terrain · schematic route']),
    ('08-game-scan', 3, '08 / EXPLORE & SCAN', ['Fictional terrain, real adventure.', 'Game discoveries are separate from scientific work.']),
]

for i, (name, duration, title, subs) in enumerate(timeline):
    overlay(i, title, subs, opening=(i==0))
    s = scenes[name]
    speed = duration / s['duration']
    vf = (
        f'[0:v]setpts={speed}*(PTS-STARTPTS),fps=30,'
        'scale=1600:900:flags=lanczos,setsar=1,'
        'pad=1920:1080:160:90:color=0x0b171b[base];'
        f'[base][1:v]overlay=0:0:format=auto,'
        f'fade=t=in:st=0:d=0.16,fade=t=out:st={duration-.14}:d=0.14,'
        'format=yuv420p[out]'
    )
    # A synchronized inset magnifies the real interface without recreating it.
    if name in ('03-compare','04-interests'):
        focus = s['focus']
        x = max(0, round(focus['x']))
        y = max(0, round(focus['y']))
        w = round(focus['width'])
        h_source = min(500 if name=='03-compare' else round(focus['height']), 1080-y)
        crop = f'{w}:{h_source}:{x}:{y}'
        h = min(750, round(h_source*450/w))
        zoom_width = round(w*h/h_source)
        vf = (
            f'[0:v]setpts={speed}*(PTS-STARTPTS),fps=30,split=2[wide][detail];'
            '[wide]scale=1600:900:flags=lanczos,setsar=1,pad=1920:1080:160:90:color=0x0b171b[base];'
            f'[detail]crop={crop},scale={zoom_width}:{h}:flags=lanczos,'
            'drawbox=x=0:y=0:w=iw:h=ih:color=0xeb986c:t=3[zoom];'
            '[base][zoom]overlay=1190:170[focused];'
            f'[focused][1:v]overlay=0:0:format=auto,'
            f'fade=t=in:st=0:d=0.16,fade=t=out:st={duration-.14}:d=0.14,'
            'format=yuv420p[out]'
        )
    if name.startswith(('07-game', '08-game')):
        focus = s['focus']
        x, y = max(0,round(focus['x'])), max(0,round(focus['y']))
        w = min(round(focus['width']),1920-x)
        h = min(round(focus['height']),1080-y)
        vf = (
            f'[0:v]setpts={speed}*(PTS-STARTPTS),fps=30,crop={w}:{h}:{x}:{y},'
            'scale=1600:900:force_original_aspect_ratio=decrease:flags=lanczos,setsar=1,'
            'pad=1920:1080:(ow-iw)/2:(oh-ih)/2:color=0x0b171b[base];'
            '[base][1:v]overlay=0:0:format=auto,'
            f'fade=t=in:st=0:d=0.12,fade=t=out:st={duration-.12}:d=0.12,format=yuv420p[out]'
        )
    run(['ffmpeg','-y','-hide_banner','-loglevel','error',
         '-ss',str(s['start']),'-t',str(s['duration']),'-i',str(RAW/'browser.webm'),
         '-loop','1','-i',str(OUT/f'overlay-{i}.png'),
         '-filter_complex',vf,'-map','[out]','-t',str(duration),
         '-an','-c:v','libx264','-preset','fast','-crf','18','-threads','4',
         str(OUT/f'shot-{i}.mp4')])
    print('Rendered', name, flush=True)

endcard()
run(['ffmpeg','-y','-hide_banner','-loglevel','error',
     '-loop','1','-i',str(OUT/'endcard.png'),'-i','assets/branding/marsway-logo.png',
     '-filter_complex','[1:v]scale=245:245[logo];[0:v][logo]overlay=(W-w)/2:225,fade=t=in:st=0:d=0.15,fade=t=out:st=1.85:d=0.15,format=yuv420p[out]',
     '-map','[out]','-r','30','-t','2','-an','-c:v','libx264','-preset','fast','-crf','18',
     str(OUT/'shot-8.mp4')])
(OUT/'concat.txt').write_text(''.join(f"file '{OUT/f'shot-{i}.mp4'}'\n" for i in range(9)))
run(['ffmpeg','-y','-hide_banner','-loglevel','error','-f','concat','-safe','0','-i',str(OUT/'concat.txt'),'-c','copy',str(OUT/'picture.mp4')])

# Original, understated synthesized ambience; no third-party music recording.
sample_rate=48000
t=np.arange(30*sample_rate)/sample_rate
envelope=np.minimum(t/2,1)*np.minimum((30-t)/2,1)
bed=np.zeros_like(t)
for hz, amplitude in [(65.406,.021),(98,.012),(130.813,.009),(196,.004)]:
    bed += amplitude*np.sin(2*np.pi*hz*t+.14*np.sin(2*np.pi*.07*t))
bed *= envelope*(.85+.15*np.sin(2*np.pi*.12*t))
with wave.open(str(ROOT/'audio/ambience.wav'),'wb') as f:
    f.setnchannels(1); f.setsampwidth(2); f.setframerate(sample_rate)
    f.writeframes((bed*32767).astype('<i2').tobytes())

inputs=['-i',str(OUT/'picture.mp4'),'-i',str(ROOT/'audio/ambience.wav')]
for i in range(8):
    inputs += ['-i',str(ROOT/f'audio/voice-{i}.mp3')]
starts=[.1,2.03,6.03,9.53,12.03,16.03,21.03,28.1]
slots=[1.9,3.97,3.47,2.47,3.97,4.97,6.97,1.8]
speeds=[]
for i, slot in enumerate(slots):
    audio_duration=float(subprocess.check_output(['ffprobe','-v','error','-show_entries','format=duration','-of','csv=p=0',str(ROOT/f'audio/voice-{i}.mp3')],text=True))
    speeds.append(max(1,audio_duration/(slot-.12)))
print('Narration tempo factors:', speeds, flush=True)
filters=[]
for i, (start,speed) in enumerate(zip(starts,speeds)):
    filters.append(f'[{i+2}:a]atempo={speed},highpass=f=75,loudnorm=I=-16:TP=-2:LRA=7,adelay={round(start*1000)}:all=1[v{i}]')
filters.append('[1:a]volume=.8[bed]')
filters.append('[bed]'+''.join(f'[v{i}]' for i in range(8))+'amix=inputs=9:duration=longest:normalize=0,alimiter=limit=.9,afade=t=out:st=29.7:d=0.3[audio]')
run(['ffmpeg','-y','-hide_banner','-loglevel','error',*inputs,
     '-filter_complex',';'.join(filters),'-map','0:v','-map','[audio]',
     '-c:v','copy','-c:a','aac','-b:a','192k','-ar','48000','-t','30',
     '-movflags','+faststart',str(ROOT/'marsway-30s.mp4')])
print('Final video:',ROOT/'marsway-30s.mp4',flush=True)
