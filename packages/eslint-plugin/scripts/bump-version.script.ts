import { cwd } from 'process';
import { bumpVersion } from '@no-mercy/scripts';

bumpVersion(cwd()).catch((exception: unknown) => {
  throw exception;
});
