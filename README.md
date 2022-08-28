# Poll Board Real-time Poll app
The application lets users to create polls and share it with others. Once users cast their vote they can view the results in real-time i.e the poll result graph in Frontend would get updated real-time for all users as votes are being casted.

### Architecture Diagram
![Architecture Diagram](https://imgur.com/rbEEXNG.png)
### Homepage
![Homepage](https://imgur.com/aSYjmxX.png)
### Vote page
![App Screenshot](https://i.imgur.com/ZIr6uj4.png)
### Create new Poll page
![Create new Poll page](https://imgur.com/t24Nhy7.png)

# TODO Overview video (Optional)

Here's a short video that explains the project and how it uses Redis:
> [![IMAGE ALT TEXT HERE](https://i.imgur.com/rbEEXNG.png)](https://youtu.be/LjxmwYUJbwY)

## How it works
The application consists of three repositories
1. [Poll API Service (Current Repo)](https://github.com/ashiqsultan/pollboard-backend).
2. [Socket service](https://github.com/ashiqsultan/pollboard-socket-service)
3. [Frontend](https://github.com/ashiqsultan/pollboard-frontend)

### Poll API Service
The API server is responsible for all CRUD operations on Poll entity.
### Socket Service
The socket service uses [Socket.IO](https://socket.io) . All users are connect to a socket room. The room name is the poll id they are answering for.
### Frontend
As you guessed it is the frontend application build with React as a SPA. It uses the Socket io client for websockets and Plotly for charts. 

## How the data is stored:

### On Create new Poll  
When a Request to create a new Poll is made we create two data structures in Redis. A RedisJSON and a Hash.  
1. **RedisJSON** (Namespace `Poll:<pollId>`).  
The essential poll data like pollId (entityId), title and poll options are stored as RedisJSON. This cloud be extended to include other meta data related to poll. The app uses **Redis OM** to store the poll data 
```
import { Entity, Schema } from 'redis-om';

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
```
    Below is the create function which stores the data using Redis OM
```
import { Client } from 'redis-om';

const create = async (name: string, options: string[]): Promise<string> => {
  const redisOm = await new Client().use(redis);
  const pollRepo = redisOm.fetchRepository(pollSchema);
  const poll = pollRepo.createEntity()
  poll.name = name;
  poll.options = options;
  poll.isClosed = false;
  const id = await pollRepo.save(poll);
  return id;
};
```
Here's how the created data looks on RedisInsight
![RedisInsight Poll data](https://i.imgur.com/ulvUDTb.png)

2. **Hash** (Namespace `pollBox:<pollId>`).  
This stores the actual vote count for each poll Once the Poll Entity is created we use the same entityId to create the pollBox using the below function to create the hash.
```
const create = async (poll: Poll) => {
  const entityId = poll.entityId;
  const pollBoxId = `pollBox:${entityId}`;
  const promises: Array<Promise<number>> = [];
  poll.options.forEach((option) => {
    promises.push(redis.hSet(pollBoxId, option, 0));
  });
  await Promise.all(promises);
};
```
The actual redis command we are concerned here is `redis.hSet(pollBoxId, option, 0)`. We are storing all the options with initial value as zero under the pollBox id.  

RedisInsight screenshot
![RedisInsight screenshot pollBox](https://i.imgur.com/ZJLS4OR.png)  

## How the data is accessed
### On Get Poll data
The Frontend makes a GET request with pollId to get the poll data. Since we created the poll data using the Redis OM we can use the same to retrieve the data.
```
const get = async (entityId: string): Promise<Poll> => {
  const redisOm = await new Client().use(redis);
  const pollRepo = redisOm.fetchRepository(pollSchema);
  const poll = await pollRepo.fetch(entityId);
  return poll;
};
```
### On New Vote
This is the place where the real-time part of the application comes into play. For this event we do couple of operations on both the backend services.
- API Service
    1. Update the hash (Increment vote count by one)
    2. LPUSH updated pollId to the queue
    3. Publish an update message to pub/sub
- Socket service
    1. pub/sub receives the update message
    2. RPOP the pollId from Queue
    3. Read latest data from poll hash
    4. Broadcast to socket room.  

**1. Update the hash**  
We increment the poll hash by 1 for the option sent in request payload. Since we have used Redis Hash we can increment with a single command. Below is the function to increment and get the updated hash.  
```
const update = async (entityId: string, option: string, count: number) => {
  const pollBoxId = `pollBox:${entityId}`;
  await redis.hIncrBy(pollBoxId, option, count);
  const pollBox = await redis.hGetAll(pollBoxId);
  return pollBox;
};
```
- `redis.hIncrBy(pollBoxId, option, count)` command increments the option by the value provided in count, here we use 1 for each vote.
- `redis.hGetAll(pollBoxId)` Gets the updated hash data.  

Redis Insight Screenshot
![Redis Insight Screenshot](https://i.imgur.com/38nOecE.png)  

**2. Update the Queue**
```
const QUEUE_NAME = 'queue:polls';
const addPollIdToQueue = async (pollId: string) => {
  await redis.lPush(QUEUE_NAME, pollId);
};
```
The command `redis.lPush(QUEUE_NAME, pollId)` simply pushes the pollId to a Redis list named `queue:polls` later in the socket service we will `rPop` the items from this list thus treating this list like a Queue structure. [Redis List data-types Docs](https://redis.io/docs/data-types/lists/)  

**3. Publish Update to channel**
```
const CHANNEL_NAME = 'channel:poll';
const UPDATE = 'update';
redis.publish(CHANNEL_NAME, UPDATE);
```
The command `redis.publish(CHANNEL_NAME, UPDATE)` simply publishes an update message to the redis pub/sub later this will be consumed in the Socket service.

**Socket Service**  
Socket service is subscribed to the Redis channel `channel:poll`. Once an update message is received from the channel we RPOP the pollId from the queue `queue:polls` and fetch the latest vote count form the hash and broadcasts the same to pollId room.  
**1. Subscribe to Redis pub/sub channel**
```
(async () => {
  const { CHANNEL_NAME } = constants;
  const { POLL_UPDATE } = constants.SOCKET_EVENTS;
  const subscribeClient = redis.duplicate();
  await subscribeClient.connect();
  await subscribeClient.subscribe(CHANNEL_NAME, async (message: string) => {
    const pollId = await popPollQueue();
    const pollBox = await getPollBox(pollId);
    io.to(pollId).emit(POLL_UPDATE, { entityId: pollId, pollBox });
  });
})();
```
The code `subscribeClient.subscribe(channelName, callback)` is the piece which subscribes to the channel and when a new message is received the callback is executed.  

**2. Read Queue**  
As mentioned in the API Service we will RPOP the list to get the updated pollID.
```
// popPollQueue.ts
...
const pollId = await redis.rPop(QUEUE_NAME);
...
```
**3. Read latest data from poll hash**  
```
// getPollBox.ts
...
const pollBoxId = `pollBox:${entityId}`;
const pollBox = await redis.hGetAll(pollBoxId);
...
```
`redis.hGetAll()` gets the complete hash object.

## How to run it locally?
1. Clone all the three repos
2. Create a `.env` file in the API service root directory
3. Create a `.env` file in the Socket service root directory
4. Both env file should have the Redis connection string with the name `REDIS_CONNECTION_STRING`
```
// Example .env file
REDIS_CONNECTION_STRING = redis://username:password@redis-11983.c274.us-east-1-3.ec2.cloud.redislabs.com:11983
```
5. Run `npm install` for all the three repos
6. Run the command `npm run dev` in all the repos to start the servers locally

### Prerequisites
> Node.js min version 16

## More Information about Redis Stack

Here some resources to help you quickly get started using Redis Stack. If you still have questions, feel free to ask them in the [Redis Discord](https://discord.gg/redis) or on [Twitter](https://twitter.com/redisinc).

### Getting Started

1. Sign up for a [free Redis Cloud account using this link](https://redis.info/try-free-dev-to) and use the [Redis Stack database in the cloud](https://developer.redis.com/create/rediscloud).
1. Based on the language/framework you want to use, you will find the following client libraries:
    - [Redis OM .NET (C#)](https://github.com/redis/redis-om-dotnet)
        - Watch this [getting started video](https://www.youtube.com/watch?v=ZHPXKrJCYNA)
        - Follow this [getting started guide](https://redis.io/docs/stack/get-started/tutorials/stack-dotnet/)
    - [Redis OM Node (JS)](https://github.com/redis/redis-om-node)
        - Watch this [getting started video](https://www.youtube.com/watch?v=KUfufrwpBkM)
        - Follow this [getting started guide](https://redis.io/docs/stack/get-started/tutorials/stack-node/)
    - [Redis OM Python](https://github.com/redis/redis-om-python)
        - Watch this [getting started video](https://www.youtube.com/watch?v=PPT1FElAS84)
        - Follow this [getting started guide](https://redis.io/docs/stack/get-started/tutorials/stack-python/)
    - [Redis OM Spring (Java)](https://github.com/redis/redis-om-spring)
        - Watch this [getting started video](https://www.youtube.com/watch?v=YhQX8pHy3hk)
        - Follow this [getting started guide](https://redis.io/docs/stack/get-started/tutorials/stack-spring/)

The above videos and guides should be enough to get you started in your desired language/framework. From there you can expand and develop your app. Use the resources below to help guide you further:

1. [Developer Hub](https://redis.info/devhub) - The main developer page for Redis, where you can find information on building using Redis with sample projects, guides, and tutorials.
1. [Redis Stack getting started page](https://redis.io/docs/stack/) - Lists all the Redis Stack features. From there you can find relevant docs and tutorials for all the capabilities of Redis Stack.
1. [Redis Rediscover](https://redis.com/rediscover/) - Provides use-cases for Redis as well as real-world examples and educational material
1. [RedisInsight - Desktop GUI tool](https://redis.info/redisinsight) - Use this to connect to Redis to visually see the data. It also has a CLI inside it that lets you send Redis CLI commands. It also has a profiler so you can see commands that are run on your Redis instance in real-time
1. Youtube Videos
    - [Official Redis Youtube channel](https://redis.info/youtube)
    - [Redis Stack videos](https://www.youtube.com/watch?v=LaiQFZ5bXaM&list=PL83Wfqi-zYZFIQyTMUU6X7rPW2kVV-Ppb) - Help you get started modeling data, using Redis OM, and exploring Redis Stack
    - [Redis Stack Real-Time Stock App](https://www.youtube.com/watch?v=mUNFvyrsl8Q) from Ahmad Bazzi
    - [Build a Fullstack Next.js app](https://www.youtube.com/watch?v=DOIWQddRD5M) with Fireship.io
    - [Microservices with Redis Course](https://www.youtube.com/watch?v=Cy9fAvsXGZA) by Scalable Scripts on freeCodeCamp
