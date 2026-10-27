"""Build documented test variants from preserved ElevenLabs image originals."""
import hashlib
import json
import shutil
from datetime import datetime, timezone
from pathlib import Path

from PIL import Image, ImageDraw, ImageEnhance, ImageFilter, ImageFont
from backend.app.vision import analyze


def main():
    root = Path('fixtures/elevenlabs')
    reference = Image.open(root / 'reference.png').convert('RGB')
    missing = Image.open(root / 'missing-item-original.png').convert('RGB')
    assert reference.size == missing.size == (1280, 720)
    shutil.copyfile(root / 'missing-item-original.png', root / 'missing-item.png')
    ImageEnhance.Brightness(reference).enhance(1.02).save(root / 'refilled.jpg', quality=95)
    ImageEnhance.Brightness(reference).enhance(.99).save(root / 'no-change.jpg', quality=95)
    ImageEnhance.Brightness(missing).enhance(.98).save(root / 'still-empty.jpg', quality=95)
    missing.filter(ImageFilter.GaussianBlur(9)).save(root / 'blurred.jpg', quality=95)
    # Operator-style annotations defined on the stocked reference only.
    # These boxes contain no missing-item or expected-outcome labels.
    columns = [(70, 225), (280, 430), (475, 620), (665, 815), (860, 1010), (1050, 1205)]
    rows = [(22, 202), (265, 438), (498, 670)]
    regions = [{'id': f'R{r+1}-{c+1}', 'box': [x/1280, y/720, (right-x)/1280, (bottom-y)/720]}
               for r, (y, bottom) in enumerate(rows) for c, (x, right) in enumerate(columns)]
    (root / 'regions.json').write_text(json.dumps({'regions': regions}, indent=2))
    files = ['reference.png', 'missing-item.png', 'refilled.jpg', 'still-empty.jpg', 'blurred.jpg', 'no-change.jpg']
    results = {}
    for name in files:
        evidence, overlay = analyze((root / 'reference.png').read_bytes(), (root / name).read_bytes(), regions)
        results[name] = evidence
        (root / ('overlay-' + Path(name).stem + '.png')).write_bytes(overlay)
    (root / 'vision-checks.json').write_text(json.dumps(results, indent=2))
    provenance = {
        'synthetic': True, 'created_utc': datetime.now(timezone.utc).isoformat(),
        'service': 'ElevenLabs Image & Video', 'model_display_name': 'GPT Image 2.5 Sunburst',
        'generation_method': 'Authenticated ElevenLabs browser UI; see prompts.json.',
        'originals': {
            'reference-original.png': 'First stocked shelf generation; retained unused alternate.',
            'reference.png': 'Second stocked shelf generation; actual input to missing-item edit.',
            'missing-item-original.png': 'ElevenLabs reference-based removal edit; preserved unmodified.'
        },
        'derivations': {
            'missing-item.png': 'Byte-identical copy of missing-item-original.png.',
            'refilled.jpg': 'Stocked reference, brightness x1.02, JPEG quality 95. Simulated refill, not an independent capture.',
            'still-empty.jpg': 'Missing-item original, brightness x0.98, JPEG quality 95.',
            'no-change.jpg': 'Stocked reference, brightness x0.99, JPEG quality 95.',
            'blurred.jpg': 'Missing-item original, Gaussian blur radius 9 pixels, JPEG quality 95.'
        },
        'limitations': 'One AI-generated shelf scene and controlled derivatives, not real-store evaluation or independent samples. AI editing changes some fine packaging details outside the removed carton. Predictions receive only image bytes and operator-style reference boxes.',
        'files': {p.name: {'sha256': hashlib.sha256(p.read_bytes()).hexdigest(), 'bytes': p.stat().st_size}
                  for p in sorted(root.iterdir()) if p.suffix in {'.png', '.jpg'} and not p.name.startswith('overlay-') and p.name != 'contact-sheet.jpg'}
    }
    (root / 'provenance.json').write_text(json.dumps(provenance, indent=2))
    font = ImageFont.truetype('C:/Windows/Fonts/segoeui.ttf', 22)
    board = Image.new('RGB', (1280, 1200), '#f5f3ef')
    draw = ImageDraw.Draw(board)
    labels = ['Stocked reference', 'Missing item: middle row, third carton', 'Simulated refill', 'Still empty', 'Blurred rescan', 'No change']
    for i, (name, label) in enumerate(zip(files, labels)):
        x, y = (i % 2)*640, (i // 2)*400
        draw.text((x+12, y+8), label, font=font, fill='#222222')
        board.paste(Image.open(root/name).convert('RGB').resize((640, 360)), (x, y+40))
    board.save(root/'contact-sheet.jpg', quality=92)
    print(json.dumps({name: {'quality_ok': value['quality_ok'], 'candidates': [r['id'] for r in value['candidates']], 'reason': value['reason']} for name, value in results.items()}, indent=2))


if __name__ == '__main__':
    main()
