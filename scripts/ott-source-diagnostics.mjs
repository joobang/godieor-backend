// Only forward fixed operational codes. Provider responses and exception messages can contain secrets.
const sourceCodes = new Set([
  'NETFLIX_NEXT_DATA_NOT_FOUND',
  'NETFLIX_KR_REGION_NOT_VERIFIED',
  'NETFLIX_SCHEDULE_STRUCTURE_CHANGED',
  'NETFLIX_SCHEDULE_PAGINATION_CHANGED',
  'NETFLIX_SCHEDULE_ITEM_CHANGED',
  'NETFLIX_SCHEDULE_INCOMPLETE',
  'NETFLIX_RELEASES_REDIRECT_CHANGED',
  'TVING_HOME_STRUCTURE_CHANGED',
  'TVING_UPCOMING_ITEMS_CHANGED',
  'TVING_UPCOMING_ITEM_CHANGED',
  'TVING_UPCOMING_SCOPE_CHANGED',
  'PRIMARY_REDIRECT_HOST_CHANGED',
  'TVING_MOVIE_IDENTITY_CHANGED',
  'TVING_HOME_PROGRAM_TITLE_CHANGED',
  'TVN_PROGRAM_IDENTITY_CHANGED',
  'TMDB_ID_MISMATCH',
  'TMDB_SEASON_MISMATCH',
  'COUPANG_ARTICLE_IDENTITY_CHANGED',
  'COUPANG_DUPLICATE_FIELD',
  'COUPANG_WORK_FIELDS_MISSING',
  'UNTRUSTED_COUPANG_ARTICLE',
  'SEARCH_INCOMPLETE',
  'SEARCH_PAGINATION_CHANGED',
  'INVALID_TMDB_ID',
  'TMDB_IDENTITY_CHANGED',
  'CAST_LOOKUP_INCOMPLETE',
  'SEASON_FIRST_EPISODE_UNCONFIRMED',
  'COUPANG_INVALID_HTML',
  'COUPANG_ARTICLES_MISSING',
  'COUPANG_RECOMMENDATIONS_MISSING',
  'COUPANG_REDIRECT_HOST_CHANGED',
  'COUPANG_INVALID_ARTICLE',
  'COUPANG_ARTICLE_TITLES_NOT_FOUND',
  'COUPANG_PARTIAL_FETCH',
  'INVALID_TMDB_CHANGES_PAGES',
  'INVALID_TMDB_CHANGE_ID',
  'INVALID_CHANGES_WINDOW',
  'INVALID_PREVIOUS_CHANGES',
  'TMDB_CHANGES_SINGLE_DAY_PAGE_LIMIT',
  'OTT_INPUT_FILE_MISSING',
  'OTT_OUTPUT_NOT_WRITABLE',
  'CONNECTION_FAILED',
]);
const providerHttp = /^(?:NETFLIX_RELEASES|NETFLIX|PRIMARY|COUPANG|TMDB)_HTTP_[1-5][0-9]{2}$/;
const networkErrors = new Set([
  'ETIMEDOUT', 'ECONNRESET', 'ECONNREFUSED', 'ENOTFOUND', 'EAI_AGAIN',
  'UND_ERR_CONNECT_TIMEOUT', 'UND_ERR_SOCKET',
]);

export function safeOttSourceCode(value) {
  if (typeof value === 'string' && (sourceCodes.has(value) || providerHttp.test(value))) return value;
  return undefined;
}

export function ottSourceFailure(error) {
  return { status: 'failed', errorCode: classifySourceFailure(error) };
}

function classifySourceFailure(error, unwrapTmdb = true) {
  const message = error?.message;
  let errorCode = safeOttSourceCode(message);
  if (!errorCode && typeof message === 'string' && message.startsWith('TMDB_REQUEST_FAILED:')) {
    const detail = message.slice('TMDB_REQUEST_FAILED:'.length);
    if (detail.startsWith('TMDB_HTTP_')) errorCode = safeOttSourceCode(detail);
    if (!errorCode && unwrapTmdb && error.cause) return classifySourceFailure(error.cause, false);
    if (detail === 'fetch failed') errorCode = 'CONNECTION_FAILED';
  }
  if (!errorCode && message === 'TMDB_API_READ_ACCESS_TOKEN required') errorCode = 'MISSING_PROVIDER_KEY';
  if (!errorCode && (error?.name === 'AbortError' || error?.name === 'TimeoutError')) errorCode = 'PROVIDER_TIMEOUT';
  if (!errorCode && error?.code === 'ENOENT') errorCode = 'OTT_INPUT_FILE_MISSING';
  if (!errorCode && (error?.code === 'EACCES' || error?.code === 'ENOSPC')) errorCode = 'OTT_OUTPUT_NOT_WRITABLE';
  if (!errorCode && (networkErrors.has(error?.code) || networkErrors.has(error?.cause?.code) ||
      message === 'fetch failed')) errorCode = 'CONNECTION_FAILED';
  if (!errorCode && error?.name === 'SyntaxError') errorCode = 'INVALID_PROVIDER_RESPONSE';
  return errorCode ?? 'COLLECTION_FAILED';
}
