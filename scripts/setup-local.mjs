import { randomBytes } from 'node:crypto';
import { existsSync, writeFileSync } from 'node:fs';
if (existsSync('.env')) { console.log('기존 .env를 유지합니다.'); process.exit(0); }
const password = randomBytes(24).toString('hex');
const key = randomBytes(32).toString('hex');
writeFileSync('.env', `POSTGRES_PASSWORD=${password}\nPOSTGRES_PORT=55432\nDATABASE_URL=postgresql://godieor:${password}@127.0.0.1:55432/godieor_local\nCURSOR_SIGNING_KEY=${key}\nAPI_HOST=127.0.0.1\nPORT=3000\nCOLLECTION_SCHEDULE_ENABLED=false\nGOOGLE_CLIENT_ID=\n`, { mode: 0o600, flag: 'wx' });
console.log('프로젝트 전용 .env 생성 완료. 비밀 값은 출력하지 않습니다.');
