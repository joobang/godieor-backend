const fs=require('node:fs'),assert=require('node:assert/strict'),{createRequire}=require('node:module');const req=createRequire(process.cwd()+'/package.json');req('reflect-metadata');const c=req('./dist/src/ott-candidates/domain/candidate'),{prepareReviewed}=req('./dist/src/reviewed-ott/domain/reviewed-mapping'),{OttCandidatesRepository}=req('./dist/src/ott-candidates/ott-candidates.repository');
(async()=>{
 const batch=JSON.parse(fs.readFileSync('data/curated/ott-source-reviewed-batch-2026-11-16.json'));assert.equal(batch.reviewType,'implementer-manual-source-review-not-independent-approval');assert.equal(batch.referenceInputUsed,false);assert.equal(batch.additions.length,23);
 const file='data/curated/ott-reviewed-mappings.json',prior=JSON.parse(fs.readFileSync(file));assert.equal(prior.mappings.length,70);fs.copyFileSync(file,'/private/tmp/godieor-data70/mappings-before.json');fs.copyFileSync('work/ott-candidates/state.json','/private/tmp/godieor-data70/state-before.json');let next=structuredClone(prior);const added=[];
 const lock=fs.openSync(file+'.writer.lock','wx');try{
 await new OttCandidatesRepository('work/ott-candidates').transaction(async state=>{
  const before=prepareReviewed(prior,state),now=new Date().toISOString(),seen=new Set();
  for(const item of batch.additions){
   assert.ok(item.evidenceUrls.length&&item.sourceHashes.every(h=>/^[a-f0-9]{64}$/.test(h)));const identity=JSON.stringify([item.platform,item.title,item.date,item.seasonNumber]);assert.ok(!seen.has(identity));seen.add(identity);
   let id=item.candidateId;
   if(!id||!state.candidates.some(x=>x.id===id))id=c.addCandidate(state,{source:item.source,url:item.sourceUrl,headline:item.title,publishedRaw:null,evidenceRevision:'DATA70:'+item.sourceHashes.join(':')},now);
   const candidate=state.candidates.find(x=>x.id===id);assert.ok(candidate);assert.equal(candidate.url,item.sourceUrl);assert.equal(candidate.review,null);
   const revision=candidate.revisions.at(-1).token;if(item.revision)assert.equal(revision,item.revision);
   const format=item.animationFormat||item.documentaryFormat;
   const evidence=`DATA70 author-reviewed official KR platform premiere ${item.date}; ${item.evidenceUrls.join(' ; ')}; ${JSON.stringify(item.officialIdentity)}; ${item.rationale}`.slice(0,500);
   const review={id,revision,reviewer:'GODIEOR DATA-70 author source review 2026-11-16',title:item.title,platform:item.platform,market:'KR',contentKind:item.contentKind,...(item.animationFormat?{animationFormat:item.animationFormat}:{}),...(item.documentaryFormat?{documentaryFormat:item.documentaryFormat}:{}),premiereConfirmed:true,date:item.date,localTime:null,timeZone:null,seasonNumber:item.seasonNumber,announcedYear:Number(item.date.slice(0,4)),announcedPeriod:null,evidence};
   c.applyReview(state,review,now);assert.deepEqual(c.eligibility(candidate),[]);
   const n=String(next.mappings.length+1).padStart(6,'0'),mapping={candidateId:id,revision,contentKey:'work-'+n,eventKey:'event-'+n};assert.ok(!next.mappings.some(m=>m.eventKey===mapping.eventKey||m.candidateId===id));next.mappings.push(mapping);added.push({...item,candidateId:id,revision,review,mapping});
  }
  const full=prepareReviewed(next,state);assert.equal(full.length,93);assert.deepEqual(full.slice(0,70),before);
 });
 fs.writeFileSync(file+'.data70.tmp',JSON.stringify(next,null,2)+'\n');fs.renameSync(file+'.data70.tmp',file);
 const result={...batch,additions:added,existingCanonicalUnchanged:true};fs.writeFileSync('data/curated/ott-source-reviewed-batch-2026-11-16.json',JSON.stringify(result,null,2)+'\n');
 console.log(JSON.stringify({existing:70,newReviews:added.length,validatedTotal:next.mappings.length,existingCanonicalUnchanged:true}));
 }finally{fs.closeSync(lock);fs.unlinkSync(file+'.writer.lock');}
})().catch(e=>{console.error('DATA70_APPLY_FAILED',e.name,e.message);process.exitCode=1});
