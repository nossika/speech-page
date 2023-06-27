import { ResultReason, SpeechConfig, SpeechSynthesisOutputFormat, SpeechSynthesizer } from 'microsoft-cognitiveservices-speech-sdk';

class AzureSpeech {
  private speechSynthesizer: SpeechSynthesizer;
  constructor({
    key,
    region,
    voiceName = 'zh-CN-XiaoyiNeural', // @refer: https://learn.microsoft.com/en-us/azure/cognitive-services/speech-service/language-support?tabs=tts#text-to-speech
    outputFormat = SpeechSynthesisOutputFormat.Audio16Khz128KBitRateMonoMp3,
  }: {
    key: string;
    region: string;
    voiceName?: string;
    outputFormat?: SpeechSynthesisOutputFormat;
  }) {
    const speechConfig = SpeechConfig.fromSubscription(key, region);
    speechConfig.speechSynthesisVoiceName = voiceName;
    speechConfig.speechSynthesisOutputFormat = outputFormat;

    const speechSynthesizer = new SpeechSynthesizer(speechConfig);
    
    this.speechSynthesizer = speechSynthesizer;
  }

  async textToSpeechBuffer(text: string) {
    const buffer = await new Promise<ArrayBuffer>((resolve, reject) => {
      this.speechSynthesizer.speakTextAsync(
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
