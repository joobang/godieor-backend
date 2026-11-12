#!/usr/bin/env node
// Investigate third-party new releases against TMDB original IDs. Never publish.
import {readFile, writeFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import {resolve} from 'node:path';
import {createTmdbClient, SERVICES, candidateDates} from './tmdb-date-discovery.mjs';

const PROVIDER_BUCKETS = ['flatrate','ads','free','rent','buy'];
export async function inspectMissingCandidates(candidates, request) {
  const rows=[];
  for (const row of candidates) {
    const match=/^tmdb-(tv|movie)-(\d+)$/.exec(row.contentId??'');
    if (!match) {rows.push({...row,status:'invalid_tmdb_id',errors:['invalid_tmdb_id']});continue;}
    const [,kind,id]=match; const errors=[]; let detail=null, provider=null, season=null;
    try {detail=await request(`/${kind}/${id}`,{language:'ko-KR'});} catch (e) {errors.push(`detail:${e.message}`);}
    try {provider=await request(`/${kind}/${id}/watch/providers`);} catch (e) {errors.push(`providers:${e.message}`);}
    if(kind==='tv' && Number.isInteger(row.seasonNumber) && row.seasonNumber>0) {
      try {season=await request(`/tv/${id}/season/${row.seasonNumber}`,{language:'ko-KR'});} catch (e) {errors.push(`season:${e.message}`);}
    }
    const available=PROVIDER_BUCKETS.flatMap((bucket)=>provider?.results?.KR?.[bucket]??[]);
    const providerNames=[...new Set(available.map(x=>x.provider_name))];
    const providerPattern=SERVICES.find(x=>x.key===row.platform)?.pattern;
    const dates=kind==='tv' ? candidateDates(detail??{},season) : {movieReleaseDate:detail?.release_date??null};
    const premiereHint=kind==='tv' ? [dates.seasonFirstDate,dates.firstEpisodeDate] : [dates.movieReleaseDate];
    const dateMatched=premiereHint.includes(row.date);
    const episodeOnly=kind==='tv' && !dateMatched && dates.episodeDates?.includes(row.date);
    const providerMatched=Boolean(providerPattern && available.some(x=>providerPattern.test(x.provider_name)));
    const originCountries=kind==='tv' ? (detail?.origin_country??[]) : (detail?.production_countries??[]).map(x=>x.iso_3166_1);
    const broadcastNetworks=kind==='tv' ? (detail?.networks??[]).map(x=>x.name).filter(Boolean) : [];
    const koreanOrigin=originCountries.includes('KR');
    const otherKoreanProviders=providerNames.filter(name=>!providerPattern?.test(name));
    const status=!detail ? 'detail_lookup_failed' : kind==='tv' && !season ? 'season_unavailable'
      : dateMatched && providerMatched ? 'date_and_kr_provider_hint'
      : dateMatched && koreanOrigin ? 'korean_origin_provider_unlisted'
      : dateMatched ? 'date_hint_only'
      : episodeOnly ? 'episode_only_hint' : 'date_mismatch';
    rows.push({...row,kind,tmdbId:Number(id),tmdbTitle:detail?.name??detail?.title??null,
      dates,krProviderNames:providerNames,krProviderMatched:providerMatched,dateMatched,
      originCountries,broadcastNetworks,koreanOrigin,otherKoreanProviders,
      episodeOnly,status,errors,officialKoreanPremiereConfirmed:false,publishingAllowed:false});
  }
  return {authority:'third_party_discovery_only',source:'StreamPick TMDB IDs + TMDB API',
    checkedAt:new Date().toISOString(),total:rows.length,
    summary:Object.fromEntries([...new Set(rows.map(r=>r.status))].map(status=>[status,rows.filter(r=>r.status===status).length])),
    publishingAllowed:false,rows};
}
if (process.argv[1] && import.meta.url===pathToFileURL(resolve(process.argv[1])).href) {
 try {
  const input=JSON.parse(await readFile(process.argv[2]??'/private/tmp/streampick-count-audit.json','utf8'));
  const request=createTmdbClient(fetch,process.env.TMDB_API_READ_ACCESS_TOKEN);
  const report=await inspectMissingCandidates(input.missingNewReleaseCandidates,request);
  const output=process.argv[3]??'/private/tmp/streampick-tmdb-11-audit.json';
  await writeFile(output,JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify({total:report.total,summary:report.summary,rows:report.rows.map(({title,date,status,krProviderMatched,dateMatched,errors})=>({title,date,status,krProviderMatched,dateMatched,errors}))},null,2));
 } catch(error) { console.error(`STREAMPICK_TMDB_AUDIT_FAILED:${error.message}`);process.exitCode=1; }
}
