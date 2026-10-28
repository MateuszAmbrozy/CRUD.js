document.querySelectorAll('form[data-confirm]').forEach((form) => {
  form.addEventListener('submit', (event) => {
    if (!window.confirm(form.dataset.confirm)) event.preventDefault();
  });
});
const addButton = document.getElementById('add-ingredient-btn');
if (addButton) {
  let count = 1;
  addButton.addEventListener('click', () => {
    if (count >= 20) return;
    const section = document.getElementById('ingredients-section');
    const clone = section.firstElementChild.cloneNode(true);
    clone.querySelector('legend').textContent = `Ingredient ${count + 1}`;
    clone.querySelectorAll('input, select').forEach((input) => {
      input.name = input.name.replace('[0]', `[${count}]`);
      input.id = input.id.replace('ingredient-0-', `ingredient-${count}-`);
      if (input.tagName === 'SELECT') input.value = 'false';
      else input.value = '';
    });
    clone.querySelectorAll('label').forEach((label) => {
      label.htmlFor = label.htmlFor.replace(
        'ingredient-0-',
        `ingredient-${count}-`,
      );
    });
    section.appendChild(clone);
    count += 1;
    addButton.disabled = count >= 20;
    document.getElementById('ingredient-count').textContent =
      `${count} of 20 ingredients`;
    clone.querySelector('input').focus();
  });
}
