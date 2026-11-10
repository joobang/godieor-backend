const test = require('node:test');
const assert = require('node:assert/strict');
const { generateKeyPairSync, createSign } = require('node:crypto');
const { AuthService } = require('../dist/src/auth/auth.service.js');
const { GoogleTokenClient } = require('../dist/src/auth/google-token.client.js');
const { FavoriteCursorService } = require('../dist/src/users/favorite-cursor.service.js');
const { UsersService } = require('../dist/src/users/users.service.js');

const makeToken = (privateKey, claims) => {
  const base64 = (value) => Buffer.from(JSON.stringify(value)).toString('base64url');
  const signing = `${base64({alg:'RS256',kid:'local-test'})}.${base64(claims)}`;
  return `${signing}.${createSign('RSA-SHA256').update(signing).sign(privateKey).toString('base64url')}`;
};

test('Google JWT signature, issuer, audience and expiry are checked', async (t) => {
  const previous = process.env.GOOGLE_IOS_CLIENT_ID;
  process.env.GOOGLE_IOS_CLIENT_ID = 'ios-client-test';
  t.after(() => { if (previous === undefined) delete process.env.GOOGLE_IOS_CLIENT_ID; else process.env.GOOGLE_IOS_CLIENT_ID = previous; });
  const {publicKey,privateKey} = generateKeyPairSync('rsa',{modulusLength:2048});
  const jwk = publicKey.export({format:'jwk'});
  const client = new GoogleTokenClient();
  client.cached = {keys:[{kid:'local-test',kty:'RSA',alg:'RS256',use:'sig',n:jwk.n,e:jwk.e}],until:Date.now()+300000};
  const now = Math.floor(Date.now()/1000);
  const valid = {iss:'https://accounts.google.com',aud:'ios-client-test',sub:'google-sub',iat:now,exp:now+600,name:'Sample'};
  assert.deepEqual(await client.verify(makeToken(privateKey,valid)),{subject:'google-sub',name:'Sample'});
  for (const change of [{aud:'other'},{iss:'attacker'},{exp:now-1},{iat:now+1000}]) {
    await assert.rejects(client.verify(makeToken(privateKey,{...valid,...change})),{status:401});
  }
  const tampered = makeToken(privateKey,valid).replace(/.$/, 'a');
  await assert.rejects(client.verify(tampered),{status:401});
});

test('expired and revoked service sessions reject access and logout revokes active token', async () => {
  const token = 'a'.repeat(43);
  const session = {user_id:'user-one',expires_at:new Date(Date.now()+10000),revoked_at:null};
  let revoked = false;
  const auth = new AuthService({session:async () => revoked ? {...session,revoked_at:new Date()} : session,revoke:async()=>{revoked=true;}},{});
  assert.equal(await auth.user(`Bearer ${token}`),'user-one');
  await auth.session(`Bearer ${token}`);
  await assert.rejects(auth.user(`Bearer ${token}`),{status:401});
  await assert.rejects(auth.user('Bearer bad'),{status:401});
  const expired = new AuthService({session:async()=>({...session,expires_at:new Date(1)})},{});
  await assert.rejects(expired.user(`Bearer ${token}`),{status:401});
});

test('favorite cursor binds to account, version, page size and rejects tampering', () => {
  const service = new FavoriteCursorService({cursorKey:'test-cursor-key'});
  const items = Array.from({length:3},(_,i)=>({targetType:'event',targetId:`id-${i}`,savedAt:'2026-11-10'}));
  const first = service.page('user-a',{favoritesVersion:'1',items},{limit:'2'});
  assert.equal(first.items.length,2);
  const next = service.page('user-a',{favoritesVersion:'1',items},{limit:'2',cursor:first.nextCursor,favoritesVersion:'1'});
  assert.equal(next.items.length,1);
  assert.equal(next.nextCursor,null);
  assert.throws(()=>service.page('user-b',{favoritesVersion:'1',items},{limit:'2',cursor:first.nextCursor}),{status:400});
  assert.throws(()=>service.page('user-a',{favoritesVersion:'2',items},{limit:'2',cursor:first.nextCursor}),{status:409});
  assert.throws(()=>service.page('user-a',{favoritesVersion:'1',items},{limit:'1',cursor:first.nextCursor}),{status:400});
  assert.throws(()=>service.page('user-a',{favoritesVersion:'1',items},{limit:'2',cursor:first.nextCursor+'x'}),{status:400});
});

test('settings input rejects duplicates before writing and uses authenticated user identity', async () => {
  const writes=[];
  const auth={user:async(header)=>header==='Bearer auth-user'?'user-a':Promise.reject(new Error('unauthorized'))};
  const repo={replaceSettings:async (...args)=>{writes.push(args);return {version:'2'};}};
  const users = new UsersService(auth,repo,{});
  const input={expectedVersion:'1',country:'KR',timeZone:'Asia/Seoul',enabledCategories:['movie','ott'],services:[],devices:[],view:'calendar'};
  assert.deepEqual(await users.replace('Bearer auth-user',input),{version:'2'});
  assert.equal(writes[0][0],'user-a');
  await assert.rejects(users.replace('Bearer auth-user',{...input,enabledCategories:['movie','movie']}),{status:400});
  assert.equal(writes.length,1);
});
