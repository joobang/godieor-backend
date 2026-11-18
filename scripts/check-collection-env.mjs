// Values never leave the process. Common settings block all IO; provider keys block only that provider.
const secrets = {
  common: ["DATABASE_URL", "CURSOR_SIGNING_KEY"],
  kobis: ["KOBIS_API_KEY"], football_data_pl: ["FOOTBALL_DATA_API_KEY"],
  igdb: ["IGDB_CLIENT_ID", "IGDB_CLIENT_SECRET"], ott: ["TMDB_API_READ_ACCESS_TOKEN"],
};
export function missingCollectionSecrets(env = process.env, scope = 'all') {
  const names = scope === 'all' ? Object.values(secrets).flat() : secrets[scope];
  if (!names) throw Error('INVALID_COLLECTION_PREFLIGHT_SCOPE');
  return names.filter(name => !env[name]?.trim());
}
if (process.argv[1]?.endsWith('/check-collection-env.mjs')) {
  const args = process.argv.slice(2);
  if (args.length !== 2 || args[0] !== '--scope' || !Object.hasOwn(secrets, args[1])) {
    console.error('Expected --scope common|kobis|football_data_pl|igdb|ott');
    process.exitCode = 1;
  } else {
    const missing = missingCollectionSecrets(process.env, args[1]);
    if (missing.length) {
      console.error(`Collection configuration missing: ${missing.join(', ')}`);
      process.exitCode = 1;
    }
    if (args[1] === 'common') {
      for (const scope of ['kobis', 'football_data_pl', 'igdb', 'ott']) {
        const absent = missingCollectionSecrets(process.env, scope);
        if (absent.length) console.error(`::warning::${scope} configuration missing: ${absent.join(', ')}`);
      }
    }
  }
}
