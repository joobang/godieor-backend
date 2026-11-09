import { All, Catch, Controller, Delete, ExceptionFilter, ArgumentsHost, Get, Header, HttpException, Module, Param, Post, Query, ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { randomUUID } from 'node:crypto';
import { Database } from './database';
import { Pipeline } from './pipeline';
import { Catalog } from './catalog';
@Controller()
class PublicController {
 constructor(private readonly catalog: Catalog, private readonly db: Database) {}
 @Get('health') async health() { await this.db.$queryRaw`SELECT 1`; return { status: 'ok', database: 'connected', dataMode: 'fixture', realProvidersConnected: false }; }
 @Get('catalog/options') options() { return this.catalog.options(); }
 @Get('calendar') calendar(@Query() q: Record<string, unknown>) { return this.catalog.calendar(q); }
 @Get('events') events(@Query() q: Record<string, unknown>) { return this.catalog.events(q); }
 @Get('events/:id') detail(@Param('id') id: string, @Query() q: Record<string, unknown>) { if (Object.keys(q).some(k => k !== 'timeZone') || (q.timeZone !== undefined && typeof q.timeZone !== 'string')) throw new HttpException({ code: 'INVALID_QUERY', message: '시간대를 확인하세요.' }, 400); return this.catalog.detail(id, q.timeZone as string | undefined); }
 @Get('contents/:id') content(@Param('id') id: string) { return this.catalog.content(id); }
}
@Controller('auth')
class AuthBoundary {
 @Post('google') @Header('Cache-Control', 'no-store') google() { throw new ServiceUnavailableException({ code: 'AUTH_NOT_IMPLEMENTED', message: 'Google 서비스 인증은 후속 구현 예정입니다.' }); }
 @Delete('session') @Header('Cache-Control', 'no-store') session() { throw new UnauthorizedException({ code: 'AUTH_REQUIRED', message: '유효한 서비스 세션이 필요합니다.' }); }
}
@Controller('me')
class PersonalBoundary {
 @All(['', '*path']) @Header('Cache-Control', 'no-store') blocked() { throw new UnauthorizedException({ code: 'AUTH_REQUIRED', message: '계정 기능은 인증 구현 후 제공됩니다.' }); }
}
@Catch()
export class ErrorFilter implements ExceptionFilter {
 catch(error: unknown, host: ArgumentsHost) {
  const response = host.switchToHttp().getResponse(); const request = host.switchToHttp().getRequest();
  const http = error instanceof HttpException; const status = http ? error.getStatus() : 503;
  const payload = http ? error.getResponse() : null; const body = payload && typeof payload === 'object' ? payload as Record<string, unknown> : {};
  if (request.url?.startsWith('/v1/me') || request.url?.startsWith('/v1/auth')) response.setHeader('Cache-Control', 'no-store');
  if (status === 401) response.setHeader('WWW-Authenticate', 'Bearer');
  response.status(status).json({ code: body.code ?? (status === 404 ? 'NOT_FOUND' : status === 503 ? 'SERVICE_UNAVAILABLE' : 'REQUEST_FAILED'), message: body.message ?? (status === 503 ? '일시적으로 요청을 처리할 수 없습니다.' : '요청을 확인하세요.'), requestId: randomUUID(), details: body.details ?? [] });
 }
}
@Module({ imports: [ScheduleModule.forRoot()], controllers: [PublicController, AuthBoundary, PersonalBoundary], providers: [Database, Pipeline, Catalog] })
export class AppModule {}
