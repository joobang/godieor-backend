import test from 'node:test';
import assert from 'node:assert/strict';
import { parseOfficialSource, supportsOfficialSource } from '../scripts/official-ott-source.mjs';
import { refreshOfficialBindings } from '../scripts/collect-tmdb-release-candidates.mjs';
const next = (value) => '<script id="__NEXT_DATA__" type="application/json">'+JSON.stringify(value)+'</script>';
const binding = { title:'가상 작품', date:'2026-11-20', seasonNumber:3 };
const tving = {...binding,platform:'tving',sourceUrl:'https://www.tving.com/contents/P100'};
const tvingPage = (patch={}) => next({props:{pageProps:{programCode:'P100',openText:'시즌 3, 11월 20일 공개',
  contentInfo:{code:'E200',program_code:'P100',broad_dt:'20261120',episode_broad_dt:'20261101'},...patch}}});
const netflix = {...binding,platform:'netflix',sourceUrl:'https://about.netflix.com/ko/news/synthetic'};
function article(text='넷플릭스 <가상 작품>이 11월 20일 오직 넷플릭스에서 공개된다.', patch={}) {
  return next({props:{currentRegion:{countryCode:'kr'},currentLanguage:{code:'ko'},pageProps:{article:{
    slug:'synthetic',title:'넷플릭스 <가상 작품> 공개 안내',createdAt:'2026-11-01T00:00:00Z',locations:[{countryCode:'kr'}],
    body:{content:[{nodeType:'paragraph',content:[{nodeType:'text',value:text}]}]},...patch}}}});
}
const disney={...binding,platform:'disney_plus',sourceUrl:'https://www.disneyplus.com/ko-kr/browse/entity-synthetic'};
const disneyPage=(patch={})=>next({props:{pageProps:{language:'ko',region:'kr',pathname:'/browse/entity-synthetic',
  stitchDocument:{mainContent:[{promotion:'2026년 11월 20일, 디즈니+에서 시즌 3 공개'},{title:'가상 작품',description:'시즌 2개'}]},...patch}}});
const cj={...binding,platform:'tving',sourceUrl:'https://cjnews.cj.net/synthetic/'};
const cjPage = (body='<li>티빙 오리지널 &lt;가상 작품&gt; 11월 20일 공개</li>') =>
  '<meta property="og:title" content="티빙 오리지널 &lt;가상 작품&gt;"><meta property="og:url" content="https://cjnews.cj.net/synthetic/">'+
  '<script type="application/ld+json">'+JSON.stringify({'@graph':[{'@type':'Article',url:cj.sourceUrl,inLanguage:'ko-KR',datePublished:'2026-11-01T00:00:00Z'}]})+'</script>'+
  '<div class="entry-content-main"><div>'+body+'</div><p>기타 설명</p></div><p>다른 작품 12월 3일 공개</p>';

