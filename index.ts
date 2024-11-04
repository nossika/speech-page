
import path from 'node:path';
import Koa from 'koa';
import serve from 'koa-static';
import koaBody from 'koa-body';
import etag from 'koa-etag';
import conditional from 'koa-conditional-get';
import { Code } from '@/util/response';
import { LoggerType, logger, useAccessLogger } from '@/util/logger';
import { accessLimiter } from '@/util/limiter';
import { handleCtxErr } from '@/util/error';
import router from '@/router';
import config from '@/config';
import Speech from '@/core/speech';

// init sdk
Speech.init({
  key: config.key,
  region: config.region,
});

const app = new Koa<Koa.DefaultState, {
  logger: (message: string, type: LoggerType) => void;
} & Koa.DefaultContext>();

app.use(async (ctx, next) => {
  ctx.logger = (message: string, type: LoggerType) => {
    logger(ctx, message, type)
  };

  await next();
});

// serve static files
app.use(conditional());
app.use(etag());
app.use(serve(path.resolve(__dirname, 'public')));

// set real request ip
app.use(async (ctx, next) => {
  if (config.ipHeader) {
    ctx.request.ip = ctx.request.header[config.ipHeader] as string || ctx.request.ip;
  }
  
  return await next();
});

// access limiter (cannot use more than one limiter for app)
app.use(accessLimiter);

// check permission
app.use(async (ctx, next) => {
  if (config.whiteList?.length) {
    const key = ctx.request.header[config.idHeader] as string;
    if (!config.whiteList.includes(key)) {
      handleCtxErr({
        ctx,
        err: new Error('no permission'),
        name: 'permission block',
        code: Code.Forbidden,
      });
      return;
    }
  }

  return await next();
});

// logger
app.use(useAccessLogger());


app.use(async (ctx, next) => {
  try {
    await next();
  } catch (err) {
    handleCtxErr({
      ctx,
      err,
    });
  }
});

// parse request body
app.use(koaBody({
  multipart: true,
  formidable: {
    maxFileSize: config.fileSizeLimit,
  },
}));

// router
app.use(router.routes());

// fallback to 404
app.use(async (ctx) => {
  handleCtxErr({
    ctx,
    err: new Error('404'),
    code: Code.NotFound,
  });
});

// start server
app.listen(config.port, () => {
  console.log(`listen on port http://localhost:${config.port} with config: ${JSON.stringify(config)}`);
});
