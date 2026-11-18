// Synthetic disposable DB regression: never reads .env or connects to the product DB.
require('reflect-metadata');
const { execFileSync } = require('node:child_process');
const { randomBytes } = require('node:crypto');
const assert = require('node:assert/strict');
const { resolve } = require('node:path');
const { PrismaService } = require('../dist/src/database/prisma.service');
const { CollectionRepository } = require('../dist/src/collection/collection.repository');
const { collectionDiagnostic } = require('../dist/src/common/collection-diagnostic');
const image = 'postgres:16-alpine@sha256:aa6cb33cf4c19c765cefcf48d96176258800870a9a1e930ad126200f9d825139';
const name = 'godieor-data86-' + randomBytes(5).toString('hex');
const password = randomBytes(24).toString('hex');
const docker = args => execFileSync('docker', args, {encoding:'utf8',stdio:'pipe',env:{...process.env,POSTGRES_PASSWORD:password}}).trim();
async function main() {
  let created = false, db;
  try {
    docker(['run','--pull=never','--rm','-d','--name',name,'-e','POSTGRES_USER=synthetic',
      '-e','POSTGRES_DB=synthetic','-e','POSTGRES_PASSWORD','-p','127.0.0.1::5432','--tmpfs','/var/lib/postgresql/data',image]);
    created = true;
    let ready = false;
    for (let i=0;i<80;i++) {
      try { docker(['exec',name,'pg_isready','-U','synthetic','-d','synthetic']); ready=true; break; } catch {}
      await new Promise(r=>setTimeout(r,250));
    }
    assert.ok(ready);
    const port = /:(\d+)$/.exec(docker(['port',name,'5432/tcp']))[1];
    const databaseUrl = `postgresql://synthetic:${password}@127.0.0.1:${port}/synthetic`;
    execFileSync(process.execPath,[resolve('node_modules/prisma/build/index.js'),'migrate','deploy'],
      {stdio:'pipe',env:{...process.env,DATABASE_URL:databaseUrl}});
    db = new PrismaService({databaseUrl});
    await db.$connect();
    // The previous implicit five-second limit rejects the same controlled delay.
    await assert.rejects(db.$transaction(async tx => {
      await tx.$executeRawUnsafe('SELECT pg_sleep(5.3)');
      await tx.provider.count();
    }), error => error.code === 'P2028');
    console.log('PASS baseline implicit 5s timeout reproduced');
    const slow = new CollectionRepository({$transaction: (operation, options) => db.$transaction(async tx => {
      await tx.$executeRawUnsafe('SELECT pg_sleep(5.3)');
      return operation(tx);
    }, options)});
    const adapter={key:'synthetic_data86',name:'Synthetic DATA86',origin:'provider',scopes:[{category:'movie',market:'KR'}]};
    await slow.register([adapter]);
    const scope=await db.collection_scope.findFirstOrThrow({where:{provider_key:adapter.key}});
    let run=await slow.beginRun(scope.id,'backfill');
    await slow.publishScope(adapter,scope.id,[],run);
    assert.equal((await db.collection_run.findUniqueOrThrow({where:{id:run}})).status,'succeeded');
    run=await slow.beginRun(scope.id,'backfill');
    await slow.failRun(scope.id,run,'COLLECTION_FAILED');
    assert.equal((await db.collection_run.findUniqueOrThrow({where:{id:run}})).status,'failed');
    console.log('PASS all four repository transaction paths exceed 5s and commit');
    // Complete writes inside the callback then exceed the configured limit: all must roll back.
    process.env.COLLECTION_CONTROL_TIMEOUT_MS='10000';
    const expires = new CollectionRepository({$transaction:(operation,options)=>db.$transaction(async tx=>{
      await operation(tx);
      await tx.$executeRawUnsafe('SELECT pg_sleep(10.3)');
      await tx.provider.count();
    },options)});
    const revision=(await db.catalog_state.findUniqueOrThrow({where:{singleton:true}})).revision;
    await assert.rejects(expires.register([{...adapter,key:'synthetic_rollback86'}]),error=>{
      assert.deepEqual(collectionDiagnostic(error),{code:'DB_TRANSACTION_FAILED',causeCode:'P2028',phase:'register'});
      return true;
    });
    assert.equal(await db.provider.count({where:{key:'synthetic_rollback86'}}),0);
    assert.equal((await db.catalog_state.findUniqueOrThrow({where:{singleton:true}})).revision,revision);
    console.log('PASS timeout rolls back provider, scope and catalog revision atomically');
  } finally {
    if(db) await db.onApplicationShutdown();
    if(created) docker(['stop',name]);
  }
}
main().catch(error=>{console.error('CONTROL_TX_DB_CHECK_FAILED',collectionDiagnostic(error));process.exitCode=1;});
