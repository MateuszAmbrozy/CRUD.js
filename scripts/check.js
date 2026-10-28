const { readdirSync, readFileSync } = require('node:fs');
const { join } = require('node:path');
const { Script } = require('node:vm');
const ejs = require('ejs');
for (const directory of [
  '.',
  'lib',
  'models',
  'routes',
  'scripts',
  'test',
  'public',
]) {
  for (const entry of readdirSync(directory)) {
    if (entry.endsWith('.js'))
      new Script(readFileSync(join(directory, entry), 'utf8'), {
        filename: join(directory, entry),
      });
  }
}
for (const directory of ['views', 'views/layout']) {
  for (const entry of readdirSync(directory)) {
    if (entry.endsWith('.ejs'))
      ejs.compile(readFileSync(join(directory, entry), 'utf8'), {
        filename: join(directory, entry),
      });
  }
}
console.log('JavaScript and EJS syntax checks passed.');
