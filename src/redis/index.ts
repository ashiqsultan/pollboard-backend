import { createClient } from 'redis';
import config from '../config';

const redis = createClient({
  url: config.redisConnectionString,
});

redis.on('error', (err) => console.log('Redis Client Error', err));

export default redis;
