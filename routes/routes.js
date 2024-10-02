const express = require('express');
const router = express.Router();
const Cocktail = require('../models/cocktails');
const Ingredient = require('../models/ingredients');
const multer = require('multer');

// Image upload configuration
var storage = multer.diskStorage({
    destination: function(req, file, cb){
        cb(null, './uploads');
    },
    filename: function(req, file, cb){
        cb(null, file.fieldname+"_"+Date.now()+"_"+file.originalname);
    },
});

var upload = multer({
    storage: storage
}).single('image');

// Home page route
router.get('/', async (req, res) => {
    try {
        const cocktails = await Cocktail.find();
        res.render('index', { title: 'Home page', cocktails });
    } catch (error) {
        console.error(error);
        res.status(500).send('Server error');
    }
});

// Add cocktail routes
router.get('/add', (req, res) => {
    res.render('add_cocktails', { title: "Add Cocktails" });
});

router.post('/add', upload, async (req, res) => {
    try {
        const { name, category, instruction } = req.body;
        const ingredients = Array.isArray(req.body.ingredients) ? req.body.ingredients : [req.body.ingredients];

        const newCocktail = new Cocktail({
            name,
            category,
            instruction,
            ingredients: [] 
        });

        for (let i = 0; i < ingredients.length; i++) {
            const ingredientData = ingredients[i];
            const imageKey = `ingredients[${i}][image]`;
            const file = req.files.find(file => file.fieldname === imageKey); 
            const imageFilename = file ? file.filename : null;

            const newIngredient = new Ingredient({
                name: ingredientData.name,
                description: ingredientData.description,
                isAlcohol: ingredientData.isAlcohol === 'true',
                image: imageFilename
            });

            await newIngredient.save();

            newCocktail.ingredients.push({ 
                ingredient: newIngredient._id, 
                quantity: ingredientData.quantity 
            });
        }

        await newCocktail.save();

        req.session.message = {
            type: 'success',
            message: 'Cocktail added successfully!'
        };
        console.log(req.body);

        res.redirect('/');
    } catch (error) {
        console.error(error); 
        res.status(500).send('Server error');
    }
});

// Edit cocktail routes
router.get('/cocktails/:id/edit', async (req, res) => {
    try {
        const cocktail = await Cocktail.findById(req.params.id);
        
        if (!cocktail) {
            return res.status(404).send('Cocktail not found');
        }
        
        res.render('edit_cocktail', {
            title: "Edit Cocktail",
            cocktail: cocktail
        });
    } catch (error) {
        console.error(error);
        res.status(500).send('Server error');
    }
});

router.post('/cocktails/:id/edit', upload, async (req, res) => {
    try {
        const { name, category, instruction } = req.body;

        await Cocktail.findByIdAndUpdate(req.params.id, {
            name,
            category,
            instruction
        });

        req.session.message = {
            type: 'success',
            message: 'Cocktail updated successfully!'
        };

        res.redirect('/');
    } catch (error) {
        console.error(error);
        res.status(500).send('Server error');
    }
});

// Delete cocktail and its ingredients
router.get('/cocktails/:id/delete', async (req, res) => {
    try {
        const cocktailId = req.params.id;
        const cocktail = await Cocktail.findById(cocktailId);

        if (!cocktail) {
            return res.status(404).send('Cocktail not found');
        }

        // Delete the associated ingredients
        for (const ingredientObj of cocktail.ingredients) {
            await Ingredient.findByIdAndDelete(ingredientObj.ingredient);
        }

        // Delete the cocktail itself
        await Cocktail.findByIdAndDelete(cocktailId);

        req.session.message = {
            type: 'success',
            message: 'Cocktail and its ingredients deleted successfully!'
        };

        res.redirect('/');
    } catch (error) {
        console.error(error);
        res.status(500).send('Server error');
    }
});

// Delete individual ingredient from cocktail
router.get('/cocktails/:cocktailId/ingredients/:ingredientId/delete', async (req, res) => {
    try {
        const { cocktailId, ingredientId } = req.params;

        const cocktail = await Cocktail.findById(cocktailId);
        if (!cocktail) {
            return res.status(404).send('Cocktail not found');
        }

        cocktail.ingredients = cocktail.ingredients.filter(ingredientObj => ingredientObj.ingredient.toString() !== ingredientId);
        await cocktail.save();
        await Ingredient.findByIdAndDelete(ingredientId);

        req.session.message = {
            type: 'success',
            message: 'Ingredient deleted successfully!'
        };

        res.redirect(`/cocktails/${cocktailId}/ingredients`);
    } catch (error) {
        console.error(error);
        res.status(500).send('Server error');
    }
});

// Fetch one ingredient for editing
router.get('/update/ingredient/:id', async (req, res) => {
    try {
        const ingredientId = req.params.id;
        const ingredient = await Ingredient.findById(ingredientId);
        const cocktail = await Cocktail.findOne({ 'ingredients.ingredient': ingredientId });

        if (!ingredient) {
            return res.status(404).send('Ingredient not found');
        }

        if (!cocktail) {
            return res.status(404).send('Cocktail not found');
        }

        const ingredientObj = cocktail.ingredients.find(obj => obj.ingredient.toString() === ingredientId);
        const quantity = ingredientObj ? ingredientObj.quantity : '';

        res.render('edit_ingredients', {
            title: `Edit Ingredient: ${ingredient.name}`,
            ingredient,
            quantity,
            cocktailId: cocktail._id
        });
    } catch (error) {
        console.error(error);
        res.status(500).send('Server error');
    }
});

// Fetch ingredients of a specific cocktail
router.get('/cocktails/:id/ingredients', async (req, res) => {
    try {
        const cocktail = await Cocktail.findById(req.params.id).populate('ingredients.ingredient');
        if (!cocktail) {
            return res.status(404).send('Cocktail not found');
        }

        res.render('show_ingredients', {
            cocktail,
            title: `Ingredients for ${cocktail.name}`
        });
    } catch (error) {
        console.error(error);
        res.status(500).send('Server error');
    }
});

router.post('/update/ingredient/:id', upload, async (req, res) => {
    try {
        const ingredientId = req.params.id;
        const { cocktailId, name, description, isAlcohol, quantity } = req.body;

        // Find the ingredient by ID
        const ingredient = await Ingredient.findById(ingredientId);
        if (!ingredient) {
            return res.status(404).send('Ingredient not found');
        }

        // Update ingredient details
        ingredient.name = name;
        ingredient.description = description;
        ingredient.isAlcohol = isAlcohol === 'true';

        // Update image if provided
        if (req.file) {
            ingredient.image = req.file.filename;
        }

        await ingredient.save();

        // Update the quantity in the Cocktail model
        const cocktail = await Cocktail.findOne({ 'ingredients.ingredient': ingredientId });
        if (cocktail) {
            const ingredientObj = cocktail.ingredients.find(obj => obj.ingredient.toString() === ingredientId);
            if (ingredientObj) {
                ingredientObj.quantity = quantity;
                await cocktail.save();
            }
        }

        req.session.message = {
            type: 'success',
            message: 'Ingredient and quantity updated successfully!'
        };

        // Redirect back to the cocktail's ingredients page
        res.redirect(`/cocktails/${cocktailId}/ingredients`);
    } catch (error) {
        console.error(error);
        res.status(500).send('Server error');
    }
});

router.get('/about', (req, res) => {
    res.render('about', {title: "About"});
});

router.get('/contact', (req, res) => {
    res.render('contact', {title: "Contact"});
});

module.exports = router;
