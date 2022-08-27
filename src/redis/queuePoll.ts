import redis from './index';

const QUEUE_NAME = 'queue:polls';

const addPollIdToQueue = async (pollId: string) => {
  await redis.lPush(QUEUE_NAME, pollId);
};

export { addPollIdToQueue };
