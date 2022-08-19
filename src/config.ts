interface IConfig {
  port: string;
  corsOptions: any;
  redisConnectionString: string;
}
const config: IConfig = {
  port: process.env.PORT || '7000',
  corsOptions: { origin: '*' },
  redisConnectionString: process.env.REDIS_CONNECTION_STRING || '',
};

export default config;
