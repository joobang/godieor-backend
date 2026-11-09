import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule, ErrorFilter } from './module';
import { runtimeConfig } from './config';
async function main() {
 const config = runtimeConfig(); const app = await NestFactory.create(AppModule, { logger: ['error', 'warn', 'log'] });
 app.setGlobalPrefix('v1'); app.useGlobalFilters(new ErrorFilter()); app.enableShutdownHooks();
 await app.listen(config.port, config.host);
 console.log(`GODIEOR 로컬 API: http://${config.host}:${config.port}/v1 (가상 데이터 모드)`);
}
main().catch(() => { console.error('API 시작 실패. 환경 설정·DB 연결·포트를 확인하세요.'); process.exitCode = 1; });
