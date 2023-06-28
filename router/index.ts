import Router from '@koa/router';
import { getApiLimiter } from '@/util/limiter';
import { speechToTextRoute, textToSpeechRoute } from './speech';

const router = new Router();

enum Route {
  TextToSpeech = '/text-to-speech',
  SpeechToText = '/speech-to-text',
}

router.post(Route.TextToSpeech, getApiLimiter(Route.TextToSpeech), textToSpeechRoute);
router.post(Route.SpeechToText, getApiLimiter(Route.SpeechToText), speechToTextRoute);

export default router;
