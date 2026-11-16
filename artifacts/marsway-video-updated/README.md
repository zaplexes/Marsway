# Marsway presentation with rover gameplay

This revision uses a fresh recording of the public website at https://zaplexes.github.io/Marsway/, including its updated visual design, persistent companion map and pilotable rover game. The earlier film remains in `../marsway-video/`.

Deliverables:

- `marsway-30s.mp4`: English presentation, 30 seconds, 1920 × 1080, 30 fps, H.264/AAC.
- `marsway-30s.srt`: optional English closed captions. The movie also includes on-screen captions.
- `raw/`: original browser recording, scene timing/focus metadata and review screenshots.
- `production/`: capture, narration and rendering scripts plus intermediate shots.

## Edit

| Time     | Content                                                    |
| -------- | ---------------------------------------------------------- |
| 0–2 s    | Brief exploration question                                 |
| 2–6 s    | NASA imagery in the updated site                           |
| 6–9.5 s  | Compare destination distances and scores                   |
| 9.5–12 s | Adjust study interests                                     |
| 12–16 s  | Source evidence and unknown terrain suitability            |
| 16–21 s  | Simulated round trip and distance limitations              |
| 21–25 s  | Manually drive the current plan to Belva in the rover game |
| 25–28 s  | Scan the checkpoint and start the assisted return          |
| 28–30 s  | Marsway branding, website address and AI disclosure        |

The introduction is shortened from four to two seconds, and the closing from 3.5 to two seconds. Shorter imagery, evidence and planning shots provide the remaining gameplay time.

## Recording and claims

All application and gameplay footage is from real interactions with the public website. No interface recreation, mocked network responses, altered game state or generated Mars footage was used. The approved simulated base remains 18.4446° N, 77.4509° E. Belva is a catalogue centre, not a verified observation site. The game uses the actual current plan through **Drive my plan**, with manual forward movement, an explicit Space-key scan and the real route-assist control for the return.

The film distinguishes scientific evidence from the game's fictional terrain and schematic route. It keeps terrain suitability unknown and identifies trip lines as distance estimates rather than verified routes. External detailed imagery was unavailable during capture; the real app's MOC fallback and availability state remain visible.

The English voice is AI-generated with `en-US-GuyNeural` through edge-tts 7.3.1. The existing Marsway logo was AI-generated; both uses are disclosed in the closing card. The soundtrack is original procedural sine-tone ambience. Framing, magnification and fades are conventional editing effects.

## Reproduce

Use the existing repository Playwright dependency and installed Chromium browser, FFmpeg, Python with NumPy/Pillow and the Noto Sans fonts specified in `production/render.py`. The speech environment requires edge-tts 7.3.1 and network access. See the earlier film's [production requirements](../marsway-video/README.md) for the installed versions and speech-environment setup.

Run from the repository root:

```bash
node artifacts/marsway-video-updated/production/capture.mjs
/tmp/marsway-video-venv/bin/python artifacts/marsway-video-updated/production/narrate.py
python3 artifacts/marsway-video-updated/production/render.py
```

The renderer derives narration tempo from the measured audio duration to keep each line within its shot. The film is a local artifact; no upload or submission is performed by these scripts.
