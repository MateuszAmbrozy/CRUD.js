# Cocktail Library

A portfolio application by **Mateusz Ambroży** for managing cocktail recipes and their ingredients. Built with Node.js, Express, EJS, and MongoDB. The interface is in English.

## Features

- Create, view, edit, and delete cocktails and their ingredients.
- Quantities with units (`45 ml`, `2 slices`), alcohol labels, and optional photos.
- Search by name, pagination with 12 recipes per page, and a responsive interface.
- Input validation, MongoDB transactions, error handling, and image cleanup.
- CSRF protection, request limits, Helmet security headers, and sessions stored in MongoDB.
- Password protection for write operations; an administrator password is required in production.
- Integration tests with an isolated replica set and CI on Node.js 22 and 24.

This is a server-rendered application using HTML forms. It does not expose a JSON REST API. Resource identifiers are MongoDB ObjectIds.

## Local setup

Requirements: **Node.js 22+**, npm, and a MongoDB replica set (MongoDB Atlas or a local instance using Docker Compose). Transactions do not work with a standalone MongoDB instance without a replica set.

```bash
npm ci
cp .env.example .env
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

Paste the generated value into `.env` as `SESSION_SECRET`. Set `DB_URI` to your database connection string, or start the local database:

```bash
docker compose up -d --wait
npm run seed
npm run dev
```

Open **http://127.0.0.1:4000**. Seeding is optional: it adds three sample recipes only when the cocktail collection is empty and does not delete existing data. The MongoDB Compose service is intended for local development, uses a persistent volume, and exposes its port only to the local machine.

If you use Atlas, create a database user with access limited to this application's database. Do not use a cluster administrator account.

## Configuration

| Variable         | Description                                                                    |
| ---------------- | ------------------------------------------------------------------------------ |
| `DB_URI`         | Connection string for a dedicated MongoDB replica set database; required       |
| `SESSION_SECRET` | Random session secret of at least 32 characters; required                      |
| `PORT`           | HTTP port; defaults to `4000`                                                  |
| `HOST`           | Listen address; defaults to `127.0.0.1`; use `0.0.0.0` in a container          |
| `NODE_ENV`       | `development` or `production`                                                  |
| `ADMIN_PASSWORD` | HTTP Basic password for the `admin` user; at least 16 characters in production |
| `TRUST_PROXY`    | Set to `1` only behind one trusted reverse proxy; defaults to `0`              |

Locally, recipes can be edited without signing in when `ADMIN_PASSWORD` is unset. Do not expose this configuration publicly. When a password is configured, the browser prompts for the username `admin` and the password when you perform a write operation.

Production requires HTTPS, a correctly configured reverse proxy, and `NODE_ENV=production`. The session cookie then uses the `Secure` flag. Restrict database access at the network level. Do not log the `Authorization` header or CSRF form parameters in proxy logs. Provide persistent storage for `uploads/` and backups of both the database and images. Sessions expire after one hour; session records have a TTL in MongoDB.

## Commands

```bash
npm start             # Start the server
npm run dev           # Start the server with automatic restarts
npm run seed          # Add sample data to an empty cocktail collection
npm run check         # Check JavaScript and EJS syntax
npm run format:check  # Check source file formatting
npm test              # Run integration tests
npm audit             # Audit all dependencies
```

The first test run downloads MongoDB 7.0.14. Tests create their own replica set on a random port, do not read `.env`, and do not use your database. They require network access for the initial download and permission to open local ports.

## Project structure

```text
app.js              Express configuration and middleware; does not start the server
main.js             Environment configuration, database connection, and server lifecycle
routes/routes.js    HTML routes, CRUD operations, and transactions
models/             Mongoose schemas, constraints, and index
lib/                Validation and image handling
views/              EJS templates and shared layout
public/             Local stylesheets and browser scripts
scripts/            Syntax checks and sample data
test/               Integration tests
```

A cocktail has a name, category, instructions, and ingredient references with quantities. An ingredient has a name, description, alcohol flag, and optional image filename. Both models include timestamps. Removing an ingredient checks its association with the cocktail. Deleting a cocktail preserves ingredients shared by other cocktails in legacy data.

## Routes

| Method     | Route                                                     | Purpose                                                              |
| ---------- | --------------------------------------------------------- | -------------------------------------------------------------------- |
| GET        | `/`                                                       | List recipes; accepts `q` and `page` parameters                      |
| GET / POST | `/add`                                                    | Display the form / create a cocktail and its ingredients             |
| GET / POST | `/cocktails/:id/edit`                                     | Display the form / update a cocktail                                 |
| POST       | `/cocktails/:id/delete`                                   | Delete a cocktail                                                    |
| GET        | `/cocktails/:id/ingredients`                              | View a recipe and its ingredients                                    |
| GET / POST | `/update/ingredient/:id`                                  | Display the form / update an ingredient and its quantity             |
| POST       | `/cocktails/:cocktailId/ingredients/:ingredientId/delete` | Remove an ingredient from a recipe                                   |
| GET        | `/about`, `/contact`                                      | Project information and contact details                              |
| GET        | `/health`                                                 | JSON response: `200` when the database is connected, otherwise `503` |

POST forms include a session-bound CSRF token as a URL parameter. The token is checked before multipart processing. Deletion through GET is disabled. Successful writes redirect with status `303`. Invalid identifiers return `400`, missing resources `404`, invalid input or uploads `422`, missing credentials `401`, and invalid CSRF tokens `403`.

Images are limited to 20 per cocktail and 2 MB each. PNG, JPEG, and WebP are accepted; the server checks the MIME type and file signature, generates a random filename, and rejects other formats. Signature checking is not full image decoding or antivirus scanning. Files are saved after validation and cleaned up after a failed transaction. The database and filesystem do not share a transaction: a process or disk failure may leave an orphaned image. Cleanup failures are logged.

## Review findings and limitations

See [docs/REVIEW.md](docs/REVIEW.md) for the identified issues and changes.

The project uses a single editor account, with no user registration or permissions per recipe. Images are public. Substring search is suitable for a small portfolio collection; a larger database would require a search index. Invalid form submissions display an error page; file input values are not restored in the browser.

**Rotate the previously exposed MongoDB password before deploying publicly.** Secrets and uploaded images are excluded from the current Git index, but older commits may still contain them. Git history has not been rewritten. Existing local `.env` and `uploads/` files have been preserved.
