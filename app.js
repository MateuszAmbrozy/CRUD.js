const express = require('express');
const session = require('express-session');
const helmet = require('helmet');
const { rateLimit } = require('express-rate-limit');
const { randomBytes, timingSafeEqual, createHash } = require('node:crypto');
const path = require('node:path');
const mongoose = require('mongoose');
const { HttpError } = require('./lib/validation');
function createApp({
  secret,
  store,
  adminPassword,
  production = false,
  trustProxy = false,
} = {}) {
  if (!secret || secret.length < 32)
    throw new Error('SESSION_SECRET must contain at least 32 characters.');
  if (production && (!store || !adminPassword || adminPassword.length < 16))
    throw new Error(
      'Production requires a session store and ADMIN_PASSWORD of at least 16 characters.',
    );
  const app = express();
  app.disable('x-powered-by');
  if (trustProxy) app.set('trust proxy', 1);
  app.set('view engine', 'ejs');
  app.set('views', path.join(__dirname, 'views'));
  app.use(
    helmet({
      strictTransportSecurity: production ? undefined : false,
      contentSecurityPolicy: {
        directives: { 'upgrade-insecure-requests': production ? [] : null },
      },
    }),
  );
  app.use('/assets', express.static(path.join(__dirname, 'public')));
  app.use(
    '/uploads',
    express.static(path.join(__dirname, 'uploads'), {
      dotfiles: 'deny',
      setHeaders(res) {
        res.set('Content-Security-Policy', "default-src 'none'");
      },
    }),
  );
  app.get('/health', (req, res) =>
    res.status(mongoose.connection.readyState === 1 ? 200 : 503).json({
      status: mongoose.connection.readyState === 1 ? 'ok' : 'unavailable',
    }),
  );
  app.use(
    rateLimit({
      windowMs: 60 * 1000,
      limit: 120,
      standardHeaders: 'draft-8',
      legacyHeaders: false,
    }),
  );
  app.use(
    express.urlencoded({ extended: false, limit: '64kb', parameterLimit: 120 }),
  );
  app.use(
    session({
      name: 'cocktail.sid',
      secret,
      store,
      resave: false,
      saveUninitialized: false,
      cookie: {
        httpOnly: true,
        sameSite: 'lax',
        secure: production,
        maxAge: 60 * 60 * 1000,
      },
    }),
  );
  app.use((req, res, next) => {
    res.set('Cache-Control', 'no-store');
    if (!req.session.csrf) req.session.csrf = randomBytes(32).toString('hex');
    res.locals.csrfToken = req.session.csrf;
    res.locals.message = req.session.message;
    delete req.session.message;
    next();
  });
  const writeLimit = rateLimit({
    windowMs: 60 * 1000,
    limit: 30,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
  });
  app.use((req, res, next) => {
    if (req.method !== 'POST') return next();
    writeLimit(req, res, () => {
      if (adminPassword) {
        const credentials = Buffer.from(
          (req.headers.authorization || '').replace(/^Basic /, ''),
          'base64',
        ).toString();
        const expected = createHash('sha256')
          .update(`admin:${adminPassword}`)
          .digest();
        const actual = createHash('sha256').update(credentials).digest();
        if (!timingSafeEqual(expected, actual)) {
          res.set(
            'WWW-Authenticate',
            'Basic realm="Cocktail editor", charset="UTF-8"',
          );
          return next(
            new HttpError(401, 'Administrator credentials are required.'),
          );
        }
      }
      if (req.query.csrf !== req.session.csrf)
        return next(
          new HttpError(
            403,
            'The form has expired. Reload the page and try again.',
          ),
        );
      next();
    });
  });
  app.use(require('./routes/routes'));
  app.use((req, res, next) => next(new HttpError(404, 'Page not found.')));
  app.use((error, req, res, next) => {
    if (res.headersSent) return next(error);
    const status =
      error.status ||
      (error.name === 'MulterError'
        ? 422
        : error.name === 'ValidationError'
          ? 422
          : 500);
    if (status >= 500) console.error('Request failed:', error.name);
    res.status(status).render('error', {
      title: `Error ${status}`,
      status,
      errorMessage:
        status >= 500
          ? 'Something went wrong. Please try again later.'
          : error.message,
    });
  });
  return app;
}
module.exports = { createApp };
