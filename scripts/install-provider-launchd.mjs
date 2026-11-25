#!/usr/bin/env node
import { mkdir, writeFile, access } from 'node:fs/promises';
import { constants } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { homedir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
export const LABEL = 'dev.godieor.provider-daily';
const project = resolve(fileURLToPath(new URL('..', import.meta.url)));
const xml = s => String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');
export function providerLaunchdPlist({ node = process.execPath, root = project, hour = 8, minute = 30 } = {}) {
  if (!Number.isInteger(hour) || hour < 0 || hour > 23 || !Number.isInteger(minute) || minute < 0 || minute > 59 ||
      ![node,root].every(s => typeof s === 'string' && s.startsWith('/') && !/[\x00\r\n]/.test(s))) throw Error('INVALID_LAUNCHD_CONFIGURATION');
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
<key>Label</key><string>${LABEL}</string>
<key>ProgramArguments</key><array><string>${xml(node)}</string><string>${xml(join(root,'scripts/run-provider-daily.mjs'))}</string></array>
<key>WorkingDirectory</key><string>${xml(root)}</string>
<key>StartCalendarInterval</key><dict><key>Hour</key><integer>${hour}</integer><key>Minute</key><integer>${minute}</integer></dict>
<key>StandardOutPath</key><string>${xml(join(root,'work/provider-launchd.stdout.log'))}</string>
<key>StandardErrorPath</key><string>${xml(join(root,'work/provider-launchd.stderr.log'))}</string>
<key>RunAtLoad</key><false/>
</dict></plist>\n`;
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    if (process.argv.length !== 3 || !['--print','--install'].includes(process.argv[2])) throw Error('PASS_--print_OR_--install');
    const plist = providerLaunchdPlist();
    if (process.argv[2] === '--print') console.log(plist);
    else {
      if (process.platform !== 'darwin') throw Error('MACOS_REQUIRED');
      if (Number(process.versions.node.split('.')[0]) !== 24) throw Error('NODE_24_REQUIRED');
      if (Intl.DateTimeFormat().resolvedOptions().timeZone !== 'Asia/Seoul') throw Error('KST_SYSTEM_TIMEZONE_REQUIRED');
      await access(process.execPath,constants.X_OK); await access(join(project,'dist/src/cli/collect-daily.js'));
      await access(join(project,'dist/src/common/collection-diagnostic.js'));
      await access(join(project,'.env')); await mkdir(join(project,'work'),{recursive:true});
      const domain = `gui/${process.getuid()}`,target = `${domain}/${LABEL}`;
      const existing = spawnSync('launchctl',['print',target],{encoding:'utf8'});
      if (existing.status === 0 && /^\s*pid = \d+/m.test(existing.stdout)) throw Error('EXISTING_JOB_RUNNING');
      const directory = join(homedir(),'Library/LaunchAgents'),location = join(directory,`${LABEL}.plist`);
      await mkdir(directory,{recursive:true});
      if (existing.status === 0) {
        const out=spawnSync('launchctl',['bootout',target],{encoding:'utf8'});
        if(out.status!==0)throw Error('LAUNCHCTL_BOOTOUT_FAILED');
      }
      await writeFile(location,plist,{mode:0o600});
      const result=spawnSync('launchctl',['bootstrap',domain,location],{encoding:'utf8'});
      if(result.status!==0)throw Error('LAUNCHCTL_BOOTSTRAP_FAILED');
      console.log(JSON.stringify({installed:true,label:LABEL,location,hourKst:8,minute:30,runAtLoad:false}));
    }
  } catch(e) { console.error('PROVIDER_LAUNCHD_FAILED:',e.message);process.exitCode=1; }
}