test('TVING episode code is accepted only through consistent explicit program IDs',()=>{
  const r=parseOfficialSource(tving,tvingPage());assert.equal(r.sourceRefreshStatus,'matched');
  assert.equal(r.sourceIdentity.contentCode,'E200');assert.equal(r.sourceClaims[0].date,'2026-11-20');
  assert.throws(()=>parseOfficialSource(tving,tvingPage({programCode:'P999'})),/IDENTITY/);
  assert.throws(()=>parseOfficialSource(tving,tvingPage({programCode:null,contentInfo:{code:'E200',program_code:null}})),/IDENTITY/);
});
test('TVING broadcast date and episode date cannot replace absent release statement',()=>{
  assert.equal(parseOfficialSource(tving,tvingPage({openText:null})).sourceRefreshStatus,'explicit_ott_date_not_found');
});
test('Netflix reads release statement, not article publication timestamp',()=>{
  const r=parseOfficialSource(netflix,article());assert.equal(r.sourceRefreshStatus,'matched');assert.equal(r.sourceClaims[0].date,'2026-11-20');
  assert.equal(parseOfficialSource({...netflix,date:'2026-11-01'},article()).sourceRefreshStatus,'date_or_season_conflict');
});
test('Netflix slug and Korean market are required',()=>{
  assert.throws(()=>parseOfficialSource(netflix,article(undefined,{slug:'other'})),/IDENTITY_OR_REGION/);
  assert.throws(()=>parseOfficialSource(netflix,article(undefined,{locations:[{countryCode:'us'}]})),/IDENTITY_OR_REGION/);
});
test('other works and unrelated historical dates do not validate an announcement',()=>{
  assert.equal(parseOfficialSource(netflix,article('가상 작품의 예고편입니다. 다른 작품은 11월 20일 공개된다.')).sourceRefreshStatus,'explicit_ott_date_not_found');
});
test('multiple changed dates fail closed rather than accepting any matching old date',()=>{
  const text='가상 작품은 11월 20일 공개 예정이었다. 가상 작품은 11월 25일 공개로 변경됐다.';
  assert.equal(parseOfficialSource(netflix,article(text)).sourceRefreshStatus,'date_or_season_conflict');
});
test('cross-year announcement requires explicit release year',()=>{
  const patch={createdAt:'2026-12-01T00:00:00Z'};
  const b={...netflix,date:'2027-01-20'};
  assert.equal(parseOfficialSource(b,article('가상 작품 1월 20일 공개',patch)).sourceRefreshStatus,'explicit_ott_date_not_found');
  assert.equal(parseOfficialSource(b,article('가상 작품 2027년 1월 20일 공개',patch)).sourceRefreshStatus,'matched');
});
test('Disney KR entity uses release promotion, not displayed season count',()=>{
  const r=parseOfficialSource(disney,disneyPage());assert.equal(r.sourceRefreshStatus,'matched');assert.equal(r.sourceClaims[0].seasonNumber,3);
  assert.equal(parseOfficialSource({...disney,seasonNumber:2},disneyPage()).sourceRefreshStatus,'date_or_season_conflict');
});
test('Disney other entity or region is rejected',()=>{
  assert.throws(()=>parseOfficialSource(disney,disneyPage({region:'us'})),/IDENTITY_OR_REGION/);
  assert.throws(()=>parseOfficialSource(disney,disneyPage({pathname:'/browse/entity-other'})),/IDENTITY_OR_REGION/);
});
test('CJ scopes article URL, title and nested body release statement',()=>{
  assert.equal(parseOfficialSource(cj,cjPage()).sourceRefreshStatus,'matched');
  assert.equal(parseOfficialSource(cj,cjPage('<p>가상 작품 포스터입니다.</p>')).sourceRefreshStatus,'explicit_ott_date_not_found');
  assert.throws(()=>parseOfficialSource({...cj,sourceUrl:'https://cjnews.cj.net/other/'},cjPage()),/IDENTITY/);
});
test('unsupported sources are not fetched and redirect host changes are rejected',async()=>{
  const b={...binding,platform:'coupang_play',sourceUrl:'https://news.coupang.com/archives/1/'};
  assert.equal(supportsOfficialSource(b),false);
  let count=0;const r=await refreshOfficialBindings([b],async()=>{count++;throw new Error('should not fetch');});
  assert.equal(count,0);assert.equal(r[0].sourceRefreshStatus,'unsupported_primary_parser');
  const redirect=await refreshOfficialBindings([tving],async()=>({ok:true,url:'https://evil.invalid/contents/P100',text:async()=>tvingPage()}));
  assert.equal(redirect[0].sourceRefreshStatus,'lookup_failed');assert.equal(redirect[0].sourceRefreshError,'PRIMARY_REDIRECT_HOST_CHANGED');
});


test('marketing asset release date is not the work premiere',()=>{
  for (const text of ['가상 작품 포스터 11월 20일 공개','가상 작품 11월 20일 예고편 공개'])
    assert.equal(parseOfficialSource(netflix,article(text)).sourceRefreshStatus,'explicit_ott_date_not_found');
  assert.equal(parseOfficialSource(netflix,article('가상 작품은 11월 20일 공개를 앞두고 예고편을 공개했다.')).sourceRefreshStatus,'matched');
});
test('TVING plain release statement is accepted, month-only and metadata day stay unknown',()=>{
  const exact=parseOfficialSource({...tving,seasonNumber:null},tvingPage({openText:'11월 20일 공개'}));
  assert.equal(exact.sourceRefreshStatus,'matched');assert.equal(exact.sourceClaims[0].seasonNumber,null);
  assert.equal(parseOfficialSource(tving,tvingPage({openText:'11월 공개'})).sourceRefreshStatus,'explicit_ott_date_not_found');
});
