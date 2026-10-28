const express = require('express');
const mongoose = require('mongoose');
const Cocktail = require('../models/cocktails');
const Ingredient = require('../models/ingredients');
const {
  HttpError,
  cocktailInput,
  ingredientInput,
} = require('../lib/validation');
const {
  addUpload,
  editUpload,
  saveImage,
  removeImages,
} = require('../lib/uploads');
const router = express.Router();
const route = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res)).catch(next);
for (const param of ['id', 'cocktailId', 'ingredientId'])
  router.param(param, (req, res, next, value) => {
    next(
      /^[a-f\d]{24}$/i.test(value)
        ? undefined
        : new HttpError(400, 'Invalid resource identifier.'),
    );
  });
const found = (value, label) => {
  if (!value) throw new HttpError(404, `${label} not found.`);
  return value;
};
function success(req, res, message, destination = '/') {
  req.session.message = message;
  req.session.save((error) => {
    if (error) return res.status(500).send('Unable to save the session.');
    res.redirect(303, destination);
  });
}
router.get(
  '/',
  route(async (req, res) => {
    const page = Math.max(
      1,
      Math.min(10000, Number.parseInt(req.query.page, 10) || 1),
    );
    const q =
      typeof req.query.q === 'string' ? req.query.q.trim().slice(0, 100) : '';
    const filter = q
      ? {
          name: {
            $regex: q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
            $options: 'i',
          },
        }
      : {};
    const [cocktails, total] = await Promise.all([
      Cocktail.find(filter)
        .sort({ createdAt: -1, _id: -1 })
        .skip((page - 1) * 12)
        .limit(12)
        .lean(),
      Cocktail.countDocuments(filter),
    ]);
    res.render('index', {
      title: 'Cocktail Library',
      cocktails,
      page,
      pages: Math.ceil(total / 12),
      total,
      q,
    });
  }),
);
router.get('/add', (req, res) =>
  res.render('add_cocktails', { title: 'Add cocktail' }),
);
router.post(
  '/add',
  addUpload,
  route(async (req, res) => {
    const data = cocktailInput(req.body);
    const list = req.body.ingredients;
    if (
      !Array.isArray(list) ||
      !list.length ||
      list.length > 20 ||
      list.some((item) => !item)
    )
      throw new HttpError(422, 'Provide between 1 and 20 ingredients.');
    const inputs = list.map(ingredientInput);
    for (const key of Object.keys(req.files || {}))
      if (Number(key.match(/\d+/)[0]) >= list.length)
        throw new HttpError(422, 'Image has no matching ingredient.');
    const created = [];
    try {
      const ingredients = [];
      for (const [i, input] of inputs.entries()) {
        const { quantity, ...fields } = input;
        ingredients.push({
          quantity,
          document: new Ingredient({
            ...fields,
            image: await saveImage(
              req.files?.[`ingredients[${i}][image]`]?.[0],
              created,
            ),
          }),
        });
      }
      await mongoose.connection.transaction(async (session) => {
        for (const entry of ingredients)
          await Ingredient.create([{ ...entry.document.toObject() }], {
            session,
          });
        await Cocktail.create(
          [
            {
              ...data,
              ingredients: ingredients.map(({ quantity, document }) => ({
                ingredient: document._id,
                quantity,
              })),
            },
          ],
          { session },
        );
      });
    } catch (error) {
      await removeImages(created);
      throw error;
    }
    success(req, res, 'Cocktail added.');
  }),
);
router.get(
  '/cocktails/:id/edit',
  route(async (req, res) => {
    res.render('edit_cocktail', {
      title: 'Edit cocktail',
      cocktail: found(
        await Cocktail.findById(req.params.id).lean(),
        'Cocktail',
      ),
    });
  }),
);
router.post(
  '/cocktails/:id/edit',
  route(async (req, res) => {
    const data = cocktailInput(req.body);
    found(
      await Cocktail.findByIdAndUpdate(req.params.id, data, {
        runValidators: true,
      }),
      'Cocktail',
    );
    success(req, res, 'Cocktail updated.');
  }),
);
router.post(
  '/cocktails/:id/delete',
  route(async (req, res) => {
    let images = [];
    await mongoose.connection.transaction(async (session) => {
      const cocktail = found(
        await Cocktail.findById(req.params.id).session(session),
        'Cocktail',
      );
      const ids = cocktail.ingredients.map((item) => item.ingredient);
      const shared = await Cocktail.distinct('ingredients.ingredient', {
        _id: { $ne: cocktail._id },
        'ingredients.ingredient': { $in: ids },
      }).session(session);
      const owned = ids.filter(
        (id) => !shared.some((other) => other.equals(id)),
      );
      images = (
        await Ingredient.find({ _id: { $in: owned } }).session(session)
      ).map((item) => item.image);
      await Ingredient.deleteMany({ _id: { $in: owned } }, { session });
      await Cocktail.deleteOne({ _id: cocktail._id }, { session });
    });
    await removeImages(images);
    success(req, res, 'Cocktail deleted.');
  }),
);
router.get(
  '/cocktails/:id/ingredients',
  route(async (req, res) => {
    const cocktail = found(
      await Cocktail.findById(req.params.id)
        .populate('ingredients.ingredient')
        .lean(),
      'Cocktail',
    );
    res.render('show_ingredients', { title: cocktail.name, cocktail });
  }),
);
router.post(
  '/cocktails/:cocktailId/ingredients/:ingredientId/delete',
  route(async (req, res) => {
    let image;
    await mongoose.connection.transaction(async (session) => {
      const cocktail = found(
        await Cocktail.findById(req.params.cocktailId).session(session),
        'Cocktail',
      );
      if (
        !cocktail.ingredients.some((item) =>
          item.ingredient.equals(req.params.ingredientId),
        )
      )
        throw new HttpError(
          404,
          'Ingredient does not belong to this cocktail.',
        );
      cocktail.ingredients = cocktail.ingredients.filter(
        (item) => !item.ingredient.equals(req.params.ingredientId),
      );
      await cocktail.save({ session });
      if (
        !(await Cocktail.exists({
          'ingredients.ingredient': req.params.ingredientId,
        }).session(session))
      ) {
        const ingredient = await Ingredient.findByIdAndDelete(
          req.params.ingredientId,
          { session },
        );
        image = ingredient?.image;
      }
    });
    await removeImages([image]);
    success(
      req,
      res,
      'Ingredient removed.',
      `/cocktails/${req.params.cocktailId}/ingredients`,
    );
  }),
);
router.get(
  '/update/ingredient/:id',
  route(async (req, res) => {
    const ingredient = found(
      await Ingredient.findById(req.params.id).lean(),
      'Ingredient',
    );
    const cocktail = found(
      await Cocktail.findOne({
        'ingredients.ingredient': ingredient._id,
      }).lean(),
      'Cocktail',
    );
    res.render('edit_ingredients', {
      title: 'Edit ingredient',
      ingredient,
      quantity: cocktail.ingredients.find((item) =>
        item.ingredient.equals(ingredient._id),
      ).quantity,
      cocktailId: cocktail._id,
    });
  }),
);
router.post(
  '/update/ingredient/:id',
  editUpload,
  route(async (req, res) => {
    const { quantity, ...fields } = ingredientInput(req.body);
    if (!mongoose.isObjectIdOrHexString(req.body.cocktailId))
      throw new HttpError(400, 'Invalid cocktail identifier.');
    const created = [];
    let oldImage;
    try {
      const image = await saveImage(req.file, created);
      await mongoose.connection.transaction(async (session) => {
        const cocktail = found(
          await Cocktail.findOne({
            _id: req.body.cocktailId,
            'ingredients.ingredient': req.params.id,
          }).session(session),
          'Cocktail ingredient',
        );
        const ingredient = found(
          await Ingredient.findById(req.params.id).session(session),
          'Ingredient',
        );
        oldImage = ingredient.image;
        Object.assign(ingredient, fields);
        if (image) ingredient.image = image;
        await ingredient.save({ session });
        cocktail.ingredients.find((item) =>
          item.ingredient.equals(ingredient._id),
        ).quantity = quantity;
        await cocktail.save({ session });
      });
      if (image) await removeImages([oldImage]);
    } catch (error) {
      await removeImages(created);
      throw error;
    }
    success(
      req,
      res,
      'Ingredient updated.',
      `/cocktails/${req.body.cocktailId}/ingredients`,
    );
  }),
);
router.get('/about', (req, res) =>
  res.render('about', { title: 'About the project' }),
);
router.get('/contact', (req, res) =>
  res.render('contact', { title: 'Contact' }),
);
module.exports = router;
