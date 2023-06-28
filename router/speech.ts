import { Middleware } from 'koa';
import { logger } from '@/util/logger';
import { Code, response } from '@/util/response';
import Speech from '@/core/speech';
import { transferAudioFormat } from '@/core/ffmpeg';
import { handleCtxError } from '@/util/error';

export const textToSpeechRoute: Middleware = async (ctx) => {
  const text = (ctx.request.body as any)?.text;

  if (!text) {
    ctx.status = 403;
    ctx.body = response('invalid params', Code.clientError);
    return;
  }

  logger(`text: ${text}`, ctx);

  const buffer = await Speech.get()
    .textToSpeechBuffer(text)
    .catch(error => {
      handleCtxError({
        ctx,
        error,
        name: 'textToSpeechBuffer failed',
        extraLog: `text: ${text}`,
      });
    });

  if (!buffer) return;

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

  const buffer = await transferAudioFormat(file.filepath)
    .catch(error => {
      handleCtxError({
        ctx,
        error,
        name: `transferAudioFormat failed`,
        extraLog: `file: ${file.filepath}`,
      });
    });

  if (!buffer) return;

  const text = await Speech.get()
    .speechToText(buffer)
    .catch(error => {
      handleCtxError({
        ctx,
        error,
        name: 'speechToText failed',
        extraLog: `file: ${file.filepath}`,
      });
    });

  if (!text) return;

  ctx.body = response({
    text,
  });
};
