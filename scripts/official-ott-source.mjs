// Parse only scoped first-party fields. Never use a page timestamp or episode broadcast date as a release claim.
const normalized = (s) => String(s ?? '').normalize('NFKC').toLocaleLowerCase('ko').replace(/[\s\p{P}\p{S}]/gu, '');
const validDate = (value) => /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value)) && new Date(value).toISOString().slice(0,10) === value;
const decode = (s) => String(s).replace(/&#(x[0-9a-f]+|\d+);/gi, (_, n) => String.fromCodePoint(n[0].toLowerCase()==='x' ? parseInt(n.slice(1),16) : Number(n)))
  .replace(/&quot;/g,'"').replace(/&#39;|&apos;/g,"'").replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&amp;/g,'&').replace(/&nbsp;/g,' ');
const plain = (s) => decode(String(s).replace(/<script\b[^>]*>[\s\S]*?<\/script>|<style\b[^>]*>[\s\S]*?<\/style>/gi,'').replace(/<[^>]*>/g,' ')).replace(/\s+/g,' ').trim();
const nextData = (html) => {
  const m=/<script\b(?=[^>]*\bid=["']__NEXT_DATA__["'])[^>]*>([\s\S]*?)<\/script>/i.exec(html);
  if (!m) throw new Error('PRIMARY_PUBLIC_DATA_MISSING');
  return JSON.parse(m[1]);
};
const canonical = (url) => { const u=new URL(url);return u.origin+decodeURIComponent(u.pathname).replace(/\/$/,''); };
function metadata(html, key) {
  for (const m of html.matchAll(/<meta\b([^>]*)>/gi)) {
    const attrs=Object.fromEntries([...m[1].matchAll(/([\w:-]+)\s*=\s*(["'])([\s\S]*?)\2/g)].map((a)=>[a[1].toLowerCase(),decode(a[3])]));
    if (attrs.property===key || attrs.name===key) return attrs.content ?? '';
  }
  return '';
}
function compare(binding, claims, source) {
  const keys=[...new Set(claims.map((c)=>`${c.date}|${c.seasonNumber ?? ''}`))];
  const conflict=claims.some((c)=>c.date!==binding.date || c.seasonNumber!=null && binding.seasonNumber!=null && c.seasonNumber!==binding.seasonNumber);
  return {sourceRefreshStatus:!keys.length?'explicit_ott_date_not_found':conflict?'date_or_season_conflict':'matched',
    sourceRefreshError:null, sourceClaims:claims, sourceParser:source};
}
function scopedDateClaims(texts, title, publishedAt) {
  const year=Number(String(publishedAt ?? '').slice(0,4)), publicationMonth=Number(String(publishedAt ?? '').slice(5,7));
  const results=[];
  for (const text of texts) for (const sentence of String(text).split(/(?<=[。.!?])\s+|\n+/)) {
    if (!normalized(sentence).includes(normalized(title))) continue;
    const matches=[...sentence.matchAll(/(?:(20\d{2})년\s*)?(\d{1,2})월\s*(\d{1,2})일/g)];
    for (let i=0;i<matches.length;i++) {
      const m=matches[i], tail=sentence.slice(m.index+m[0].length, matches[i+1]?.index ?? m.index+m[0].length+120);
      if (!/공개|스트리밍|시청자.{0,15}만난/u.test(tail)) continue;
      const assetContext=sentence.slice(Math.max(0,m.index-36),m.index)+tail.split(/공개|스트리밍|시청자/u)[0];
      if(/예고편|포스터|스틸|클립|메이킹|티저/u.test(assetContext)) continue;
      if (!m[1] && (!Number.isInteger(year) || year<2000 || Number(m[2])<publicationMonth)) continue;
      const date=`${m[1] ?? year}-${m[2].padStart(2,'0')}-${m[3].padStart(2,'0')}`;
      if (!validDate(date)) continue;
      const season= /시즌\s*(\d+)/.exec(sentence);
      results.push({date,seasonNumber:season?Number(season[1]):null,yearContext:m[1]?'release_statement':'article_publication_year_only'});
    }
  }
  return [...new Map(results.map((r)=>[`${r.date}|${r.seasonNumber}`,r])).values()];
}
function divByClass(html, name) {
  const tokens=[...html.matchAll(/<\/?div\b[^>]*>/gi)];
  for(let i=0;i<tokens.length;i++) {
    const m=tokens[i], cls=/\bclass\s*=\s*(["'])(.*?)\1/i.exec(m[0]);
    if (!cls?.[2].split(/\s+/).includes(name)) continue;
    let depth=1;
    for(let j=i+1;j<tokens.length;j++) {
      depth += /^<\//.test(tokens[j][0])?-1:1;
      if(depth===0) return html.slice(m.index+m[0].length,tokens[j].index);
    }
  }
  return null;
}
export function supportsOfficialSource(binding) {
  try {
    const u=new URL(binding.sourceUrl);
    return u.protocol==='https:' && !u.port && !u.username && !u.password && (
      binding.platform==='tving' && (u.hostname==='www.tving.com' && /^\/contents\/P\d+$/.test(u.pathname) || u.hostname==='cjnews.cj.net') ||
      binding.platform==='netflix' && u.hostname==='about.netflix.com' && u.pathname.startsWith('/ko/news/') ||
      binding.platform==='disney_plus' && u.hostname==='www.disneyplus.com' && /^\/ko-kr\/browse\/entity-[a-z0-9-]+$/.test(u.pathname));
  } catch { return false; }
}
export function parseOfficialSource(binding, html) {
  if (typeof binding.title!=='string' || !binding.title.trim()) throw new Error('INVALID_PRIMARY_BINDING');
  const url=new URL(binding.sourceUrl);
  if(binding.platform==='tving' && url.hostname==='www.tving.com' && /^\/contents\/P\d+$/.test(url.pathname)) {
    const page=nextData(html).props?.pageProps, info=page?.contentInfo;
    const requested=url.pathname.split('/').at(-1);
    const ids=[page?.programCode,info?.program_code,info?.code?.startsWith('P')?info.code:null].filter(Boolean);
    if(!ids.length || ids.some((id)=>id!==requested)) throw new Error('TVING_IDENTITY_CHANGED');
    const claim=/^(?:시즌\s+(\d+),\s*)?(\d+)월\s*(\d+)일\s+공개$/.exec(page?.openText ?? info?.open_text ?? '');
    const year=info?.broad_dt?.slice(0,4);
    const claims=claim && /^\d{4}$/.test(year ?? '')?[{date:`${year}-${claim[2].padStart(2,'0')}-${claim[3].padStart(2,'0')}`,seasonNumber:claim[1]?Number(claim[1]):null,yearContext:'program_year_only'}]:[];
    return {...compare(binding,claims.filter((c)=>validDate(c.date)),'tving_program'),sourceIdentity:{programCode:requested,contentCode:info?.code},
      sourceWork:{title:page.programName ?? info.title,category:info.category_name,channel:info.channel,actors:Array.isArray(info.actor)?info.actor:[],programYear:info.product_year,explicitSeason:claims[0]?.seasonNumber ?? null}};
  }
  if(binding.platform==='disney_plus' && url.hostname==='www.disneyplus.com' && /^\/ko-kr\/browse\/entity-[a-z0-9-]+$/.test(url.pathname)) {
    const page=nextData(html).props?.pageProps;
    if(page?.language!=='ko' || String(page?.region).toLowerCase()!=='kr' || page.pathname!==url.pathname.replace(/^\/ko-kr/,'')) throw new Error('DISNEY_IDENTITY_OR_REGION_CHANGED');
    const content=page.stitchDocument?.mainContent ?? [];
    if(!content.some((c)=>normalized(c.title)===normalized(binding.title))) throw new Error('DISNEY_TITLE_CHANGED');
    const claims=content.flatMap((c)=>{
      const m=/^(20\d{2})년\s*(\d+)월\s*(\d+)일,\s*디즈니\+에서\s*시즌\s*(\d+)\s*공개$/.exec(c.promotion ?? '');
      return m?[{date:`${m[1]}-${m[2].padStart(2,'0')}-${m[3].padStart(2,'0')}`,seasonNumber:Number(m[4]),yearContext:'release_statement'}]:[];
    });
    return compare(binding,claims.filter((c)=>validDate(c.date)),'disney_kr_promotion');
  }
  if(binding.platform==='netflix' && url.hostname==='about.netflix.com' && url.pathname.startsWith('/ko/news/')) {
    const next=nextData(html), page=next.props?.pageProps, article=page?.article;
    if(next.props?.currentRegion?.countryCode!=='kr' || next.props?.currentLanguage?.code!=='ko' ||
      article?.slug!==url.pathname.split('/').at(-1) || !article.locations?.some((l)=>l.countryCode==='kr')) throw new Error('NETFLIX_ARTICLE_IDENTITY_OR_REGION_CHANGED');
    if(!normalized(article.title).includes(normalized(binding.title))) throw new Error('NETFLIX_ARTICLE_TITLE_CHANGED');
    const richText=(node)=>node?.nodeType==='text'?node.value:(node?.content ?? []).map(richText).join('');
    const paragraphs=(article.body?.content ?? []).map(richText);
    const claims=scopedDateClaims([article.title,...paragraphs],binding.title,article.createdAt);
    return compare(binding,claims,'netflix_kr_article');
  }
  if(binding.platform==='tving' && url.hostname==='cjnews.cj.net') {
    const title=metadata(html,'og:title'), pageURL=metadata(html,'og:url');
    if(!normalized(title).includes(normalized(binding.title)) || !pageURL || canonical(pageURL)!==canonical(binding.sourceUrl)) throw new Error('CJ_ARTICLE_IDENTITY_CHANGED');
    const nodes=[];
    const walk=(x)=>{if(Array.isArray(x))x.forEach(walk);else if(x&&typeof x==='object'){if(['Article','NewsArticle'].includes(x['@type']))nodes.push(x);for(const v of Object.values(x))if(v&&typeof v==='object')walk(v);}};
    for(const m of html.matchAll(/<script\b(?=[^>]*\btype=["']application\/ld\+json["'])[^>]*>([\s\S]*?)<\/script>/gi))walk(JSON.parse(m[1]));
    const article=nodes.find((a)=>a.url && canonical(a.url)===canonical(binding.sourceUrl));
    const body=divByClass(html,'entry-content-main');
    if(!article || !/^ko/i.test(article.inLanguage ?? '') || !body) throw new Error('CJ_ARTICLE_STRUCTURE_CHANGED');
    const paragraphs=[...body.matchAll(/<(?:p|li)\b[^>]*>([\s\S]*?)<\/(?:p|li)>/gi)].map((m)=>plain(m[1]));
    return compare(binding,scopedDateClaims(paragraphs,binding.title,article.datePublished),'cj_kr_article');
  }
  return {sourceRefreshStatus:'unsupported_primary_parser',sourceRefreshError:null,sourceClaims:[],sourceParser:null};
}
