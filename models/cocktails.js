const mongoose = require('mongoose');
const Ingredient = require('./ingredients');

const cocktailSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    category: {
        type: String,
        required: true
    },
    instruction: {
        type: String,
        required: true
    },
    ingredients: [{
        ingredient: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Ingredient',
            required: true
        },
        quantity: {
            type: String,  
            required: true
        }
    }]

});
module.exports = mongoose.model('Cocktail', cocktailSchema);