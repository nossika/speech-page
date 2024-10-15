import fs from 'node:fs';
import argv from '@/util/argv';

interface Secret {
  key: string;
  region: string;
  whiteList?: string[];
}

const s = fs.readFileSync('./secret.json', 'utf-8');
const secret: Secret = JSON.parse(s);


const config = {
  port: argv.port || 8000,
  proxyPort: argv['proxy-port'],
  apiAccessLimitPerMin: 5,
  accessLimitPerDay: 100,
  fileSizeLimit: 300 * 1024 * 1024,
  speechTextLengthLimit: 2000,
  ipHeader: 'x-real-ip', // Get ip from the request header, because the request many be proxied.
  idHeader: 'x-key', // For Secret.whiteList validation
  key: secret.key,
  region: secret.region,
  whiteList: secret.whiteList,
  loggerBackupDays: 7,
};

export default config;
