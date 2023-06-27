import { Middleware } from 'koa';
import { logger } from '@/util/logger';
import { Code, response } from '@/util/response';
import Speech from '@/core/speech';
import fs from 'node:fs';

interface Params {
  text: string;
}

const extraParams = (params: unknown): Params | null => {
  const { text }: Partial<Params> = params;

  if (!text) {
    return null;
  }

  return { text };
}

export const textToSpeechRoute: Middleware = async (ctx) => {
  const params = extraParams(ctx.request.body);

  if (!ctx.request.body) {
    ctx.status = 403;
    ctx.body = response('invalid params', Code.clientError);
    return;
  }

  const { text } = params;
  logger(`text: ${text}`, ctx);

  let error;
  const buffer: Buffer | null = await Speech.get()
    .textToSpeechBuffer(text)
    .catch(err => {
      error = err;
      return null;
    });

  if (error) {
    const errStr = `Speech sdk error: ${error.toString()}`;
    logger(`error: ${errStr}, params: ${JSON.stringify(params)}`, ctx, 'error');

    ctx.status = 500;
    ctx.body = response(errStr, Code.serverError);
    return;
  }

  ctx.set('Content-Type', 'audio/mpeg');
  ctx.body = buffer;
};
