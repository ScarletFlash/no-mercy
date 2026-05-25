import { cp, rm, writeFile } from 'fs/promises';
import { join } from 'path';
import { readPackageJson } from '@pnpm/read-package-json';
import { type PackageManifest } from '@pnpm/types';
import { regex } from 'arkregex';

const PUBLISHING_PROCESS_TAG = 'publishing' as const;

const FIELDS_TO_KEEP: Set<string> = new Set<keyof PackageManifest>([
  'main',
  'type',
  'types',
  'repository',
  'scripts',
  'dependencies',
  'exports',
  'license',
  'files',
  'peerDependencies',
  'keywords',
  'homepage',
  'bugs',
  'author',
  'publishConfig'
]);

const SOURCE_ENTRY_POINT_PATTERN = regex('./src/(.+).ts$');

export async function prepublish(packageRootPath: string): Promise<void> {
  const manifestPath = join(packageRootPath, 'package.json');
  const manifestBackupPath = join(packageRootPath, `package.${PUBLISHING_PROCESS_TAG}.json`);

  await rm(manifestBackupPath, {
    force: true
  });
  await cp(manifestPath, manifestBackupPath);

  const { name, version, scripts, main, types, ...remainingFields }: PackageManifest =
    await readPackageJson(manifestPath);

  const filteredManifestFields = Object.fromEntries(
    Object.entries(remainingFields).filter(([key]: [string, unknown]) => FIELDS_TO_KEEP.has(key))
  );

  if (typeof main !== 'string') {
    throw new Error(`Expected 'main' field to be a string, but got ${typeof main}`);
  }
  if (typeof types !== 'string') {
    throw new Error(`Expected 'types' field to be a string, but got ${typeof types}`);
  }

  const publishingManifest: PackageManifest = {
    ...filteredManifestFields,
    main: main.replace(SOURCE_ENTRY_POINT_PATTERN, './dist/$1.mjs'),
    types: types.replace(SOURCE_ENTRY_POINT_PATTERN, './dist/$1.d.ts'),
    name,
    version,
    scripts: {
      postpublish: scripts?.postpublish ?? ''
    }
  };

  await writeFile(manifestPath, JSON.stringify(publishingManifest), {
    encoding: 'utf-8'
  });
}
