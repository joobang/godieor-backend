const fs=require('node:fs');const assert=require('node:assert/strict');const {createRequire}=require('node:module');const root=process.cwd();const req=createRequire(root+'/package.json');req('reflect-metadata');
const {OttCandidatesRepository}=req('./dist/src/ott-candidates/ott-candidates.repository');const {applyReview}=req('./dist/src/ott-candidates/domain/candidate');const {prepareReviewed}=req('./dist/src/reviewed-ott/domain/reviewed-mapping');
(async()=>{
 if(!['localhost','127.0.0.1','[::1]'].includes(new URL(process.env.DATABASE_URL).hostname))throw Error('LOCAL_ONLY');
 const filename='data/curated/ott-reviewed-mappings.json';const old=JSON.parse(fs.readFileSync(filename));assert.equal(old.mappings.length,62);
 const batch=JSON.parse(fs.readFileSync('data/curated/netflix-kr-reviewed-documentary-2026-11-13.json'));assert.equal(batch.items.length,1);
 const next={...old,mappings:[...old.mappings,batch.items[0].mapping]};const repo=new OttCandidatesRepository(root+'/work/ott-candidates');
 fs.copyFileSync(root+'/work/ott-candidates/state.json','/private/tmp/godieor-data49/state-before.json');fs.copyFileSync(filename,'/private/tmp/godieor-data49/mappings-before.json');
 await repo.transaction(async state=>{
  const before=prepareReviewed(old,state);applyReview(state,batch.items[0].review,new Date().toISOString());const after=prepareReviewed(next,state);assert.equal(after.length,63);assert.deepEqual(after.slice(0,62),before);assert.equal(after[62].ottCategory,'documentary');assert.equal(after[62].seasonNumber,1);assert.deepEqual(after[62].time,{type:'date_only',value:'2026-11-23'});
 });
 fs.writeFileSync(filename+'.data49.tmp',JSON.stringify(next,null,2)+'\n');fs.renameSync(filename+'.data49.tmp',filename);console.log('review1 / prepared63 / prior62 canonical records unchanged');
})().catch(()=>{console.error('REVIEW_APPLICATION_FAILED');process.exitCode=1;});
