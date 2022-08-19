import redis from './index';

const CHANNEL_NAME = 'channel:poll';
const UPDATE = 'update';

const publishPollUpdate = async () => {
  await redis.publish(CHANNEL_NAME, UPDATE);
};

export { publishPollUpdate };
