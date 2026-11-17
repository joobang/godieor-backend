// Synthetic process/report cases, not source-completeness assertions.
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { EventEmitter } from 'node:events';
import { PassThrough } from 'node:stream';
import { spawn } from 'node:child_process';
import { runProviderDaily, runProvider, decodeProviderReport } from '../scripts/run-provider-daily.mjs';
import { acquireLock } from '../scripts/run-official-ott-daily.mjs';
import { providerLaunchdPlist } from '../scripts/install-provider-launchd.mjs';
const categories={kobis:'movie',football_data_pl:'epl',igdb:'game'};
function report(p,status='succeeded'){return {job:'provider_collection',mode:'daily',providers:[p],results:Array.from({length:p==='igdb'?7:1},()=>({provider:p,category:categories[p],status,...(status==='succeeded'?{published:12}:{})}))};}
function mock(handler=()=>({})){return (node,args,options)=>{const p=args[args.indexOf('--providers')+1],r=handler(p,args,options);const c=new EventEmitter();c.stdout=new PassThrough();c.stderr=new PassThrough();c.kill=()=>{c.emit('close',null,'SIGKILL');return true;};process.nextTick(()=>{c.stdout.end(r.raw??JSON.stringify(report(p,r.status)));c.stderr.end('synthetic-private-diagnostic');c.emit('close',r.code??0,null);});return c;};}
async function setup(fn){const dir=await mkdtemp(join(tmpdir(),'godieor-provider-runner-'));const opts={reportPath:join(dir,'last.json'),successPath:join(dir,'success.json'),lock:()=>acquireLock(join(dir,'lock'))};try{await fn(opts,dir);}finally{await rm(dir,{recursive:true,force:true});}}
test('daily runner executes all three isolated providers and records nine collection scopes',()=>setup(async opts=>{
 const calls=[];const result=await runProviderDaily({...opts,force:true,execute:mock((p,args,options)=>{calls.push(p);assert.ok(args.includes('--force'));assert.equal(options.env.COLLECTION_INCLUDE_FIXTURE,'false');assert.equal(options.env.COLLECTION_SCHEDULE_ENABLED,'false');return {};})});
 assert.deepEqual(calls,['kobis','football_data_pl','igdb']);assert.equal(result.status,'completed');assert.equal(result.collectedScopes,9);assert.equal(result.skippedScopes,0);assert.equal(JSON.parse(await readFile(opts.successPath)).finishedAt,result.finishedAt);
}));
test('one provider failure does not suppress others or replace the last successful report',()=>setup(async opts=>{
 await runProviderDaily({...opts,execute:mock()});const previous=await readFile(opts.successPath,'utf8'),calls=[];
 const result=await runProviderDaily({...opts,execute:mock(p=>{calls.push(p);return p==='football_data_pl'?{status:'failed',code:1}:{};})});
 assert.deepEqual(calls,['kobis','football_data_pl','igdb']);assert.equal(result.status,'partial');assert.equal(result.exitCode,2);assert.equal(await readFile(opts.successPath,'utf8'),previous);
 assert.doesNotMatch(await readFile(opts.reportPath,'utf8'),/synthetic-private-diagnostic/);assert.ok(result.previousSuccessfulRunAt);
}));
test('same-day skips are reported separately from performed collection',()=>setup(async opts=>{
 const result=await runProviderDaily({...opts,execute:mock(()=>({status:'already_collected_today'}))});assert.equal(result.collectedScopes,0);assert.equal(result.skippedScopes,9);assert.equal(result.status,'completed');
}));
test('malformed output and impossible provider results cannot become success',async()=>{
 for(const value of [{...report('kobis'),providers:['igdb']},{...report('igdb'),results:[]},{...report('kobis'),results:[{provider:'kobis',category:'movie',status:'succeeded',published:-1}]},{...report('kobis'),mode:'backfill'}])assert.throws(()=>decodeProviderReport(value,'kobis'));
 const good=report('kobis');good.secret='private';good.results[0].secret='private';assert.doesNotMatch(JSON.stringify(decodeProviderReport(good,'kobis')),/private/);
 await setup(async opts=>{const result=await runProviderDaily({...opts,execute:mock(p=>p==='kobis'?{raw:'not-json'}:{})});assert.equal(result.status,'partial');assert.equal(result.providers[0].error,'INVALID_PROVIDER_REPORT');});
});
test('output limit bounds a misbehaving subprocess and still releases resources',async()=>{
 const result=await runProvider('kobis',{execute:mock(()=>({raw:'x'.repeat(70000)}))});assert.equal(result.status,'failed');assert.equal(result.error,'PROVIDER_OUTPUT_LIMIT');
});
test('live run lock refuses overlap and a provably dead owner can recover',()=>setup(async(opts,dir)=>{
 const release=await opts.lock();await assert.rejects(runProviderDaily({...opts,execute:mock()}),/ALREADY_RUNNING/);await release();
 const dead=2147483646;assert.throws(()=>process.kill(dead,0),{code:'ESRCH'});await mkdir(join(dir,'lock'));await writeFile(join(dir,'lock/owner.json'),JSON.stringify({pid:dead}));
 assert.equal((await runProviderDaily({...opts,execute:mock()})).exitCode,0);
}));
test('timeout kills collecting descendants, continues other providers, and unlocks', {skip:process.platform==='win32'},()=>setup(async(opts,dir)=>{
 const marker=join(dir,'descendant');let pid;
 const code=`const{spawn}=require('node:child_process'),{writeFileSync}=require('node:fs');const c=spawn(process.execPath,['-e','setInterval(()=>{},1000)'],{stdio:'inherit'});writeFileSync(process.argv[1],String(c.pid));setInterval(()=>{},1000);`;
 const fallback=mock();try{
 const result=await runProviderDaily({...opts,timeoutMs:1000,execute:(node,args,options)=>args.includes('kobis')?spawn(node,['-e',code,marker],options):fallback(node,args,options)});
 pid=Number(await readFile(marker,'utf8'));assert.equal(result.providers[0].error,'PROVIDER_TIMEOUT');assert.equal(result.providers[2].status,'completed');
 await new Promise(r=>setTimeout(r,100));assert.throws(()=>process.kill(pid,0),{code:'ESRCH'});await (await opts.lock())();
 }finally{if(pid){try{process.kill(pid,'SIGKILL');}catch{}}}
}));
test('shutdown terminates current child without starting remaining providers',()=>setup(async opts=>{
 const controller=new AbortController(),calls=[];const execute=(node,args)=>{calls.push(args);const c=new EventEmitter();c.stdout=new PassThrough();c.stderr=new PassThrough();c.kill=()=>{process.nextTick(()=>c.emit('close',null,'SIGKILL'));return true;};setTimeout(()=>controller.abort(),20);return c;};
 const result=await runProviderDaily({...opts,execute,signal:controller.signal});assert.equal(result.status,'interrupted');assert.equal(calls.length,1);assert.equal(result.providers[2].status,'not_run');
}));
test('corrupt previous success metadata recovers without copying arbitrary fields',()=>setup(async opts=>{
 await writeFile(opts.successPath,'broken private data');const result=await runProviderDaily({...opts,execute:mock()});assert.equal(result.previousSuccessUnreadable,true);assert.equal(result.previousSuccessfulRunAt,null);assert.equal(result.status,'completed');assert.doesNotMatch(await readFile(opts.reportPath,'utf8'),/private data/);
}));
test('launchd configuration has KST08:30 job with no secrets, shell, or forced repeated collection',()=>{
 const xml=providerLaunchdPlist({node:'/opt/node',root:'/tmp/example & root'});assert.match(xml,/<integer>8<\/integer>/);assert.match(xml,/<integer>30<\/integer>/);assert.match(xml,/run-provider-daily\.mjs/);assert.match(xml,/example &amp; root/);assert.doesNotMatch(xml,/--force|DATABASE_URL|API_KEY|\/bin\/sh/);
 for(const opts of [{hour:24},{minute:60},{node:'relative'},{root:'/tmp/x\ninvalid'}])assert.throws(()=>providerLaunchdPlist(opts));
});
test('provider advisory-lock conflict remains explicit instead of a successful skip',()=>setup(async opts=>{
 const conflict={job:'provider_collection',mode:'daily',providers:['igdb'],results:[{provider:'igdb',category:'all',status:'already_running'}]};
 const result=await runProviderDaily({...opts,execute:mock(p=>p==='igdb'?{raw:JSON.stringify(conflict),code:1}:{})});assert.equal(result.status,'partial');assert.equal(result.providers[2].error,'PROVIDER_ALREADY_RUNNING');
}));
test('failed atomic report write preserves prior success and releases the live-run lock',()=>setup(async(opts,dir)=>{
 await runProviderDaily({...opts,execute:mock()});const previous=await readFile(opts.successPath,'utf8');await writeFile(join(dir,'blocker'),'file');
 await assert.rejects(runProviderDaily({...opts,reportPath:join(dir,'blocker/last.json'),execute:mock()}));assert.equal(await readFile(opts.successPath,'utf8'),previous);await(await opts.lock())();
}));
test('a fresh working directory is created before acquiring the daily lock',()=>setup(async(opts,dir)=>{
 const lockDirectory=join(dir,'fresh-work/provider.lock');const result=await runProviderDaily({...opts,lock:undefined,lockDirectory,execute:mock()});assert.equal(result.status,'completed');await assert.rejects(readFile(join(lockDirectory,'owner.json')),{code:'ENOENT'});
}));
