from pathlib import Path
import sys,subprocess
w=Path(__file__).resolve().parent
stage=sys.argv[1]
with (w/(stage+'.log')).open('w',encoding='utf8') as f:
 result=subprocess.run([r'C:\Program Files\Blender Foundation\Blender 5.2\blender.exe','-b','--factory-startup','--python-exit-code','7','-P',str(w/(stage+'.py'))],stdout=f,stderr=subprocess.STDOUT)
sys.exit(result.returncode)
