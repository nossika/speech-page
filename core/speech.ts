import { AudioConfig, CancellationDetails, CancellationReason, ResultReason, SpeechConfig, SpeechRecognizer, SpeechSynthesisOutputFormat, SpeechSynthesizer } from 'microsoft-cognitiveservices-speech-sdk';

class AzureSpeech {
  private config: { 
    key: string; 
    region: string;
  };
  constructor({
    key,
    region,
  }: {
    key: string;
    region: string;
  }) {
    this.config = {
      key,
      region,
    };
  }

  async textToSpeechBuffer(text: string, {
    voiceName = 'zh-CN-XiaoyiNeural',
    outputFormat = SpeechSynthesisOutputFormat.Audio16Khz128KBitRateMonoMp3,
  }: {
    voiceName?: string; // @refer: https://learn.microsoft.com/en-us/azure/cognitive-services/speech-service/language-support?tabs=tts#text-to-speech
    outputFormat?: SpeechSynthesisOutputFormat;
  } = {}) {
    const speechConfig = this.getSpeechConfig();
    speechConfig.speechSynthesisVoiceName = voiceName;
    speechConfig.speechSynthesisOutputFormat = outputFormat;
    const speechSynthesizer = new SpeechSynthesizer(speechConfig);

    const buffer = await new Promise<ArrayBuffer>((resolve, reject) => {
      speechSynthesizer.speakTextAsync(
        text,
        (result) => {
          if (result.reason === ResultReason.SynthesizingAudioCompleted) {
            resolve(result.audioData);
          } else {
            reject(result.errorDetails);
          }
        },
        (error) => {
          reject(error);
        },
      );
    });
    
    return Buffer.from(buffer);
  }

  async speechToText(wavBuffer: Buffer, {
    language = 'zh-CN',
  }: {
    language?: string;
  } = {}): Promise<string> {
    const speechConfig = this.getSpeechConfig();
    speechConfig.speechRecognitionLanguage = language;

    const audioConfig = AudioConfig.fromWavFileInput(wavBuffer);
    const speechRecognizer = new SpeechRecognizer(speechConfig, audioConfig);

    return new Promise((resolve, reject) => {
      speechRecognizer.recognizeOnceAsync(
        (result) => {
          switch (result.reason) {
            case ResultReason.RecognizedSpeech:
              resolve(result.text);
              break;
            case ResultReason.NoMatch:
              reject('NOMATCH: Speech could not be recognized.');
              break;
            case ResultReason.Canceled:
              const cancellation = CancellationDetails.fromResult(result);
              reject(`CANCELED: ErrorCode=${cancellation.ErrorCode}, ErrorDetails=${cancellation.errorDetails}`);
              break;
            default:
              reject(`FAILED: Reason=${result.reason}`);
          }
          speechRecognizer.close();
        },
        (error) => {
          reject(error);
          speechRecognizer.close();
        },
      );
    });
    
  }

  private getSpeechConfig() {
    return SpeechConfig.fromSubscription(this.config.key, this.config.region);
  }
}

let instance: AzureSpeech | null = null;

const Speech = {
  init: ({
    key,
    region,
  }: {
    key: string,
    region: string,
  }) => {
    instance = new AzureSpeech({
      key,
      region,
    });
  },
  get: () => {
    if (!instance) {
      throw new Error('Cannot get before init');
    }

    return instance;
  },
};

export default Speech;
