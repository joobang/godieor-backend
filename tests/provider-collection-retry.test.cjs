require('reflect-metadata');
const test=require('node:test'),assert=require('node:assert/strict');
const {CollectionService}=require('../dist/src/collection/collection.service');
test('failure after earlier same-day success is retried normally, then healthy scope skips',async()=>{
 const state={id:'synthetic-scope',last_successful_at:new Date(),last_attempt_status:'failed'};let fetched=0,begun=0;
 const repository={withCollectorLock:async(key,fn)=>fn(),findScope:async()=>state,beginRun:async()=>{begun++;return'synthetic-run';},publishScope:async()=>{state.last_attempt_status='succeeded';},failRun:async()=>{throw Error('unexpected failure');}};
 const adapter={key:'synthetic',scopes:[{category:'movie',market:'KR'}],fetch:async()=>{fetched++;return[];}};
 const service=new CollectionService(repository,[adapter]);
 assert.equal((await service.collect('daily'))[0].status,'succeeded');assert.equal(fetched,1);assert.equal(begun,1);
 assert.equal((await service.collect('daily'))[0].status,'already_collected_today');assert.equal(fetched,1);
});
