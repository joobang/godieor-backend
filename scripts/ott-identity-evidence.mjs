// Supplement identities only; broadcaster dates are never OTT release evidence.
export const normalizeName = s => String(s ?? '').normalize('NFKC').toLowerCase().replace(/[\s\p{P}\p{S}]/gu, '');
const next = html => {
 const match=/<script\b(?=[^>]*\bid=["']__NEXT_DATA__["'])[^>]*>([\s\S]*?)<\/script>/i.exec(html);
 if(!match)throw Error('TVN_PUBLIC_DATA_MISSING');
 return JSON.parse(match[1]).props?.pageProps;
};
export function tvnProgramLinks(html, title) {
 const found=new Set();
 for(const m of html.matchAll(/<a\b[^>]*\bhref=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)){
  const label=m[2].replace(/<[^>]+>/g,' ').replace(/^\s*\[[^\]]+\]\s*/,'').trim();
  if(normalizeName(label)!==normalizeName(title))continue;
  const u=new URL(m[1],'https://tvn.cjenm.com');
  if(u.origin==='https://tvn.cjenm.com'&&/^\/ko\/[a-z0-9-]+\/$/.test(u.pathname)&&!u.search&&!u.hash)found.add(u.href);
 }
 return [...found];
}
export function parseTvnCast(html, sourceUrl, title) {
 const url=new URL(sourceUrl), page=next(html);
 if(url.origin!=='https://tvn.cjenm.com'||!/^\/ko\/[a-z0-9-]+\/$/.test(url.pathname)||url.search||url.hash||
 page?.hostDomain!==url.origin||page.isoCd!=='ko'||page.preview!==false||page.thisUri!==url.pathname.split('/')[2])throw Error('TVN_PROGRAM_IDENTITY_CHANGED');
 const records=Object.values(page.fallback??{}).filter(m=>normalizeName(m?.data?.pgmNm)===normalizeName(title));
 const ids=[...new Set(records.map(m=>m.data.pgmSeq).filter(Number.isInteger))];
 if(ids.length!==1)throw Error('TVN_PROGRAM_TITLE_OR_ID_CHANGED');
 const names=records.flatMap(m=>(m.data.simplePrsnInfoList??[]).flatMap(p=>String(p.prsnNm??'').split(/(?<=[가-힣])\s*[X×]\s*(?=[가-힣])/u))).map(n=>n.trim()).filter(Boolean);
 const actors=[...new Map(names.map(n=>[normalizeName(n),n])).values()];
 if(actors.length<2)throw Error('TVN_CAST_DATA_MISSING');
 return {sourceUrl,programId:ids[0],title,actors,evidenceRole:'identity_only',releaseDate:null};
}
// A source name and a TMDB person can each be used at most once.
export async function matchCast(sourceActors, cast, request) {
 const sources=[...new Map(sourceActors.filter(n=>typeof n==='string'&&n.trim()).map(n=>[normalizeName(n),n])).entries()];
 const people=[...new Map(cast.filter(p=>Number.isInteger(p.id)&&p.id>0).map(p=>[p.id,p])).values()];
 const edges=new Map(),aliasLookups=[],lookupErrors=[];
 for(const p of people){
  const names=new Set([p.name,p.original_name].filter(Boolean).map(normalizeName));
  edges.set(p.id,{person:p,names});
 }
 // Bound auxiliary network work; a truncated result cannot create a proposal.
 let truncated=false;
 if(sources.length>=2){
  const directMatched=sources.filter(([name])=>[...edges.values()].some(p=>p.names.has(name))).length;
  if(directMatched<2){
   const unresolved=people.filter(p=>!sources.some(([s])=>edges.get(p.id).names.has(s)));
   truncated=unresolved.length>30;
   for(const p of unresolved.slice(0,30)){
    try{
     const detail=await request(`/person/${p.id}`,{language:'ko-KR'});
     if(detail.id!==p.id)throw Error('TMDB_PERSON_ID_MISMATCH');
     const aliases=[detail.name,...(detail.also_known_as??[])].filter(n=>typeof n==='string');
     for(const n of aliases)edges.get(p.id).names.add(normalizeName(n));
     aliasLookups.push({tmdbPersonId:p.id,aliases});
    }catch(e){lookupErrors.push({tmdbPersonId:p.id,error:e.message});}
   }
  }
 }
 const assigned=new Map();
 function assign(source,seen){
  for(const [id,p] of edges){
   if(seen.has(id)||!p.names.has(source))continue;
   seen.add(id);
   if(!assigned.has(id)||assign(assigned.get(id),seen)){assigned.set(id,source);return true;}
  }
  return false;
 }
 for(const [source] of sources)assign(source,new Set());
 const labels=new Map(sources);
 const matchedPeople=[...assigned].map(([tmdbPersonId,s])=>({tmdbPersonId,sourceNames:[labels.get(s)]}));
 return {matchedPeople,matchedActors:matchedPeople.flatMap(p=>p.sourceNames),aliasLookups,lookupErrors,truncated,
  complete:!truncated&&!lookupErrors.length};
}
