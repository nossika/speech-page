import { Middleware } from 'koa';
import { logger } from '@/util/logger';
import { Code, response } from '@/util/response';
import Speech from '@/core/speech';
import { transferAudioFormat } from '@/core/ffmpeg';
import { handleCtxErr } from '@/util/error';
import config from '@/config';

export const textToSpeechRoute: Middleware = async (ctx) => {
  const text = (ctx.request.body as any)?.text;

  if (!text) {
    handleCtxErr({
      ctx,
      err: new Error('invalid params'),
      name: 'params check',
      code: Code.Forbidden,
    });
    return;
  }

  if (text.length > config.speechTextLengthLimit) {
    handleCtxErr({
      ctx,
      err: new Error(`text length exceeds, limit: ${config.speechTextLengthLimit}, received: ${text.length}`),
      name: 'params check',
      extraLog: `text: ${text}`,
      code: Code.Forbidden,
    });
    return;
  }

  ctx.logger(`text: ${text}`);

  const buffer = await Speech.get()
    .textToSpeechBuffer(text)
    .catch(err => {
      handleCtxErr({
        ctx,
        err,
        name: 'to speech buffer failed',
        extraLog: `text: ${text}`,
      });
    });

  if (!buffer) return;

  ctx.set('Content-Type', 'audio/mpeg');
  ctx.body = buffer;
};

export const speechToTextRoute: Middleware = async (ctx) => {
  const file = ctx.request.files?.file as any;

  if (!file) {
    handleCtxErr({
      ctx,
      err: new Error('invalid params'),
      name: 'params check',
      code: Code.Forbidden,
    });
    return;
  }

  ctx.logger(`file: ${file.filepath}`);

  const buffer = await transferAudioFormat(file.filepath)
    .catch(err => {
      handleCtxErr({
        ctx,
        err,
        name: `transfer audio failed`,
        extraLog: `file: ${file.filepath}`,
      });
    });

  if (!buffer) return;

  const text = await Speech.get()
    .speechToText(buffer)
    .catch(err => {
      handleCtxErr({
        ctx,
        err,
        name: 'to text failed',
        extraLog: `file: ${file.filepath}`,
      });
    });

  if (!text) return;

  ctx.body = response({
    text,
  });
};
