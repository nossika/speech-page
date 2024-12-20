import { Middleware, ParameterizedContext } from 'koa';
import path from 'path';
import log4js from 'log4js';
import config from '@/config';

log4js.configure({
  appenders: {
    file: {
      type: 'dateFile',
      pattern: 'yyyy-MM-dd.log',
      alwaysIncludePattern: true,
      encoding: 'utf-8',
      filename: path.resolve(__dirname, '..', 'logs', 'access'),
      numBackups: config.loggerBackupDays || 1,
    },
  },
  categories: {
    default: { appenders: ['file'], level: 'info' },
  },
});
  
const originLogger = log4js.getLogger();

export type LoggerType = 'info' | 'error';

export const logger = (ctx: ParameterizedContext | string, message: string, type: LoggerType = 'info') => {
  const prefixes = typeof ctx === 'string' 
    ? [
      `[${ctx}]`,
    ]
    : [
      ctx.request.header[config.idHeader] || '',
      ctx.request.ip,
      ctx.method,
      ctx.url,
    ].filter(Boolean);

  const log = prefixes.concat(message).join(' ');

  if (type === 'error') {
    originLogger.error(log);
    return;
  }

  originLogger.info(log);
}

export const useAccessLogger = (): Middleware => {
  return async (ctx, next) => {
    const time = Date.now();
    let err;
    await next().catch(nextErr => {
      err = nextErr;
    });

    ctx.logger(`➡️ ${ctx.status} ${Date.now() - time}ms`);

    if (err) {
      throw err;
    }
  };
};
