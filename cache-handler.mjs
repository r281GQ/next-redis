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
  logger.info('creation')

  try {
    if (process.env.REDIS_AUTH_STRING && (PHASE_PRODUCTION_BUILD !== process.env.NEXT_PHASE)) {

      // Create a Redis client.
      client = createClient({
        url: `redis://:${process.env.REDIS_AUTH_STRING}@${address}:6379`
      });

      // Redis won't work without error handling. https://github.com/redis/node-redis?tab=readme-ov-file#events
      client.on('error', (error) => {
        // Use logging with caution in production. Redis will flood your logs. Hide it behind a flag.
        logger.error('Redis client error:', error);
      });
    }
  } catch (error) {
    logger.warn('Failed to create Redis client:', error);
  }


  if (client) {
    try {
      logger.info('Connecting Redis client...');

      // Wait for the client to connect.
      // Caveat: This will block the server from starting until the client is connected.
      // And there is no timeout. Make your own timeout if needed.
      await client.connect();
      logger.info('Redis client connected.');
    } catch (error) {
      logger.warn('Failed to connect Redis client:', error);

      logger.warn('Disconnecting the Redis client...');
      // Try to disconnect the client to stop it from reconnecting.
      client
        .disconnect()
        .then(() => {
          logger.info('Redis client disconnected.');
        })
        .catch(() => {
          logger.warn('Failed to quit the Redis client after failing to connect.');
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
    console.warn('Falling back to LRU handler because Redis client is not available.');
  }

  return {
    handlers: [handler],
  };
});

export default CacheHandler;
