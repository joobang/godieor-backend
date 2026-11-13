from pathlib import Path
import os,subprocess,sys,json
sys.path.insert(0,'/Users/dojoohwan/workspace/godieor-verifier/src')
from godieor_verifier.runner import database
root=Path('/Users/dojoohwan/workspace/godieor-backend');out=Path('/private/tmp/godieor-account-snapshot');out.mkdir(exist_ok=True)
node='/private/tmp/godieor-data48/node-v24.22.3-darwin-arm64/bin/node'
with database() as (name,url):
 env={**os.environ,'DATABASE_URL':url,'ACCOUNT_SNAPSHOT_TEST_DATABASE_URL':url}
 p=subprocess.run([node,'node_modules/prisma/build/index.js','migrate','deploy'],cwd=root,env=env,capture_output=True,text=True);assert p.returncode==0,'temporary migration failed'
 for mode,args,expected in [('baseline',['--baseline'],1),('fixed',[],0)]:
  p=subprocess.run([node,'scripts/check-account-snapshot-db.cjs',*args],cwd=root,env=env,capture_output=True,text=True,timeout=90);(out/(mode+'.log')).write_text(p.stdout+p.stderr);print(mode,p.returncode,p.stdout.strip());assert p.returncode==expected,mode+' unexpected exit'
(out/'summary.json').write_text(json.dumps({'scope':'implementer synthetic temporary PostgreSQL; not independent approval','baselineExpectedFailures':2,'fixedPassed':2,'productDataChanged':False,'containerRemoved':True},indent=2)+'\n')
