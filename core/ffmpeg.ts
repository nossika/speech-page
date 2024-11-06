import fs from 'node:fs';
import ffmpeg from 'fluent-ffmpeg';
import { path as ffmpegPath } from '@ffmpeg-installer/ffmpeg';
import { logger } from '@/util/logger';

ffmpeg.setFfmpegPath(ffmpegPath);
logger('ffmpeg.setFfmpegPath', ffmpegPath);

let id = 0;

export const transferAudioFormat = async (filePath: string, format = 'wav'): Promise<Buffer> => {
  const tempPath = `temp-audio-${id++}.${format}`;

  logger('transferAudioFormat', tempPath);

  return new Promise((resolve, reject) => {
    ffmpeg()
      .input(filePath)
      .format(format)
      .save(tempPath)
      .on('end', () => {
        const buffer = fs.readFileSync(tempPath);
        fs.unlinkSync(tempPath);
        resolve(buffer);
      })
      .on('error', (err) => {
        reject(err);
      });
  });
};
