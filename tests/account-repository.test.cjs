const test = require('node:test');
const assert = require('node:assert/strict');
const { UsersRepository } = require('../dist/src/users/users.repository.js');
const { UsersService } = require('../dist/src/users/users.service.js');
const { FavoriteCursorService } = require('../dist/src/users/favorite-cursor.service.js');

const CONTENT = '11111111-1111-4111-8111-111111111111';
const EVENT = '22222222-2222-4222-8222-222222222222';
const initialSettings = (id) => ({ user_id:id,version:1n,country:'KR',time_zone:'Asia/Seoul',view_mode:'calendar',user_enabled_category:[{category:'movie'}],user_service_filter:[],user_device_filter:[] });
function fixture() {
  const users = new Map(['alice','bob'].map(id => [id,{id,favorites_version:1n}]));
  const settings = new Map(['alice','bob'].map(id => [id,initialSettings(id)]));
  const favorites = {content:[],event:[]};
  const scoped = (type, id) => favorites[type].filter(row => row.user_id === id);
  const db = {
    $transaction: async fn => fn(db),
    app_user: {
      findUniqueOrThrow: async ({where}) => users.get(where.id),
      update: async ({where,data}) => { const u=users.get(where.id);u.favorites_version+=BigInt(data.favorites_version.increment); }
    },
    user_settings: {
      findUniqueOrThrow: async ({where}) => settings.get(where.user_id),
      updateMany: async ({where,data}) => {
        const value=settings.get(where.user_id);
        if (!value || value.version !== where.version) return {count:0};
        value.version+=1n;
        value.country=data.country;
        value.time_zone=data.time_zone;
        value.view_mode=data.view_mode;
        return {count:1};
      }
    },
    user_enabled_category: {
      deleteMany: async ({where}) => { settings.get(where.user_id).user_enabled_category=[]; },
      createMany: async ({data}) => { for (const row of data) settings.get(row.user_id).user_enabled_category.push({category:row.category}); }
    },
    user_service_filter: {
      deleteMany: async ({where}) => {settings.get(where.user_id).user_service_filter=[];},
      createMany: async ({data}) => {for (const row of data) settings.get(row.user_id).user_service_filter.push({service:row.service});}
    },
    user_device_filter: {
      deleteMany: async ({where}) => {settings.get(where.user_id).user_device_filter=[];},
      createMany: async ({data}) => {for (const row of data) settings.get(row.user_id).user_device_filter.push({device:row.device});}
    },
    content: {findUnique:async ({where}) => where.id===CONTENT ? {id:CONTENT}:null},
    event: {findUnique:async ({where}) => where.id===EVENT ? {id:EVENT}:null},
  };
  for (const [type,table,field] of [['content','content_favorite','content_id'],['event','event_favorite','event_id']]) {
    db[table]={
      findMany:async ({where}) => scoped(type,where.user_id),
      createMany:async ({data}) => {
        let count=0;
        for (const row of data) {
          if (!favorites[type].some(v=>v.user_id===row.user_id && v[field]===row[field])) {
            favorites[type].push({...row,saved_at:new Date('2026-11-10T08:00:00Z')});count++;
          }
        }
        return {count};
      },
      deleteMany:async ({where}) => {
        const before=favorites[type].length;
        favorites[type]=favorites[type].filter(v=>v.user_id!==where.user_id||v[field]!==where[field]);
        return {count:before-favorites[type].length};
      }
    };
  }
  const repo = new UsersRepository(db);
  const auth = {user:async header => {
    if (header==='Bearer alice-token') return 'alice';
    if (header==='Bearer bob-token') return 'bob';
    throw Object.assign(new Error('unauthorized'),{status:401});
  }};
  const service=new UsersService(auth,repo,new FavoriteCursorService({cursorKey:'local-isolation-test-key'}));
  return {service,repo,users};
}

test('account settings retain ownership and reject a stale version without mutation', async () => {
  const {service}=fixture();
  const alice='Bearer alice-token', bob='Bearer bob-token';
  const originalBob=await service.settings(bob);
  const next={expectedVersion:'1',country:'US',timeZone:'UTC',enabledCategories:['movie','ott'],services:[],devices:[],view:'cards'};
  const updated=await service.replace(alice,next);
  assert.equal(updated.version,'2');
  assert.equal(updated.country,'US');
  assert.deepEqual(updated.enabledCategories,['movie','ott']);
  assert.deepEqual(await service.settings(bob),originalBob);
  await assert.rejects(service.replace(alice,{...next,country:'KR'}),{status:409});
  assert.deepEqual(await service.settings(alice),updated);
  await assert.rejects(service.settings('Bearer invalid'),{status:401});
});

test('favorite mutations are account scoped, idempotent, and cursor snapshots are version bound', async () => {
  const {service}=fixture();
  const alice='Bearer alice-token', bob='Bearer bob-token';
  const initially=await service.favorites(alice,{limit:'1'});
  await service.favorite(alice,'content',CONTENT,true);
  await service.favorite(alice,'content',CONTENT,true);
  assert.equal((await service.favorites(alice,{limit:'100'})).favoritesVersion,'2');
  assert.equal((await service.favorites(bob,{limit:'100'})).items.length,0);
  await service.favorite(alice,'event',EVENT,true);
  const first=await service.favorites(alice,{limit:'1'});
  assert.equal(first.items.length,1);
  assert.ok(first.nextCursor);
  assert.equal((await service.favorites(alice,{limit:'1',cursor:first.nextCursor,favoritesVersion:first.favoritesVersion})).items.length,1);
  await assert.rejects(service.favorites(bob,{limit:'1',cursor:first.nextCursor}),{status:400});
  await service.favorite(alice,'event',EVENT,false);
  await assert.rejects(service.favorites(alice,{limit:'1',cursor:first.nextCursor}),{status:409});
  await service.favorite(alice,'event',EVENT,false);
  assert.equal((await service.favorites(alice,{limit:'100'})).favoritesVersion,'4');
  assert.equal((await service.favorites(bob,{limit:'100'})).favoritesVersion,'1');
  assert.equal(initially.favoritesVersion,'1');
});
