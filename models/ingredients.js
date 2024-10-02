const mongoose = require('mongoose');

const ingredientSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    description: {
        type: String,
        required: true
    },
    isAlcohol: {
        type: Boolean,
        required: true
    },
    image: {
        type: String,  // URL lub ścieżka do zdjęcia
        required: false
    }
});

module.exports = mongoose.model('Ingredient', ingredientSchema);