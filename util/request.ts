import axios from 'axios';
import { HttpsProxyAgent } from 'https-proxy-agent';
import argv from '@/util/argv';

const httpsAgent = 
  argv['proxy-port']
  ? new HttpsProxyAgent(`http://127.0.0.1:${argv['proxy-port']}`)
  : undefined;

const request = axios.create({
  httpsAgent,
});

export default request;
