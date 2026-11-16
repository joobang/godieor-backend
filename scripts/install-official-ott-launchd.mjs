#!/usr/bin/env node
// Installs the local macOS daily pipeline job for the current user.
import { mkdir, writeFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { homedir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const label = 'dev.godieor.official-ott-daily';
const project = resolve(fileURLToPath(new URL('..', import.meta.url)));
const escapeXml = (s) => String(s).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');

export function launchdPlist({ node = process.execPath, root = project, hour = 9 } = {}) {
  if (!Number.isInteger(hour) || hour < 0 || hour > 23 || !node.startsWith('/') || !root.startsWith('/'))
    throw Error('INVALID_LAUNCHD_CONFIGURATION');
  const encoded = [node, join(root, 'scripts/run-official-ott-daily.mjs')].map((v) => `    <string>${escapeXml(v)}</string>`).join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
  <key>Label</key><string>${label}</string>
  <key>ProgramArguments</key><array>
${encoded}
  </array>
  <key>WorkingDirectory</key><string>${escapeXml(root)}</string>
  <key>StartCalendarInterval</key><dict><key>Hour</key><integer>${hour}</integer><key>Minute</key><integer>0</integer></dict>
  <key>StandardOutPath</key><string>${escapeXml(join(root, 'work/ott-official-launchd.stdout.log'))}</string>
  <key>StandardErrorPath</key><string>${escapeXml(join(root, 'work/ott-official-launchd.stderr.log'))}</string>
  <key>RunAtLoad</key><false/>
</dict></plist>\n`;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const location = join(homedir(), 'Library/LaunchAgents', `${label}.plist`);
    const plist = launchdPlist();
    if (process.argv.includes('--print')) console.log(plist);
    else if (process.argv.includes('--install')) {
      if (Number(process.versions.node.split('.')[0]) !== 24) throw Error('NODE_24_REQUIRED');
      if (Intl.DateTimeFormat().resolvedOptions().timeZone !== 'Asia/Seoul') throw Error('LAUNCHD_REQUIRES_KST_SYSTEM_TIMEZONE');
      if (process.platform !== 'darwin') throw Error('MACOS_REQUIRED');
      await mkdir(join(homedir(), 'Library/LaunchAgents'), { recursive: true });
      await writeFile(location, plist, { mode: 0o600 });
      const domain = `gui/${process.getuid()}`;
      spawnSync('launchctl', ['bootout', domain, location], { encoding: 'utf8' });
      const result = spawnSync('launchctl', ['bootstrap', domain, location], { encoding: 'utf8' });
      if (result.status !== 0) throw Error(`LAUNCHCTL_BOOTSTRAP_FAILED: ${result.stderr.trim()}`);
      console.log(JSON.stringify({ installed: true, location, hourKst: 9, label }));
    } else throw Error('PASS_--print_OR_--install');
  } catch (error) { console.error('LAUNCHD_SETUP_FAILED:', error.message); process.exitCode = 1; }
}
