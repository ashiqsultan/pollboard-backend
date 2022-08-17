import { createClient } from 'redis';

const redis = createClient({
  url: 'redis://dev01:sd3232QWQW$$34KJHG@redis-11983.c274.us-east-1-3.ec2.cloud.redislabs.com:11983',
});

redis.on('error', (err) => console.log('Redis Client Error', err));

export default redis;
