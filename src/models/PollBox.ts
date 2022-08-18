/**
 * PollBox is a Redis Hash that contains the Poll's options and their counts.
 * The key is pollBox:<entityId> where <entityId> is the Poll's entityId.
 * Each hash property are options from Poll entity and respective value represents the no of votes.
 * @param entityId The Poll's entityId.
 * @param option The option to update.
 * @param count The count to update the option with (can be negative).
 */
import { Poll } from './Poll';
import redis from '../redis';

const getPollBoxId = (entityId: string) => `pollBox:${entityId}`;

const create = async (poll: Poll) => {
  const entityId = poll.entityId;
  const pollBoxId = getPollBoxId(entityId);
  const promises: Array<Promise<number>> = [];
  poll.options.forEach((option) => {
    promises.push(redis.hSet(pollBoxId, option, 0));
  });
  await Promise.all(promises);
};

const get = async (entityId: string) => {
  const pollBoxId = getPollBoxId(entityId);
  const pollBox = await redis.hGetAll(pollBoxId);
  return pollBox;
};

const update = async (entityId: string, option: string, count: number) => {
  const pollBoxId = getPollBoxId(entityId);
  await redis.hIncrBy(pollBoxId, option, count);
  const pollBox = await redis.hGetAll(pollBoxId);
  return pollBox;
};

export { create, get, update };
