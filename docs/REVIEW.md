# Code Review

## Critical issues

- **MongoDB credentials and the session secret were hardcoded.** Removed hardcoded credentials and moved configuration to environment variables. Production requires strong secrets. Previously exposed credentials must be revoked in the MongoDB dashboard; removing a file from the repository does not remove its history.
- **Deletion used GET requests, and CSRF protection was missing.** Write operations now use POST and a session-bound token. Added administrator authentication, optional locally and required in production.
- **Uploads lacked restrictions.** Added limits on file size, file count, and form fields, MIME type and file signature checks, safe filenames, and image cleanup. Updated Multer.

## Functional bugs and data integrity

- `npm start` pointed to a nonexistent entry point. It now runs `main.js`; the application can also be created independently in tests.
- Cocktail creation used `.single('image')` while reading `req.files` from multiple fields. Added explicitly allowed upload fields for up to 20 ingredients.
- Input validation was missing, and form data was parsed incorrectly. Added constraints on lengths, types, ingredient lists, and boolean values.
- Writes involving multiple documents could leave partial data. Added MongoDB transactions and a test verifying rollback after a failure.
- Updates did not check whether resources existed or whether an ingredient belonged to the specified cocktail. Added 400/404 responses and recipe association checks.
- Replacing and deleting images left files behind. Added cleanup when images are removed or replaced and after failed writes.
- The server started even when the database connection failed. It now starts after connecting; added port validation, a health endpoint, and shutdown handling for SIGTERM/SIGINT.

## Portfolio quality

- Added `.gitignore`; removed dependencies, secrets, and uploaded files from the Git index while preserving local files.
- Updated dependencies and the lockfile, and removed the unused direct `mongodb` dependency.
- Added integration tests using real transactions against a test MongoDB instance, CI, Dependabot, and code formatting.
- Replaced CDN UI dependencies with local stylesheets and a browser script. Fixed HTML structure, form labels, empty states, and accessible action names for screen readers.
- Added search with escaped regular expression characters, pagination, and a responsive layout.
- Updated the documentation to describe the actual HTML application and ObjectId identifiers instead of a nonexistent REST API and UUIDs.
- Added local replica set configuration and a sample data script that preserves existing records.

## Known limitations

- A single administrator account uses HTTP Basic authentication; production requires HTTPS. This is not a multi-user application.
- Transactions require a replica set; this requirement is documented in the README and Compose configuration.
- Files and MongoDB do not share a transaction. A process failure during a write may require manual file cleanup.
- Existing records have not been migrated, and Git history has not been rewritten. Legacy shared ingredients remain shared when edited.
- Existing local uploads are not automatically deleted. A fresh clone requires new images or restoration from a backup.

## Update references

- [Multer releases and security fixes](https://github.com/expressjs/multer/releases).
- [GitHub Actions checkout releases](https://github.com/actions/checkout/releases).
- [GitHub Actions setup-node releases](https://github.com/actions/setup-node/releases).
