import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { parseArgs } from 'node:util';
import { z } from 'zod';
import { applyReview, atomicWrite, canonicalUrl, collectFeeds, eligibility, hash, merge, publishedDate, reviewedExport, SOURCES, transaction } from './candidates';

async function main(): Promise<void> {
 const { values, positionals } = parseArgs({ options: { file: { type: 'string' } }, allowPositionals: true });
 const command = positionals[0];
 if (positionals.length !== 1 || !['collect', 'list', 'add', 'review', 'export'].includes(command!)) throw new Error('명령: collect | list | add --file 파일 | review --file 파일 | export');
 if (['add', 'review'].includes(command!) !== !!values.file) throw new Error('add/review에만 --file이 필요합니다.');
 const directory = resolve('work/ott-candidates');
 const now = new Date().toISOString();
 await transaction(directory, async state => {
  if (command === 'collect') {
   await collectFeeds(state, now);
   if (Object.values(state.attempts).some(x => x.status === 'failed')) process.exitCode = 1;
   console.log(JSON.stringify({ stage: state.stage, attempts: state.attempts, candidates: state.candidates.length, published: 0 }, null, 2));
  } else if (command === 'add') {
   const value = z.object({ source: z.enum(['netflix', 'coupang', 'cj', 'disney']), url: z.string(), headline: z.string().min(1).max(500), publishedRaw: z.string().max(200).nullable(), evidenceRevision: z.string().min(1).max(200) }).strict().parse(JSON.parse(await readFile(values.file!, 'utf8')));
   const url = canonicalUrl(value.source, value.url);
   merge(state, [{ source: value.source, url, headline: value.headline, publishedRaw: value.publishedRaw, publishedAt: publishedDate(value.publishedRaw), contentHash: hash(JSON.stringify([value.headline, value.publishedRaw, value.evidenceRevision])) }], now);
   console.log(JSON.stringify({ id: hash(value.source + '\n' + url), published: 0 }));
  } else if (command === 'review') {
   const value: unknown = JSON.parse(await readFile(values.file!, 'utf8'));
   applyReview(state, value, now);
   console.log(JSON.stringify({ stage: state.stage, reviewed: true, published: 0 }));
  } else if (command === 'export') {
   const ready = reviewedExport(state);
   await atomicWrite(directory, 'reviewed.json', { stage: 'reviewed-candidate-not-published', generatedAt: now, candidates: ready, published: 0 });
   console.log(JSON.stringify({ path: 'work/ott-candidates/reviewed.json', candidates: ready.length, published: 0 }));
  } else {
   console.log(JSON.stringify({ stage: state.stage, candidates: state.candidates.map(x => ({ id: x.id, source: x.source, url: x.url, headline: x.revisions.at(-1)!.headline, revision: x.revisions.at(-1)!.token, revisions: x.revisions.length, reasons: eligibility(x) })) }, null, 2));
  }
 }, !['list', 'export'].includes(command!));
}
main().catch(error => {
 // Do not log arbitrary source bodies, local review input or credentials.
 console.error(error instanceof z.ZodError ? '후보 입력 형식/날짜가 유효하지 않습니다.' : error instanceof Error && /^(STALE_REVIEW|CANDIDATE_NOT_FOUND|INVALID_STORED_|SYMLINK_)/.test(error.message) ? error.message : '후보 명령 실패: 인자·파일·writer.lock·소스 접근 상태를 확인하세요.');
 process.exitCode = 1;
});
