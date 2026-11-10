// Account-level DB regression against the disposable PostgreSQL created by check-refactor-db.
// The Google verifier is stubbed: no real OAuth or real Google identity is claimed.
const assert = require('node:assert/strict');
const { AuthRepository } = require('../dist/src/auth/auth.repository');
const { AuthService } = require('../dist/src/auth/auth.service');
const { UsersRepository } = require('../dist/src/users/users.repository');
const { UsersService } = require('../dist/src/users/users.service');
const { FavoriteCursorService } = require('../dist/src/users/favorite-cursor.service');

module.exports = async function checkAccountDb(prisma) {
  const authRepo = new AuthRepository(prisma);
  const auth = new AuthService(authRepo, {verify: async () => {throw new Error('real Google OAuth not part of DB smoke');}});
  const users = new UsersService(auth, new UsersRepository(prisma), new FavoriteCursorService({cursorKey:'throwaway-account-test-signing-key'}));
  const aliceOne = await authRepo.issue('temporary-db-alice', 'Alice');
  const aliceTwo = await authRepo.issue('temporary-db-alice', 'Alice');
  const bob = await authRepo.issue('temporary-db-bob', 'Bob');
  const a = 'Bearer ' + aliceOne.accessToken;
  const a2 = 'Bearer ' + aliceTwo.accessToken;
  const b = 'Bearer ' + bob.accessToken;
  assert.equal(aliceOne.user.id, aliceTwo.user.id);
  assert.notEqual(aliceOne.user.id, bob.user.id);
  assert.equal(await auth.user(a), aliceOne.user.id);
  assert.equal(await auth.user(a2), aliceOne.user.id);
  assert.equal(await auth.user(b), bob.user.id);
  assert.equal((await users.settings(a)).version, '1');
  assert.deepEqual((await users.settings(b)).enabledCategories.sort(), ['movie','ott']);
  const settingsBob = await users.settings(b);
  const updated = await users.replace(a, {
    expectedVersion:'1',country:'US',timeZone:'UTC',enabledCategories:['movie','game'],services:['netflix'],devices:[],view:'cards'
  });
  assert.equal(updated.version, '2');
  assert.equal(updated.country, 'US');
  assert.deepEqual(await users.settings(a2), updated);
  assert.deepEqual(await users.settings(b), settingsBob);
  await assert.rejects(users.replace(a2, {
    expectedVersion:'1',country:'KR',timeZone:'Asia/Seoul',enabledCategories:['movie'],services:[],devices:[],view:'calendar'
  }), {status:409});
  assert.deepEqual(await users.settings(a), updated);

  const contentRows = await prisma.content.findMany({take:2,orderBy:{id:'asc'}});
  const eventRows = await prisma.event.findMany({take:1,orderBy:{id:'asc'}});
  assert.equal(contentRows.length, 2);
  assert.equal(eventRows.length, 1);
  const firstId = contentRows[0].id;
  const secondId = contentRows[1].id;
  await users.favorite(a,'content',firstId,true);
  await users.favorite(a2,'content',firstId,true);
  assert.equal((await users.favorites(a,{limit:'100'})).favoritesVersion,'2');
  await users.favorite(a,'content',secondId,true);
  await users.favorite(a,'event',eventRows[0].id,true);
  const firstPage = await users.favorites(a,{limit:'1'});
  assert.equal(firstPage.items.length,1);
  assert.ok(firstPage.nextCursor);
  assert.equal((await users.favorites(a2,{limit:'1',cursor:firstPage.nextCursor,favoritesVersion:firstPage.favoritesVersion})).items.length,1);
  await assert.rejects(users.favorites(b,{limit:'1',cursor:firstPage.nextCursor}),{status:400});
  assert.equal((await users.favorites(b,{limit:'100'})).items.length,0);
  await users.favorite(a,'event',eventRows[0].id,false);
  await assert.rejects(users.favorites(a,{limit:'1',cursor:firstPage.nextCursor}),{status:409});
  await users.favorite(a,'event',eventRows[0].id,false);
  assert.equal((await users.favorites(a,{limit:'100'})).favoritesVersion,'5');
  assert.equal((await users.favorites(b,{limit:'100'})).favoritesVersion,'1');
  await auth.session(a);
  await assert.rejects(auth.user(a),{status:401});
  assert.equal(await auth.user(a2), aliceOne.user.id);
  await assert.rejects(users.settings(a),{status:401});
  assert.deepEqual(await users.settings(a2),updated);
  await auth.session(a2);
  await auth.session(b);
  console.log('임시 DB: Google subject 계정 재사용/세션 단일 폐기, 사용자 격리, 설정 CAS 409, 찜 멱등·커서 버전 확인');
};
