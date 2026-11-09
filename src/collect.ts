import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './module';
import { Pipeline } from './pipeline';
async function main() {
 const args = process.argv.slice(2); const invalid = args.find(arg => !['--mode=backfill', '--mode=daily', '--force'].includes(arg));
 if (invalid) throw new Error('허용 인자: --mode=backfill | --mode=daily, --force');
 const app = await NestFactory.createApplicationContext(AppModule, { logger: ['error', 'warn'] });
 try { const result = await app.get(Pipeline).collect(args.includes('--mode=daily') ? 'daily' : 'backfill', args.includes('--force')); console.log(JSON.stringify({ dataOrigin: 'fixture', results: result }, null, 2)); if (result.some(x => x.status === 'failed')) process.exitCode = 1; }
 finally { await app.close(); }
}
main().catch(() => { console.error('수집 명령 실패. DB 연결·환경 설정·수집 기록을 확인하세요.'); process.exitCode = 1; });
