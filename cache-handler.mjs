import { CacheHandler } from '@neshca/cache-handler';
import createLruHandler from '@neshca/cache-handler/local-lru';
import createRedisHandler from '@neshca/cache-handler/redis-strings';
import { createClient } from 'redis';
import winston from 'winston';

// Imports the Google Cloud client library for Winston
import { LoggingWinston } from '@google-cloud/logging-winston';

const loggingWinston = new LoggingWinston();
// Create a Winston logger that streams to Cloud Logging
// Logs will be written to: "projects/YOUR_PROJECT_ID/logs/winston_log"

import { Logging } from '@google-cloud/logging'

// const logger = winston.createLogger({
const logging = new Logging({ projectId: 'next-redis' });

// Selects the log to write to
const logger = console

const address = '10.46.150.171'

CacheHandler.onCreation(async () => {
  let client;
  console.log('creation')

  try {

    // Create a Redis client.
    client = createClient({
      url: `redis://:${process.env.REDIS_AUTH_STRING}@${address}:6379`
      // url: `redis://${address}:6379`
    });

    // Redis won't work without error handling. https://github.com/redis/node-redis?tab=readme-ov-file#events
    client.on('error', (error) => {
      // Use logging with caution in production. Redis will flood your logs. Hide it behind a flag.
      console.log('Redis client error:', error);
    });
  } catch (error) {
    console.log('Failed to create Redis client:', error);
  }


  if (client) {
    try {
      console.log('Connecting Redis client...');

      // Wait for the client to connect.
      // Caveat: This will block the server from starting until the client is connected.
      // And there is no timeout. Make your own timeout if needed.
      await client.connect();
      console.log('Redis client connected.');
    } catch (error) {
      console.log('Failed to connect Redis client:', error);

      console.warn('Disconnecting the Redis client...');
      // Try to disconnect the client to stop it from reconnecting.
      client
        .disconnect()
        .then(() => {
          console.log('Redis client disconnected.');
        })
        .catch(() => {
          console.log('Failed to quit the Redis client after failing to connect.');
        });
    }
  }

  /** @type {import("@neshca/cache-handler").Handler | null} */
  let handler;


  if (client?.isReady) {
    // Create the `redis-stack` Handler if the client is available and connected.
    handler = await createRedisHandler({
      client,
      keyPrefix: 'prefix:',
      timeoutMs: 1000,
    });
  } else {
    // Fallback to LRU handler if Redis client is not available.
    // The application will still work, but the cache will be in memory only and not shared.
    handler = createLruHandler();
    console.log('Falling back to LRU handler because Redis client is not available.');
  }

  return {
    handlers: [handler],
  };
});

export default CacheHandler;
