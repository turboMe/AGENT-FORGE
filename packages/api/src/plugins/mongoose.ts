import fp from 'fastify-plugin';
import mongoose from 'mongoose';
import type { FastifyInstance } from 'fastify';

/**
 * Fastify plugin to manage Mongoose MongoDB connection
 */
export const mongoosePlugin = fp(async (app: FastifyInstance) => {
  const uri = process.env['MONGODB_URI'];
  const dbName = process.env['MONGODB_DB_NAME'] || 'agentforge';

  if (!uri) {
    app.log.warn('MONGODB_URI is not set. Database connection skipped.');
    return;
  }

  try {
    mongoose.set('strictQuery', false);
    await mongoose.connect(uri, { dbName });
    app.log.info({ dbName }, 'Connected to MongoDB via Mongoose');

    // Handle graceful shutdown
    app.addHook('onClose', async () => {
      app.log.info('Closing MongoDB connection...');
      await mongoose.disconnect();
    });
  } catch (error) {
    app.log.error(error, 'Failed to connect to MongoDB');
    throw error;
  }
});
