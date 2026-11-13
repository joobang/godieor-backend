const {createRequire}=require('node:module');const req=createRequire(process.cwd()+'/package.json');const {Pool}=req('pg');const fs=require('node:fs');const {spawnSync}=require('node:child_process');
(async()=>{
 const u=new URL(process.env.DATABASE_URL);if(!['localhost','127.0.0.1','[::1]'].includes(u.hostname))throw Error('LOCAL_ONLY');
 const p=new Pool({connectionString:process.env.DATABASE_URL,max:1});
 try{
  const mig=(await p.query('SELECT migration_name,finished_at IS NOT NULL AS finished, rolled_back_at IS NOT NULL AS rolled_back FROM _prisma_migrations ORDER BY migration_name')).rows;
  if(mig.some(x=>!x.finished&&!x.rolled_back))throw Error('INCOMPLETE_MIGRATION');
  const counts=(await p.query("SELECT count(*)::int AS mappings FROM event_source WHERE provider_key='ott_reviewed'")).rows[0];
  if(counts.mappings!==62)throw Error('UNEXPECTED_BASE_COUNT');
  fs.writeFileSync('/private/tmp/godieor-data49/preflight.json',JSON.stringify({localOnly:true,migrations:mig,...counts},null,2)+'\n');
 }finally{await p.end();}
 const result=spawnSync(process.execPath,['node_modules/prisma/build/index.js','migrate','deploy'],{env:process.env,encoding:'utf8'});
 fs.writeFileSync('/private/tmp/godieor-data49/migrate.log',(result.stdout??'')+(result.stderr??''));
 if(result.status!==0)throw Error('MIGRATION_FAILED');
 console.log('Local preflight and migration deploy succeeded; baseline mappings62');
})().catch(e=>{console.error(['LOCAL_ONLY','INCOMPLETE_MIGRATION','UNEXPECTED_BASE_COUNT','MIGRATION_FAILED'].includes(e.message)?e.message:'LOCAL_PREFLIGHT_FAILED');process.exitCode=1;});
