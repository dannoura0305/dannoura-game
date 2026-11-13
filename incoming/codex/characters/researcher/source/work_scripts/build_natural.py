from pathlib import Path
here=Path(__file__).resolve().parent
for stage in ('natural_base.py','garment_finish.py','natural_layers.py','orbit_detail.py','natural_parts.py'):
 path=here/stage
 exec(compile(path.read_text(encoding='utf8'),str(path),'exec'))
