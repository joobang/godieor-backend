import { SOURCE } from './collect-coupangplay-kr-lineup.mjs';
import { upcomingPrograms } from './collect-tving-upcoming.mjs';
import { ottSourceFailure } from './ott-source-diagnostics.mjs';

const targets = {
  coupang_index: SOURCE,
  coupang_article: 'https://news.coupang.com/archives/68499/',
  tving_home: 'https://www.tving.com/',
  tving_upcoming: 'https://www.tving.com/more/band/AP0060',
};
const label = (value, allowed) => allowed.find(item => value.toLowerCase().includes(item)) ?? 'unknown';

async function probe(source, url) {
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(15000) });
    const headers = response.headers;
    const server = label(headers.get('server') ?? '', ['cloudfront', 'cloudflare', 'akamai', 'nginx']);
    const edge = label(headers.get('via') ?? '', ['cloudfront', 'cloudflare', 'akamai']);
    const contentType = label(headers.get('content-type') ?? '', ['text/html', 'text/plain', 'application/json']);
    const final = new URL(response.url);
    const samePath = final.origin + final.pathname === url;
    const result = { source, status: response.status, samePath, server, edge, contentType,
      edgeError: /^error from cloudfront$/i.test(headers.get('x-cache') ?? ''),
      challengeHeader: headers.get('cf-mitigated') === 'challenge' };
    if (response.status === 403 || (response.ok && source.startsWith('tving'))) {
      const html = await response.text();
      if (response.status === 403) {
        result.denialMarker = label(html.slice(0, 8192), [
          'the amazon cloudfront distribution is configured to block access from your country',
          'request blocked', 'the request could not be satisfied', 'access denied', 'captcha',
        ]);
      } else {
        try { result.programs = upcomingPrograms(html).length; }
        catch (error) { result.parseCode = ottSourceFailure(error).errorCode; }
      }
    } else {
      await response.body?.cancel();
    }
    return result;
  } catch (error) {
    return { source, ...ottSourceFailure(error) };
  }
}

const results = await Promise.all(Object.entries(targets).map(([source, url]) => probe(source, url)));
console.log(JSON.stringify({ node: process.version, results }));
