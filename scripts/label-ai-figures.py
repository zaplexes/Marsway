"""Label code-native project figures and regenerate their shareable exports.

AI-assisted project code. See AI-USE.md and assets/ai-disclosure.json.
Scientific source imagery is not processed by this script.
"""
import base64
from pathlib import Path
import re
import shutil
import subprocess
import tempfile

ROOT = Path(__file__).resolve().parents[1]
BRANDING = ROOT / 'assets' / 'branding'
encoded = base64.b64encode((BRANDING / 'marsway-logo.png').read_bytes()).decode()
wrapper = f'''<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="1400" viewBox="0 0 1280 1400" role="img" aria-labelledby="title desc">
<title id="title">Marsway emblem — AI-generated</title>
<desc id="desc">Original Marsway emblem generated with OpenAI image generation. Visible disclosure added as a code-native label. See AI-USE.md.</desc>
<metadata>AI-generated visual asset; OpenAI image generation; project disclosure: ../ai-disclosure.json</metadata>
<image href="data:image/png;base64,{encoded}" width="1280" height="1280"/>
<rect x="0" y="1280" width="1280" height="120" fill="#211c32"/>
<text x="640" y="1360" text-anchor="middle" font-family="sans-serif" font-size="62" font-weight="700" fill="#ffce78">AI-GENERATED LOGO</text>
</svg>
'''
(BRANDING / 'marsway-logo-ai-labeled.svg').write_text(wrapper)

for svg in sorted((ROOT / 'docs').glob('*.svg')):
    source = svg.read_text()
    if 'id="ai-assistance-label"' not in source:
        height = int(re.search(r'<svg[^>]*height="(\d+)"', source).group(1))
        label = (
            '<metadata id="ai-assistance-metadata">AI-assisted diagram: content, design and source code developed with ChatGPT/OpenAI Codex. See ../AI-USE.md.</metadata>\n'
            f'<text id="ai-assistance-label" x="64" y="{height-20}" font-family="DejaVu Sans,sans-serif" font-size="15" font-weight="700" fill="#edb797">AI-ASSISTED DIAGRAM · Details: AI-USE.md</text>\n'
        )
        source = source.replace('</svg>', label + '</svg>')
        svg.write_text(source)
    for kind in ('png', 'pdf'):
        subprocess.run(['rsvg-convert', '-f', kind, '-o', str(svg.with_suffix('.'+kind)), str(svg)], check=True)

with tempfile.TemporaryDirectory(prefix='marsway-ai-figures-') as temporary:
    combined = Path(temporary) / 'technical-architecture.pdf'
    subprocess.run(['pdfunite', *[str(ROOT/f'docs/technical-{i:02}.pdf') for i in range(1,7)], str(combined)], check=True)
    shutil.copyfile(combined, ROOT/'docs/technical-architecture.pdf')

subprocess.run(['magick', 'montage', *[str(ROOT/f'docs/technical-{i:02}.png') for i in range(1,7)], '-thumbnail', '480x540', '-tile', '3x2', '-geometry', '+12+12', '-background', '#0b111b', str(ROOT/'docs/technical-overview.png')], check=True)
print('Labeled logo, native figures and regenerated PNG/PDF exports.')
