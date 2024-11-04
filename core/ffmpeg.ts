import fs from 'node:fs';
import ffmpeg from 'fluent-ffmpeg';
import { path as ffmpegPath } from '@ffmpeg-installer/ffmpeg';

ffmpeg.setFfmpegPath(ffmpegPath);

export const transferAudioFormat = async (filePath: string, format = 'wav'): Promise<Buffer> => {
  // 有小概率冲突风险
  const tempPath = `${Date.now()}.${format}`;

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
