import argv from '@/util/argv';

const config = {
  port: argv.port || 8000,
  proxyPort: argv['proxy-port'],
  apiAccessLimitPerMin: 5,
  accessLimitPerDay: 100,
  fileSizeLimit: 300 * 1024 * 1024,
  speechTextLengthLimit: 2000,
  ipHeader: 'x-real-ip', // Get ip from the request header, because the request many be proxied.
};

export default config;
