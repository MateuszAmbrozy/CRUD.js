const { test, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryReplSet } = require('mongodb-memory-server');
const fs = require('node:fs/promises');
const { createApp } = require('../app');
const Cocktail = require('../models/cocktails');
const Ingredient = require('../models/ingredients');
const { directory } = require('../lib/uploads');
const { ingredientInput } = require('../lib/validation');
let database;
const app = createApp({ secret: 'test-secret-with-more-than-32-characters' });
let agent;
let csrf;
const valid = {
  name: 'Mojito',
  category: 'Classic',
  instruction: 'Mix and serve.',
};
const ingredient = {
  name: 'Lime',
  description: 'Fresh lime',
  isAlcohol: 'false',
  quantity: '2 slices',
};
const png = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=',
  'base64',
);
before(async () => {
  database = await MongoMemoryReplSet.create({
    replSet: { count: 1 },
    binary: { version: '7.0.14' },
  });
  await mongoose.connect(database.getUri());
});
after(async () => {
  await mongoose.disconnect();
  if (database) await database.stop();
});
beforeEach(async () => {
  await Promise.all([Cocktail.deleteMany({}), Ingredient.deleteMany({})]);
  agent = request.agent(app);
  const page = await agent.get('/add').expect(200);
  csrf = page.text.match(/csrf=([a-f0-9]+)/)[1];
});
function add(data = valid, item = ingredient, file) {
  let req = agent.post(`/add?csrf=${csrf}`);
  for (const [key, value] of Object.entries(data)) req = req.field(key, value);
  for (const [key, value] of Object.entries(item))
    req = req.field(`ingredients[0][${key}]`, value);
  if (file)
    req = req.attach('ingredients[0][image]', file, {
      filename: 'lime.png',
      contentType: 'image/png',
    });
  return req;
}
test('CRUD persists ingredients, quantities and images and removes files on delete', async () => {
  await add(valid, ingredient, png).expect(303);
  let cocktail = await Cocktail.findOne();
  let item = await Ingredient.findOne();
  const filename = item.image;
  await fs.access(`${directory}/${filename}`);
  await agent
    .get('/')
    .expect(200)
    .expect(/Mojito/);
  await agent
    .get(`/cocktails/${cocktail._id}/ingredients`)
    .expect(200)
    .expect(/2 slices/);
  await agent
    .get(`/update/ingredient/${item._id}`)
    .expect(200)
    .expect(/Fresh lime/);
  await agent
    .post(`/cocktails/${cocktail._id}/edit?csrf=${csrf}`)
    .type('form')
    .send({ ...valid, name: 'Updated Mojito' })
    .expect(303);
  await agent
    .post(`/update/ingredient/${item._id}?csrf=${csrf}`)
    .field('cocktailId', String(cocktail._id))
    .field('name', 'Lemon')
    .field('description', 'Fresh lemon')
    .field('isAlcohol', 'false')
    .field('quantity', '30 ml')
    .expect(303);
  cocktail = await Cocktail.findById(cocktail._id);
  assert.equal(cocktail.name, 'Updated Mojito');
  assert.equal(cocktail.ingredients[0].quantity, '30 ml');
  assert.equal((await Ingredient.findById(item._id)).image, filename);
  await agent
    .post(`/cocktails/${cocktail._id}/delete?csrf=${csrf}`)
    .expect(303);
  assert.equal(await Cocktail.countDocuments(), 0);
  assert.equal(await Ingredient.countDocuments(), 0);
  await assert.rejects(fs.access(`${directory}/${filename}`));
});
test('multiple multipart ingredients are parsed and saved', async () => {
  let req = add();
  for (const [key, value] of Object.entries({
    ...ingredient,
    name: 'Rum',
    isAlcohol: 'true',
  }))
    req = req.field(`ingredients[1][${key}]`, value);
  await req.expect(303);
  assert.equal((await Cocktail.findOne()).ingredients.length, 2);
  assert.equal(await Ingredient.countDocuments(), 2);
});
test('invalid fields, fake images and unsupported uploads are rejected without database changes', async () => {
  await add({ ...valid, name: ' ' }).expect(422);
  await add(valid, { ...ingredient, isAlcohol: 'yes' }).expect(422);
  await add(valid, ingredient, Buffer.from('<script>alert(1)</script>')).expect(
    422,
  );
  await agent
    .post(`/add?csrf=${csrf}`)
    .attach('unexpected', png, 'test.png')
    .expect(422);
  assert.equal(await Cocktail.countDocuments(), 0);
  assert.equal(await Ingredient.countDocuments(), 0);
});
test('GET cannot delete, invalid IDs return 400 and missing resources return 404', async () => {
  await add().expect(303);
  const cocktail = await Cocktail.findOne();
  await agent.get(`/cocktails/${cocktail._id}/delete`).expect(404);
  assert.equal(await Cocktail.countDocuments(), 1);
  await agent.get('/cocktails/invalid/edit').expect(400);
  await agent.get('/cocktails/000000000000000000000000/edit').expect(404);
  await agent
    .post('/cocktails/000000000000000000000000/edit?csrf=' + csrf)
    .type('form')
    .send(valid)
    .expect(404);
});
test('CSRF, write authentication, escaping and security headers', async () => {
  await agent.post('/add').expect(403);
  await add({ ...valid, name: '<script>alert(1)</script>' }).expect(303);
  const page = await agent.get('/').expect(200);
  assert.ok(page.text.includes('&lt;script&gt;'));
  assert.ok(page.headers['content-security-policy']);
  assert.equal(page.headers['x-powered-by'], undefined);
  const secured = request.agent(
    createApp({
      secret: 'another-test-secret-with-32-characters',
      adminPassword: 'strong-admin-password',
    }),
  );
  const form = await secured.get('/add');
  const token = form.text.match(/csrf=([a-f0-9]+)/)[1];
  await secured.post('/add?csrf=' + token).expect(401);
  await secured
    .post('/add?csrf=' + token)
    .auth('admin', 'strong-admin-password')
    .expect(422);
});
test('ingredient deletion checks membership and does not delete unrelated data', async () => {
  await add().expect(303);
  const first = await Cocktail.findOne();
  const firstItem = first.ingredients[0].ingredient;
  await add({ ...valid, name: 'Other' }).expect(303);
  const other = await Cocktail.findOne({ name: 'Other' });
  await agent
    .post(
      `/cocktails/${other._id}/ingredients/${firstItem}/delete?csrf=${csrf}`,
    )
    .expect(404);
  assert.ok(await Ingredient.findById(firstItem));
  await agent
    .post(
      `/cocktails/${first._id}/ingredients/${firstItem}/delete?csrf=${csrf}`,
    )
    .expect(303);
  assert.equal((await Cocktail.findById(first._id)).ingredients.length, 0);
  assert.equal(await Ingredient.countDocuments(), 1);
});
test('failed multi-document writes roll back ingredients and uploaded files', async () => {
  const original = Cocktail.create;
  const beforeFiles = await fs.readdir(directory);
  Cocktail.create = async () => {
    throw new Error('Simulated database failure');
  };
  try {
    await add(valid, ingredient, png).expect(500);
  } finally {
    Cocktail.create = original;
  }
  assert.equal(await Ingredient.countDocuments(), 0);
  assert.deepEqual(await fs.readdir(directory), beforeFiles);
});
test('search treats regex characters literally; static pages and readiness work', async () => {
  await add().expect(303);
  await agent
    .get('/?q=.*')
    .expect(200)
    .expect(/No matching recipes/);
  await agent
    .get('/?q=moj')
    .expect(200)
    .expect(/Mojito/);
  for (const path of [
    '/about',
    '/contact',
    '/assets/styles.css',
    '/assets/app.js',
    '/health',
  ])
    await agent.get(path).expect(200);
});
test('server configuration and validation fail early', () => {
  assert.throws(() => createApp({ secret: 'short' }));
  assert.throws(() => createApp({ secret: 'a'.repeat(32), production: true }));
  assert.throws(() => ingredientInput({ ...ingredient, quantity: '' }));
});
