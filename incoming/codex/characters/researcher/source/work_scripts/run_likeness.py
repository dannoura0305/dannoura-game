from pathlib import Path
here=Path(__file__).resolve().parent
for stage in ('likeness.py','garment_finish.py','likeness_parts.py'):
 path=here/stage
 exec(compile(path.read_text(encoding='utf8'),str(path),'exec'))
