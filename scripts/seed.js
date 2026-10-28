require('dotenv').config();
const mongoose = require('mongoose');
const Cocktail = require('../models/cocktails');
const Ingredient = require('../models/ingredients');
async function seed() {
  if (!process.env.DB_URI) throw new Error('DB_URI is required.');
  await mongoose.connect(process.env.DB_URI, {
    serverSelectionTimeoutMS: 5000,
  });
  await mongoose.connection.transaction(async (session) => {
    if (await Cocktail.exists({}).session(session))
      throw new Error(
        'Seed requires an empty cocktail collection. Existing recipes were preserved.',
      );
    for (const recipe of [
      {
        name: 'Mojito',
        category: 'Classic',
        instruction:
          'Gently muddle lime and mint with sugar. Add rum and crushed ice, top with soda, then stir.',
        ingredients: [
          ['White rum', 'A light rum', true, '50 ml'],
          ['Lime', 'Fresh lime wedges', false, 'Half a lime'],
          ['Mint', 'Fresh mint leaves', false, '8 leaves'],
          ['Sugar', 'Fine white sugar', false, '2 tsp'],
          ['Soda water', 'Chilled sparkling water', false, '100 ml'],
        ],
      },
      {
        name: 'Citrus Spritz',
        category: 'Alcohol free',
        instruction:
          'Fill a glass with ice. Add orange and lemon juice, top with sparkling water and stir.',
        ingredients: [
          ['Orange juice', 'Freshly squeezed orange juice', false, '100 ml'],
          ['Lemon juice', 'Fresh lemon juice', false, '20 ml'],
          ['Sparkling water', 'Chilled sparkling water', false, '100 ml'],
        ],
      },
      {
        name: 'Daiquiri',
        category: 'Classic',
        instruction:
          'Shake all ingredients with ice. Strain into a chilled coupe glass.',
        ingredients: [
          ['White rum', 'A light rum', true, '60 ml'],
          ['Lime juice', 'Fresh lime juice', false, '25 ml'],
          ['Sugar syrup', 'Equal parts sugar and water', false, '15 ml'],
        ],
      },
    ]) {
      const entries = [];
      for (const [
        name,
        description,
        isAlcohol,
        quantity,
      ] of recipe.ingredients) {
        const [ingredient] = await Ingredient.create(
          [{ name, description, isAlcohol }],
          { session },
        );
        entries.push({ ingredient: ingredient._id, quantity });
      }
      await Cocktail.create([{ ...recipe, ingredients: entries }], { session });
    }
  });
  console.log('Three sample recipes added.');
}
seed()
  .catch((error) => {
    console.error(
      'Seed failed:',
      error.name === 'MongooseServerSelectionError'
        ? 'Check database connectivity.'
        : error.message,
    );
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
