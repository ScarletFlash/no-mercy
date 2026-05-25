import { access, cp, rm } from 'fs/promises';
import { join } from 'path';

const PUBLISHING_PROCESS_TAG = 'publishing' as const;

export async function postpublish(packageRootPath: string): Promise<void> {
  const manifestPath = join(packageRootPath, 'package.json');
  const manifestBackupPath = join(packageRootPath, `package.${PUBLISHING_PROCESS_TAG}.json`);

  await access(manifestBackupPath);
  await rm(manifestPath, { force: true });
  await cp(manifestBackupPath, manifestPath);
  await rm(manifestBackupPath);
}
