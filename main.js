require('dotenv').config();
const mongoose = require('mongoose');
const MongoStore = require('connect-mongo');
const { createApp } = require('./app');
async function start() {
  if (!process.env.DB_URI)
    throw new Error('DB_URI is required. See .env.example.');
  const port = Number(process.env.PORT || 4000);
  if (!Number.isInteger(port) || port < 1 || port > 65535)
    throw new Error('PORT must be between 1 and 65535.');
  await mongoose.connect(process.env.DB_URI, {
    serverSelectionTimeoutMS: 5000,
  });
  const store = MongoStore.create({
    client: mongoose.connection.getClient(),
    collectionName: 'sessions',
  });
  const app = createApp({
    secret: process.env.SESSION_SECRET,
    store,
    adminPassword: process.env.ADMIN_PASSWORD,
    production: process.env.NODE_ENV === 'production',
    trustProxy: process.env.TRUST_PROXY === '1',
  });
  const server = app.listen(port, process.env.HOST || '127.0.0.1', () =>
    console.log(`Cocktail Library listening on port ${port}`),
  );
  server.on('error', async (error) => {
    console.error('Server failed:', error.code);
    await mongoose.disconnect();
    process.exitCode = 1;
  });
  for (const signal of ['SIGINT', 'SIGTERM'])
    process.once(signal, () => {
      const timeout = setTimeout(() => process.exit(1), 10000).unref();
      server.close(async () => {
        await mongoose.disconnect();
        clearTimeout(timeout);
        process.exitCode = 0;
      });
    });
}
if (require.main === module)
  start().catch(async (error) => {
    console.error(
      'Startup failed:',
      ['MongooseServerSelectionError', 'MongoServerError'].includes(error.name)
        ? 'Check MongoDB availability and credentials.'
        : error.message,
    );
    await mongoose.disconnect();
    process.exitCode = 1;
  });
module.exports = { start };
