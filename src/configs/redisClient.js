import Redis from 'ioredis';

export const redisConfig = {
    host: process.env.REDIS_HOST,
    port: Number(process.env.REDIS_PORT),
    username: process.env.REDIS_USERNAME,
    password: process.env.REDIS_PASSWORD,
};

export const client = new Redis(redisConfig);
export const redisPub = new Redis(redisConfig);
export const redisSub = new Redis(redisConfig);


client.on('error', err => console.log('Redis Client Error', err));
redisPub.on('error', err => console.log('Redis Pub Error', err));
redisSub.on('error', err => console.log('Redis Sub Error', err));

const connectRedis = async () => {
    try {
        await Promise.all([
            client.ping(),
            redisPub.ping(),
            redisSub.ping(),
        ]);
        console.log('connect to redis success !');
    } catch (error) {
        console.log('connect to redis failed !', error.message);
    }
}

connectRedis();



