import { cwd } from 'process';
import { postpublish } from '@no-mercy/scripts';

postpublish(cwd()).catch((exception: unknown) => {
  throw exception;
});
