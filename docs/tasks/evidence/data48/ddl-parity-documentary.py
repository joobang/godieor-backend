import sys, subprocess, json
from pathlib import Path
sys.path.insert(0,'/Users/dojoohwan/workspace/godieor-verifier/src')
from godieor_verifier.runner import database
b=Path('/Users/dojoohwan/workspace/godieor-backend')
with database() as (name,_):
 def sql(s):
  p=subprocess.run(['docker','exec','-i',name,'psql','-U','godieor','-d','godieor_vfy','-v','ON_ERROR_STOP=1','-At'],input=s,text=True,capture_output=True)
  if p.returncode: raise RuntimeError('temporary SQL check failed')
  return p.stdout.strip()
 for schema,ddl in [('reference',(b/'contracts/database.sql').read_text()),('migrated','\n'.join(p.read_text() for p in sorted((b/'prisma/migrations').glob('*/migration.sql'))))]:
  sql('CREATE SCHEMA '+schema+'; SET search_path TO '+schema+';\n'+ddl)
 cases=[('ott_season_premiere','movie','movie',True),('ott_season_premiere','drama','series',True),('ott_season_premiere','drama','documentary',True),('ott_season_premiere','movie','documentary',True),('ott_season_premiere','drama','animation',False),('theatrical_release','movie','series',False)]
 checks=[]
 for schema in ['reference','migrated']:
  for kind,ctype,category,valid in cases:
   query=f'''SET search_path TO {schema}; BEGIN;
INSERT INTO content(id,kind,title) VALUES ('00000000-0000-0000-0000-000000000001','{ctype}','SYNTHETIC DATA48');
INSERT INTO event(id,kind,ott_category,content_id,content_type,title,precision,local_date,release_market,origin) VALUES ('00000000-0000-0000-0000-000000000002','{kind}','{category}','00000000-0000-0000-0000-000000000001','{ctype}','SYNTHETIC DATA48','date_only','2026-11-13','KR','fixture'); ROLLBACK;'''
   p=subprocess.run(['docker','exec','-i',name,'psql','-U','godieor','-d','godieor_vfy','-v','ON_ERROR_STOP=1'],input=query,text=True,capture_output=True)
   passed=(p.returncode==0)==valid
   checks.append(dict(schema=schema,kind=kind,category=category,expectedAllowed=valid,passed=passed))
   if not passed:raise RuntimeError('temporary constraint parity failed')
Path('/private/tmp/godieor-data48/ddl-parity-documentary.json').write_text(json.dumps({'scope':'synthetic temporary DB only; not full schema equivalence','checks':checks},indent=2)+'\n')
print('12/12 temporary DDL boundary checks passed; container removed')
