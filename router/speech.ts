import fs from 'node:fs';
import { Middleware } from 'koa';
import { logger } from '@/util/logger';
import { Code, response } from '@/util/response';
import Speech from '@/core/speech';

export const textToSpeechRoute: Middleware = async (ctx) => {
  const text = (ctx.request.body as any)?.text;

  if (!text) {
    ctx.status = 403;
    ctx.body = response('invalid params', Code.clientError);
    return;
  }

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
    logger(`error: ${errStr}, params: ${text}`, ctx, 'error');

    ctx.status = 500;
    ctx.body = response(errStr, Code.serverError);
    return;
  }

  ctx.set('Content-Type', 'audio/mpeg');
  ctx.body = buffer;
};

export const speechToTextRoute: Middleware = async (ctx) => {
  const file = ctx.request.files.file as any;

  if (!file) {
    ctx.status = 403;
    ctx.body = response('invalid params', Code.clientError);
    return;
  }

  const buffer = await fs.readFileSync(file.filepath);

  // @todo: buffer -> wav

  let error;
  const text = await Speech.get()
    .speechToText(buffer)
    .catch(err => {
      error = err;
      return null;
    });

  if (error) {
    const errStr = `Speech sdk error: ${error.toString()}`;
    logger(`error: ${errStr}, params: ${text}`, ctx, 'error');

    ctx.status = 500;
    ctx.body = response(errStr, Code.serverError);
    return;
  }

  ctx.body = response({
    text,
  });
};
