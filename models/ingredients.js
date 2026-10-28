const mongoose = require('mongoose');
const ingredientSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    description: { type: String, required: true, trim: true, maxlength: 1000 },
    isAlcohol: { type: Boolean, required: true },
    image: { type: String, maxlength: 255 },
  },
  { timestamps: true },
);
module.exports = mongoose.model('Ingredient', ingredientSchema);
