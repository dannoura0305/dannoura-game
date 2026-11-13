import subprocess,sys
from pathlib import Path
work=Path(__file__).resolve().parent;out=work.parents[1]/'outputs/researcher'
stage=sys.argv[1] if len(sys.argv)>1 else 'build_researcher'
with (work/(stage+'_final.log')).open('w',encoding='utf-8') as log:
    r=subprocess.run([r'C:\Program Files\Blender Foundation\Blender 5.2\blender.exe','-b','--factory-startup','--python-exit-code','7','-P',str(work/(stage+'.py')),'--',str(out)]+sys.argv[2:],stdout=log,stderr=subprocess.STDOUT)
print(stage,r.returncode)
