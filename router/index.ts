import Router from '@koa/router';
import { getApiLimiter } from '@/util/limiter';
import { textToSpeechRoute } from './speech';

const router = new Router();

enum Route {
  TextToSpeech = '/text-to-speech',
}

router.post(Route.TextToSpeech, getApiLimiter(Route.TextToSpeech), textToSpeechRoute);

export default router;
