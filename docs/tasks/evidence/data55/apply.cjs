const fs=require('node:fs'),assert=require('node:assert/strict'),{createRequire}=require('node:module');const req=createRequire(process.cwd()+'/package.json');req('reflect-metadata');const c=req('./dist/src/ott-candidates/domain/candidate'),{prepareReviewed}=req('./dist/src/reviewed-ott/domain/reviewed-mapping'),{OttCandidatesRepository}=req('./dist/src/ott-candidates/ott-candidates.repository');
(async()=>{
 const report=JSON.parse(fs.readFileSync('/private/tmp/godieor-data55/upcoming-final.json'));assert.equal(report.totalPrograms,9);assert.equal(report.errors.length,0);assert.equal(report.rows.length,9);
 const proposals=report.rows.filter(x=>x.status==='new_identity_review_proposal');assert.equal(proposals.length,1);
 const file='data/curated/ott-reviewed-mappings.json',old=JSON.parse(fs.readFileSync(file));assert.equal(old.mappings.length,69);let next=structuredClone(old);const artifact={version:1,asOf:'2026-11-16',scope:'implementer explicit evidence review, not independent approval',reviewedPrograms:9,additions:[]};
 fs.copyFileSync('work/ott-candidates/state.json','/private/tmp/godieor-data55/state-before.json');fs.copyFileSync(file,'/private/tmp/godieor-data55/mappings-before.json');
 await new OttCandidatesRepository(process.cwd()+'/work/ott-candidates').transaction(async state=>{
  const prior=prepareReviewed(old,state),now=new Date().toISOString();
  for(const row of proposals){
   assert.equal(row.matches.length,1);const match=row.matches[0];assert.equal(match.seasonNumber,1);assert.equal(match.officialPlatformDate,match.tmdbSeasonDate);assert.equal(match.firstEpisodeDate,match.tmdbSeasonDate);assert.ok(match.matchedPeople.length>=2);assert.equal(row.searchTruncated,false);assert.equal(row.supplementalIdentity.evidenceRole,'identity_only');
   const discovery={source:'tving',url:row.sourceUrl,headline:row.title,publishedRaw:null,evidenceRevision:'DATA55-official-program-cast-season-crosscheck-2026-11-16'};
   const id=c.addCandidate(state,discovery,now),candidate=state.candidates.find(x=>x.id===id),revision=candidate.revisions.at(-1).token;
   assert.ok(!next.mappings.some(x=>x.candidateId===id));
   const evidence=`TVING ${row.sourceUrl} 명시 ${match.officialPlatformDate} 공개. tvN ${row.supplementalIdentity.sourceUrl} 같은제목·출연진5인과 TMDB tv/${match.tmdbId}/season/${match.seasonNumber} 첫날·첫회 날짜 일치. tvN날짜를OTT날짜로이식하지않음;시즌개수추정없음. DATA55 작성자교차검토/독립승인아님.`;
   const review={id,revision,reviewer:'GODIEOR 구현 담당 공식 작품·방송사 출연진·TMDB 시즌 교차검토 2026-11-16',title:row.title,platform:'tving',market:'KR',contentKind:'variety',premiereConfirmed:true,date:match.officialPlatformDate,localTime:null,timeZone:null,seasonNumber:match.seasonNumber,announcedYear:2026,announcedPeriod:null,evidence};
   c.applyReview(state,review,now);
   const n=String(next.mappings.length+1).padStart(6,'0'),mapping={candidateId:id,revision,contentKey:'work-'+n,eventKey:'event-'+n};next.mappings.push(mapping);artifact.additions.push({discovery,review,mapping,tmdb:{id:match.tmdbId,season:match.seasonNumber,seasonFirstDate:match.tmdbSeasonDate,firstEpisodeDate:match.firstEpisodeDate},identityEvidence:row.supplementalIdentity,matchedPeople:match.matchedPeople});
  }
  const prepared=prepareReviewed(next,state);assert.equal(prepared.length,70);assert.deepEqual(prepared.slice(0,69),prior);
 });
 fs.writeFileSync('data/curated/tving-identity-reviewed-2026-11-16.json',JSON.stringify(artifact,null,2)+'\n');fs.writeFileSync(file+'.data55.tmp',JSON.stringify(next,null,2)+'\n');fs.renameSync(file+'.data55.tmp',file);
 const bf='data/curated/ott-official-tmdb-bindings-2026-11-13.json',bindings=JSON.parse(fs.readFileSync(bf));
 for(const a of artifact.additions)bindings.items.push({type:'tv',tmdbId:a.tmdb.id,seasonNumber:a.tmdb.season,platform:'tving',market:'KR',date:a.review.date,title:a.review.title,sourceUrl:a.discovery.url,identityVerified:true,premiereConfirmed:true,evidence:a.review.evidence,bindingSource:'data/curated/tving-identity-reviewed-2026-11-16.json',bindingReviewedAsOf:'2026-11-16',sourceFreshnessNote:'작성자 검토 기준일. 자동 원문 재조회 결과와 구분.',reviewCandidateId:a.review.id});
 fs.writeFileSync(bf,JSON.stringify(bindings,null,2)+'\n');
 console.log('preflight70 / existing69canonicalUnchanged / additions'+artifact.additions.length);
})().catch(e=>{console.error('DATA55_REVIEW_FAILED',e.name,e.message);process.exitCode=1;});
