import { execFileSync } from 'child_process';
import { readFile, writeFile } from 'fs/promises';
import { join } from 'path';
import { CONFIG, PACKAGE_JSON_DEFAULT_SORT_ORDER } from '@no-mercy/configs/prettier';
import { format } from 'prettier';

export async function bumpVersion(packageRootPath: string): Promise<void> {
  execFileSync('pnpm', ['--workspace-root', 'run', 'changeset', 'version'], {
    cwd: packageRootPath,
    stdio: 'inherit'
  });

  const manifestPath = join(packageRootPath, 'package.json');
  const manifest = await readFile(manifestPath, { encoding: 'utf-8' });
  const formattedManifest = await format(manifest, {
    ...CONFIG,
    parser: 'json',
    jsonSortOrder: JSON.stringify(PACKAGE_JSON_DEFAULT_SORT_ORDER)
  });
  if (formattedManifest !== manifest) {
    await writeFile(manifestPath, formattedManifest, { encoding: 'utf-8' });
  }
}
