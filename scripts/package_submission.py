"""Create a source/evidence handoff archive, excluding credentials and user data."""
import hashlib
import json
import zipfile
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]


def main():
    files=list(ROOT.glob('*.md'))
    copy=ROOT/'docs/submission/DEVPOST_COPY.md'
    if copy.exists():files.append(copy)
    files += [ROOT/name for name in ('.gitignore','.env.example','requirements.txt','requirements.lock.txt','pytest.ini')]
    excluded={'node_modules','dist','__pycache__','test-results','playwright-report','submission'}
    for directory in ('backend','frontend','fixtures/generator','fixtures/elevenlabs','evaluation','infrastructure','scripts','docs'):
        for p in (ROOT/directory).rglob('*'):
            if not p.is_file() or excluded.intersection(p.relative_to(ROOT).parts):continue
            if p.name.endswith('.tsbuildinfo') or p.suffix in {'.pyc','.zip'}:continue
            files.append(p)
    folder=ROOT/'docs/submission';folder.mkdir(exist_ok=True)
    archive=folder/'ShelfSignal-source-and-evidence.zip'
    manifest=[]
    with zipfile.ZipFile(archive,'w',zipfile.ZIP_DEFLATED) as z:
        for p in sorted(set(files)):
            name=p.relative_to(ROOT).as_posix()
            assert not any(part in name.split('/') for part in ('.aws','.venv','.env','data','.deployment'))
            content=p.read_bytes();z.writestr(name,content)
            manifest.append({'path':name,'sha256':hashlib.sha256(content).hexdigest(),'bytes':len(content)})
        z.writestr('SOURCE_MANIFEST.json',json.dumps(manifest,indent=2))
    summary={'archive':str(archive.relative_to(ROOT)),'files':len(manifest),'bytes':archive.stat().st_size,'sha256':hashlib.sha256(archive.read_bytes()).hexdigest(),'contains_user_images':False,'contains_credentials':False}
    (folder/'archive.json').write_text(json.dumps(summary,indent=2),encoding='utf-8')
    print(json.dumps(summary,indent=2))


if __name__=='__main__':main()
