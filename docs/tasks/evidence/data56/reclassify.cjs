const fs=require('node:fs'),assert=require('node:assert/strict'),{createRequire}=require('node:module');const req=createRequire(process.cwd()+'/package.json');req('reflect-metadata');const c=req('./dist/src/ott-candidates/domain/candidate'),{prepareReviewed}=req('./dist/src/reviewed-ott/domain/reviewed-mapping'),{OttCandidatesRepository}=req('./dist/src/ott-candidates/ott-candidates.repository');
(async()=>{
 const current=JSON.parse(fs.readFileSync('work/tmdb-release-candidates/latest.json'));
 const confirmed=current.rows.filter(r=>r.genreIDs?.includes(16)&&r.officialEvidence?.some(x=>x.sourceRefreshStatus==='matched'&&x.reviewCandidateId));
 assert.equal(confirmed.length,3);
 const input=JSON.parse(fs.readFileSync('data/curated/ott-reviewed-mappings.json'));assert.equal(input.mappings.length,70);
 const artifact={version:1,asOf:'2026-11-16',scope:'implementer category correction after user animation scope confirmation; no new date claims/independent approval',updates:[]};
 fs.copyFileSync('work/ott-candidates/state.json','/private/tmp/godieor-data56/state-before.json');
 await new OttCandidatesRepository(process.cwd()+'/work/ott-candidates').transaction(async state=>{
  const prior=prepareReviewed(input,state),now=new Date().toISOString();
  for(const row of confirmed){
   const binding=row.officialEvidence.find(x=>x.reviewCandidateId&&x.sourceRefreshStatus==='matched'),candidate=state.candidates.find(x=>x.id===binding.reviewCandidateId),mapping=input.mappings.find(x=>x.candidateId===candidate?.id);
   assert.ok(mapping);const before=candidate.review.value;assert.equal(before.date,binding.date);assert.equal(before.date,row.dateHint);assert.equal(before.seasonNumber,row.seasonNumber);
   const review={...before,contentKind:'animation',animationFormat:row.type==='movie'?'movie':'series',reviewer:'GODIEOR 구현 담당 애니 범위·형태·기존 공식 일정 대조 2026-11-16',evidence:`기존공식Netflix KR일자/ID/시즌유지. TMDB ${row.type}/${row.tmdbId} genre16확인,명시매체 ${row.type==='movie'?'movie':'series'}. 사용자애니포함확정에따라분류만animation으로보정. 날짜/플랫폼/키추정변경없음. DATA56작성자검토/독립승인아님.`};
   c.applyReview(state,review,now);artifact.updates.push({before,review,mapping,tmdbId:row.tmdbId,tmdbType:row.type,genreIDs:row.genreIDs});
  }
  const next=prepareReviewed(input,state);for(let i=0;i<prior.length;i++){
   const changed=artifact.updates.some(x=>x.mapping.eventKey===input.mappings[i].eventKey);
   if(changed){assert.equal(next[i].ottCategory,'animation');assert.deepEqual({...next[i],ottCategory:prior[i].ottCategory},prior[i]);}else assert.deepEqual(next[i],prior[i]);
  }
 });
 fs.writeFileSync('data/curated/ott-animation-reclassified-2026-11-16.json',JSON.stringify(artifact,null,2)+'\n');console.log('70canonical preflight /3categoryCorrections/67unchanged/noNewMappings');
})().catch(e=>{console.error('DATA56_REVIEW_FAILED',e.name,e.message);process.exitCode=1;});
