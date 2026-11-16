import test from 'node:test';
import assert from 'node:assert/strict';
import {matchCast,tvnProgramLinks,parseTvnCast} from '../scripts/ott-identity-evidence.mjs';
const html=p=>'<script id="__NEXT_DATA__" type="application/json">'+JSON.stringify({props:{pageProps:p}})+'</script>';
const page={hostDomain:'https://tvn.cjenm.com',isoCd:'ko',preview:false,thisUri:'synthetic',fallback:{empty:null,one:{data:{pgmNm:'가상 신작',pgmSeq:7,simplePrsnInfoList:[{prsnNm:'배우 가X배우 나'}]}},two:{data:{pgmNm:'다른 작품',pgmSeq:8,simplePrsnInfoList:[{prsnNm:'오염 배우'}]}}}};
test('official program links require exact title and same-host program root',()=>{
 const s='<a href="/ko/synthetic/"><span>[예정] 가상 신작</span></a><a href="https://evil.example/ko/other/">가상 신작</a><a href="/ko/synthetic/video/">가상 신작</a>';
 assert.deepEqual(tvnProgramLinks(s,'가상 신작'),['https://tvn.cjenm.com/ko/synthetic/']);
});
test('broadcaster cast belongs to exact program and contributes no release date',()=>{
 const r=parseTvnCast(html(page),'https://tvn.cjenm.com/ko/synthetic/','가상 신작');
 assert.deepEqual(r.actors,['배우 가','배우 나']);assert.equal(r.releaseDate,null);assert.equal(r.evidenceRole,'identity_only');
 assert.throws(()=>parseTvnCast(html(page),'https://tvn.cjenm.com/ko/wrong/','가상 신작'),/IDENTITY_CHANGED/);
 assert.throws(()=>parseTvnCast(html(page),'https://tvn.cjenm.com/ko/synthetic/','없는 작품'),/TITLE_OR_ID/);
});
test('conflicting program IDs, preview and foreign locale are rejected',()=>{
 for(const patch of [{preview:true},{isoCd:'en'},{fallback:{...page.fallback,other:{data:{pgmNm:'가상 신작',pgmSeq:9}}}}])
  assert.throws(()=>parseTvnCast(html({...page,...patch}),'https://tvn.cjenm.com/ko/synthetic/','가상 신작'));
});
test('explicit person aliases resolve translations while keeping stable IDs',async()=>{
 const r=await matchCast(['가 배우','나 배우'],[{id:1,name:'A'},{id:2,name:'B'}],async path=>({id:Number(path.split('/').at(-1)),also_known_as:[path.endsWith('/1')?'가 배우':'나 배우']}));
 assert.equal(r.matchedPeople.length,2);assert.equal(r.aliasLookups.length,2);assert.equal(r.complete,true);
});
test('one source person cannot match two TMDB people through a shared alias',async()=>{
 const r=await matchCast(['공통 배우','미확인 배우'],[{id:1,name:'공통 배우'},{id:2,name:'공통 배우'}],async path=>({id:Number(path.split('/').at(-1)),also_known_as:[]}));
 assert.equal(r.matchedPeople.length,1);
});
test('two aliases for one TMDB person cannot count twice',async()=>{
 const r=await matchCast(['별칭 가','별칭 나'],[{id:1,name:'별칭 가',original_name:'별칭 나'}],async()=>{throw Error('unexpected');});
 assert.equal(r.matchedPeople.length,1);
});
test('group names are not inferred as members and wrong person IDs are incomplete',async()=>{
 const cast=[{id:1,name:'개인 가'},{id:2,name:'개인 나'}];
 const r=await matchCast(['그룹','별칭'],cast,async path=>({id:Number(path.split('/').at(-1)),also_known_as:[]}));
 assert.equal(r.matchedPeople.length,0);
 const bad=await matchCast(['가','나'],cast,async()=>({id:999,also_known_as:['가','나']}));
 assert.equal(bad.complete,false);assert.equal(bad.lookupErrors.length,2);
});
test('bounded alias requests expose truncation instead of proposing a unique identity',async()=>{
 let n=0;const r=await matchCast(['가','나'],Array.from({length:31},(_,i)=>({id:i+1,name:'other'+i})),async path=>{n++;return{id:Number(path.split('/').at(-1)),also_known_as:[]};});
 assert.equal(n,30);assert.equal(r.truncated,true);assert.equal(r.complete,false);
});

test('Latin X inside a name is not treated as a cast-pair separator',()=>{
 const p=structuredClone(page);p.fallback.one.data.simplePrsnInfoList=[{prsnNm:'Xavier'},{prsnNm:'Max Carter'}];
 assert.deepEqual(parseTvnCast(html(p),'https://tvn.cjenm.com/ko/synthetic/','가상 신작').actors,['Xavier','Max Carter']);
});
