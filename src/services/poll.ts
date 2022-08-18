import { Client } from 'redis-om';
import redis from '../redis';
import { Poll, pollSchema } from '../models/Poll';

const getPollRepository = async () => {
  const redisOm = await new Client().use(redis);
  return redisOm.fetchRepository(pollSchema);
};

export const create = async (
  name: string,
  options: string[]
): Promise<string> => {
  const pollRepo = await getPollRepository();
  const poll = pollRepo.createEntity();
  poll.name = name;
  poll.options = options;
  poll.isClosed = false;
  const id = await pollRepo.save(poll);
  return id;
};

export const get = async (entityId: string): Promise<Poll> => {
  const pollRepo = await getPollRepository();
  const poll = await pollRepo.fetch(entityId);
  return poll;
};
