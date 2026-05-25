import { cwd } from 'process';
import { prepublish } from '@no-mercy/scripts';

prepublish(cwd()).catch((exception: unknown) => {
  throw exception;
});
