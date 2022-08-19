import redis from './index';

const QUEUE_NAME = 'queue:polls';

const addPollIdToQueue = async (pollId: string) => {
  await redis.rPush(QUEUE_NAME, pollId);
};

export { addPollIdToQueue };
