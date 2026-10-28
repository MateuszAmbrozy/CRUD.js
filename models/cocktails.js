const mongoose = require('mongoose');
const cocktailSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    category: { type: String, required: true, trim: true, maxlength: 60 },
    instruction: { type: String, required: true, trim: true, maxlength: 5000 },
    ingredients: [
      {
        ingredient: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Ingredient',
          required: true,
        },
        quantity: { type: String, required: true, trim: true, maxlength: 100 },
      },
    ],
  },
  { timestamps: true },
);
cocktailSchema.index({ createdAt: -1, _id: -1 });
module.exports = mongoose.model('Cocktail', cocktailSchema);
