import { Entity, Schema, Repository } from 'redis-om';

interface Poll {
  name: string;
  options: string[];
  isClosed: boolean;
}

class Poll extends Entity {}

const pollSchema = new Schema(
  Poll,
  {
    name: { type: 'string' },
    options: { type: 'string[]' },
    isClosed: { type: 'boolean' },
  },
  { dataStructure: 'JSON' }
);

export { Poll, pollSchema };
