import { spawnSync } from 'node:child_process';

if (process.env['STUDIO_SKIP_APP_DEPS'] === '1') {
  process.stdout.write('STUDIO_SKIP_APP_DEPS=1: native modules stay built for Node, not Electron\n');
} else {
  const result = spawnSync(process.execPath, ['x', '--no-install', 'electron-builder', 'install-app-deps'], { stdio: 'inherit', windowsHide: true });
  process.exit(result.status ?? 1);
}
