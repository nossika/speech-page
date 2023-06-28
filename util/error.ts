import { ParameterizedContext } from 'koa';
import { Code, response } from './response';
import { logger } from './logger';

export const handleCtxError = ({
  ctx,
  error,
  name = 'error',
  extraLog = '',
  code = Code.serverError,
}: {
  ctx: ParameterizedContext;
  error: any;
  name?: string;
  extraLog?: string;
  code?: Code;
}) => {
  const errStr = `[${name}] ${error.toString()}`;
  logger(`Error=${errStr}, ExtraLog=${extraLog}`, ctx, 'error');

  ctx.status = code;
  ctx.body = response(errStr, code);

  return error;
};
