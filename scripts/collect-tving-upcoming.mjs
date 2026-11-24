#!/usr/bin/env node
// Independent first-party discovery: public TVING upcoming band -> explicit release claims -> TMDB identity evidence.
import { ottSourceFailure } from './ott-source-diagnostics.mjs';
import { readFile,writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { parseOfficialSource } from './official-ott-source.mjs';
import {tvnProgramLinks,parseTvnCast,matchCast} from './ott-identity-evidence.mjs';
import { createTmdbClient,monthRange } from './tmdb-date-discovery.mjs';
import { configuredMonths } from './ott-schedule-window.mjs';
const normalized=(s)=>String(s??'').normalize('NFKC').toLowerCase().replace(/[\s\p{P}\p{S}]/gu,'');
function next(html){const m=/<script\b(?=[^>]*\bid=["']__NEXT_DATA__["'])[^>]*>([\s\S]*?)<\/script>/i.exec(html);if(!m)throw Error('TVING_HOME_STRUCTURE_CHANGED');return JSON.parse(m[1]);}
export function upcomingPrograms(html){
  const programs=new Map();let bands=0;
  const walk=(x)=>{
    if(Array.isArray(x))x.forEach(walk);
    else if(x&&typeof x==='object'){
      if(typeof x.bandName==='string'&&x.bandName.includes('공개 예정')){
        bands++;
        if(!Array.isArray(x.items))throw Error('TVING_UPCOMING_ITEMS_CHANGED');
        for(const i of x.items){if(!/^[PM]\d+$/.test(i.code??'')||!i.title)throw Error('TVING_UPCOMING_ITEM_CHANGED');programs.set(i.code,{code:i.code,title:i.title});}
      }
      for(const v of Object.values(x))if(v&&typeof v==='object')walk(v);
    }
  };
  walk(next(html).props?.pageProps);
  if(!bands||!programs.size||programs.size>100)throw Error('TVING_UPCOMING_SCOPE_CHANGED');
  return [...programs.values()];
}
export async function collectUpcoming(request,fetchImpl,{knownBindings=[],monthlyCandidates=[],months=configuredMonths()}={}){
  months.forEach(monthRange);
  const html=async(url)=>{const r=await fetchImpl(url,{signal:AbortSignal.timeout(20000)});if(!r.ok)throw Error(`PRIMARY_HTTP_${r.status}`);if(r.url&&new URL(r.url).origin!=='https://www.tving.com')throw Error('PRIMARY_REDIRECT_HOST_CHANGED');return r.text();};
  const primary=async(url)=>{const r=await fetchImpl(url,{signal:AbortSignal.timeout(20000)});if(!r.ok)throw Error(`PRIMARY_HTTP_${r.status}`);if(r.url&&new URL(r.url).origin!==new URL(url).origin)throw Error('PRIMARY_REDIRECT_HOST_CHANGED');return r.text();};
  let broadcasterIndex=null;
  const programs=upcomingPrograms(await html('https://www.tving.com/'));
  const rows=[],errors=[],cache=new Map();
  async function get(path,params={}){const key=JSON.stringify([path,params]);if(!cache.has(key))cache.set(key,request(path,params));return cache.get(key);}
  for(const program of programs){
    const sourceUrl='https://www.tving.com/contents/'+program.code;
    try{
      if(program.code.startsWith('M')) {
        const page=next(await html(sourceUrl)).props?.pageProps;
        if(page?.contentType!=='movie'||page.programCode!==program.code||
          normalized(page.programName)!==normalized(program.title)||page.contentInfo?.code!==program.code)
          throw Error('TVING_MOVIE_IDENTITY_CHANGED');
        // Movie detail pages provide a month/day "openText" without a year.
        // Preserve the official discovery, but do not invent the calendar year.
        rows.push({...program,sourceUrl,sourceClaims:[],
          sourceWork:{title:page.programName,category:'영화',actors:[],channel:null},
          sourceIdentity:{movieCode:program.code},officialOpenText:page.openText??null,
          status:'exact_platform_date_missing',matches:[],publishingAllowed:false});
        continue;
      }
      const parsed=parseOfficialSource({platform:'tving',sourceUrl,title:program.title,date:null,seasonNumber:null},await html(sourceUrl));
      if(normalized(parsed.sourceWork?.title)!==normalized(program.title))throw Error('TVING_HOME_PROGRAM_TITLE_CHANGED');
      const claims=parsed.sourceClaims;
      const row={...program,sourceUrl,sourceClaims:claims,sourceWork:parsed.sourceWork,sourceIdentity:parsed.sourceIdentity,status:'needs_review',matches:[],publishingAllowed:false};
      if(!claims.length){row.status='exact_platform_date_missing';rows.push(row);continue;}
      if(claims.length!==1||!months.includes(claims[0].date.slice(0,7))){row.status='ambiguous_or_outside_window';rows.push(row);continue;}
      if(!['드라마','예능'].includes(parsed.sourceWork?.category)){row.status='unsupported_content_category';rows.push(row);continue;}
      const claim=claims[0];row.officialPlatformDate=claim.date;
      let sourceActors=parsed.sourceWork.actors;
      if(sourceActors.length<2&&parsed.sourceWork.channel==='tvN'){
        try{
          broadcasterIndex??=primary('https://tvn.cjenm.com/ko/');
          const urls=tvnProgramLinks(await broadcasterIndex,program.title);
          if(urls.length===1){
            row.supplementalIdentity=parseTvnCast(await primary(urls[0]),urls[0],program.title);
            sourceActors=[...new Set([...sourceActors,...row.supplementalIdentity.actors])];
          }else row.supplementalIdentityStatus=urls.length?'ambiguous_program_links':'program_link_not_found';
        }catch(e){row.supplementalIdentityStatus='lookup_failed';row.supplementalIdentityError=ottSourceFailure(e).errorCode;}
      }
      const known=knownBindings.filter(b=>b.sourceUrl===sourceUrl&&b.platform==='tving'&&b.identityVerified&&b.date===claim.date&&(claim.seasonNumber==null||b.seasonNumber===claim.seasonNumber));
      if(known.length>1){row.status='ambiguous_review_identity';rows.push(row);continue;}
      if(known.length===1){row.status='existing_review_identity';row.matches=[{tmdbId:known[0].tmdbId,seasonNumber:known[0].seasonNumber,reviewCandidateId:known[0].reviewCandidateId,identityMethod:'existing_explicit_binding'}];rows.push(row);continue;}
      const identities=new Map();
      for(const c of monthlyCandidates)if(c.type==='tv'&&normalized(c.title)===normalized(program.title))identities.set(c.tmdbId,{id:c.tmdbId});
      let pages=1;
      for(let page=1;page<=Math.min(pages,2);page++){
        const result=await get('/search/tv',{query:program.title,language:'ko-KR',page});pages=result.total_pages??1;
        for(const c of result.results??[])if([c.name,c.original_name].some(n=>normalized(n)===normalized(program.title)))identities.set(c.id,c);
      }
      row.searchTruncated=pages>2;
      for(const hit of identities.values()){
        const tv=await get(`/tv/${hit.id}`,{language:'ko-KR'});
        if(tv.id!==hit.id)throw Error('TMDB_ID_MISMATCH');
        const credits=await get(`/tv/${hit.id}/aggregate_credits`,{language:'ko-KR'});
        const identity=await matchCast(sourceActors,credits.cast??[],get);
        const {matchedPeople,matchedActors}=identity;
        row.identityDiagnostics??=[];row.identityDiagnostics.push({tmdbId:hit.id,title:tv.name,...identity,
          sourceActorCount:sourceActors.length,status:!identity.complete?'identity_lookup_incomplete':matchedPeople.length<2?'insufficient_cast_identity':'cast_identity_matched'});
        if(!identity.complete||matchedPeople.length<2)continue;
        for(const season of tv.seasons??[]){
          if(season.season_number<1||claim.seasonNumber!=null&&season.season_number!==claim.seasonNumber)continue;
          const day=season.air_date;
          if(!/^\d{4}-\d{2}-\d{2}$/.test(day??''))continue;
          const seasonDetail=await get(`/tv/${hit.id}/season/${season.season_number}`,{language:'ko-KR'});
          if(seasonDetail.season_number!==season.season_number)throw Error('TMDB_SEASON_MISMATCH');
          const firstEpisodeDate=seasonDetail.episodes?.find(e=>e.episode_number===1)?.air_date??null;
          if(seasonDetail.air_date!==day||firstEpisodeDate&&firstEpisodeDate!==day){row.seasonDateConflicts??=[];row.seasonDateConflicts.push({tmdbId:hit.id,seasonNumber:season.season_number,summaryDate:day,detailDate:seasonDetail.air_date,firstEpisodeDate});continue;}
          const delta=Math.round((Date.parse(claim.date)-Date.parse(day))/86400000);
          row.matches.push({tmdbId:hit.id,tmdbTitle:tv.name,seasonNumber:season.season_number,tmdbSeasonDate:day,
            officialPlatformDate:claim.date,firstEpisodeDate,platformDateOffsetDays:delta,matchedActors,matchedPeople,identityMethod:'exact_title_cast_and_explicit_season_details',
            dateSemantics:delta===0?'same_date':'global_season_air_date_vs_kr_platform_date'});
        }
      }
      row.status=row.searchTruncated?'search_truncated':row.matches.length===1?'new_identity_review_proposal':row.matches.length?'ambiguous_tmdb_identity':'tmdb_identity_unconfirmed';
      if(row.status==='new_identity_review_proposal'){
        const m=row.matches[0];const prior=knownBindings.filter(b=>b.tmdbId===m.tmdbId&&b.seasonNumber===m.seasonNumber&&b.platform==='tving'&&b.date===claim.date&&b.identityVerified);
        if(prior.length===1){row.status='existing_review_identity_alternative_source';m.reviewCandidateId=prior[0].reviewCandidateId;}
        else if(prior.length>1)row.status='ambiguous_review_identity';
      }
      rows.push(row);
    }catch(e){errors.push({code:program.code,sourceUrl,error:ottSourceFailure(e).errorCode});}
  }
  return{kind:'tving-official-upcoming-review',referenceInputUsed:false,source:'https://www.tving.com/',rows,errors,totalPrograms:programs.length,
    newReviewProposals:rows.filter(r=>r.status==='new_identity_review_proposal').length,publishingAllowed:false};
}
export function upcomingLineup(report, observedAt) {
  if(report?.kind!=='tving-official-upcoming-review'||report.errors.length||report.rows.length!==report.totalPrograms)throw Error('INCOMPLETE_OFFICIAL_BATCH');
  return {platform:'tving',sourceUrl:report.source,observedAt,items:report.rows.map(row=>({
    title:row.title,market:'KR',contentKind:row.sourceWork?.category==='드라마'?'drama':row.sourceWork?.category==='예능'?'variety':'other',
    date:row.sourceClaims.length===1?row.sourceClaims[0].date:null,
    seasonNumber:row.sourceClaims.length===1?row.sourceClaims[0].seasonNumber:null,
    premiereConfirmed:false,
    evidence:`공식 TVING 공개예정 목록/프로그램 ${row.sourceUrl}. 명시 공개문구만 날짜로 저장, 방송일/내부메타데이터/시즌 개수는 추정에 쓰지 않음. 식별 검토 상태 ${row.status}; 독립 승인/제품 게시 아님.`
  }))};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
 try{
  const output=process.argv[2];if(!output)throw Error('OUTPUT_REQUIRED');
  const known=JSON.parse(await readFile('data/curated/ott-official-tmdb-bindings-2026-11-13.json','utf8')).items;
  const candidates=JSON.parse(await readFile('work/tmdb-release-candidates/latest.json','utf8')).rows;
  const report=await collectUpcoming(createTmdbClient(fetch,process.env.TMDB_API_READ_ACCESS_TOKEN),fetch,{knownBindings:known,monthlyCandidates:candidates});
  await writeFile(output,JSON.stringify(report,null,2)+'\n',{flag:'wx'});
  const errorCodes = [...new Set([
    ...report.errors.map(item => item.error),
    ...report.rows.map(item => item.supplementalIdentityError).filter(Boolean),
  ])];
  console.log(JSON.stringify({output,total:report.totalPrograms,newReviewProposals:report.newReviewProposals,
    errors:report.errors.length,errorCodes}));
  if(report.errors.length)process.exitCode=2;
 }catch(e){console.error(JSON.stringify(ottSourceFailure(e)));process.exitCode=1;}
}
