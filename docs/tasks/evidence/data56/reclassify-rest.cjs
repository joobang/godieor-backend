const fs=require('node:fs'),assert=require('node:assert/strict'),{createRequire}=require('node:module');const req=createRequire(process.cwd()+'/package.json');req('reflect-metadata');const c=req('./dist/src/ott-candidates/domain/candidate'),{prepareReviewed}=req('./dist/src/reviewed-ott/domain/reviewed-mapping'),{OttCandidatesRepository}=req('./dist/src/ott-candidates/ott-candidates.repository');
(async()=>{
 const report=JSON.parse(fs.readFileSync('work/tmdb-release-candidates/latest.json')),input=JSON.parse(fs.readFileSync('data/curated/ott-reviewed-mappings.json')),artifact=JSON.parse(fs.readFileSync('data/curated/ott-animation-reclassified-2026-11-16.json'));
 await new OttCandidatesRepository(process.cwd()+'/work/ott-candidates').transaction(async state=>{
  const prior=prepareReviewed(input,state);let additions=0;
  for(const mapping of input.mappings){const candidate=state.candidates.find(x=>x.id===mapping.candidateId),before=candidate.review.value;if(before.contentKind==='animation')continue;
   const rows=report.rows.filter(r=>r.genreIDs.includes(16)&&r.title===before.title&&r.seasonNumber===before.seasonNumber&&r.dateHint===before.date&&r.platform===before.platform);
   if(!rows.length)continue;assert.equal(rows.length,1);const r=rows[0];
   // Existing official premiere evidence and stable event ID remain unchanged; this only corrects metadata category.
   assert.ok(before.evidence.includes('애니'));const review={...before,contentKind:'animation',animationFormat:r.type==='movie'?'movie':'series',reviewer:'GODIEOR 구현 담당 기존 공식 애니 근거·TMDB 분류 전수대조 2026-11-16',evidence:'기존날짜/시즌/플랫폼검토유지(이번날짜새승인아님). 기존공식애니발표근거와동일제목·시즌·날짜의TMDB '+r.type+'/'+r.tmdbId+' genre16을대조해animation/'+(r.type==='movie'?'movie':'series')+'로분류보정. ID/일정변경없음. DATA56작성자검토/독립승인아님.'};
   c.applyReview(state,review,new Date().toISOString());artifact.updates.push({before,review,mapping,tmdbId:r.tmdbId,tmdbType:r.type,genreIDs:r.genreIDs,sourceRefreshNote:'metadata correction using existing official anime evidence; not a fresh KR date approval'});additions++;
  }
  assert.equal(additions,1);assert.equal(artifact.updates.length,4);const next=prepareReviewed(input,state);
  for(let i=0;i<prior.length;i++){if(prior[i].ottCategory!==next[i].ottCategory)assert.deepEqual({...next[i],ottCategory:prior[i].ottCategory},prior[i]);else assert.deepEqual(next[i],prior[i]);}
 });
 fs.writeFileSync('data/curated/ott-animation-reclassified-2026-11-16.json',JSON.stringify(artifact,null,2)+'\n');console.log('full existing70 scan / 4animationCorrections total / one remaining metadata correction / no new mappings');
})().catch(e=>{console.error(e.name,e.message);process.exitCode=1;});
