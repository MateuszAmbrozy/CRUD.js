class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}
function text(value, label, max) {
  if (typeof value !== 'string' || !value.trim() || value.trim().length > max) {
    throw new HttpError(
      422,
      `${label} is required (maximum ${max} characters).`,
    );
  }
  return value.trim();
}
function cocktailInput(body = {}) {
  return {
    name: text(body.name, 'Name', 100),
    category: text(body.category, 'Category', 60),
    instruction: text(body.instruction, 'Instructions', 5000),
  };
}
function ingredientInput(body = {}) {
  if (!['true', 'false'].includes(body.isAlcohol))
    throw new HttpError(422, 'Select whether the ingredient contains alcohol.');
  return {
    name: text(body.name, 'Ingredient name', 100),
    description: text(body.description, 'Description', 1000),
    isAlcohol: body.isAlcohol === 'true',
    quantity: text(body.quantity, 'Quantity', 100),
  };
}
module.exports = { HttpError, cocktailInput, ingredientInput };
