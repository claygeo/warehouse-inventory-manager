// transferInOut.js
const flatpickr = require('flatpickr');
const { ipcRenderer } = require('electron');

const transferInOut = {
  title: 'Transfer In/Out',
  render(container, config) {
    console.log('Rendering Transfer In/Out form, config:', config);

    // Use locations and transaction types from config
    const locations = config?.transferInOut?.locations || [];
    const transactionTypes = config?.transferInOut?.transactionTypes || [];

    container.innerHTML = `
      <div class="space-y-6">
        <div>
          <label for="date" class="required">Date</label>
          <input type="text" id="date" class="border-gray-300 rounded-lg p-3 w-full" placeholder="Select date" required>
        </div>
        <div>
          <label for="location" class="required">Location</label>
          <select id="location" class="border-gray-300 rounded-lg p-3 w-full" required>
            <option value="">Select location</option>
            ${locations.map(loc => `<option value="${loc}">${loc}</option>`).join('')}
          </select>
        </div>
        <div>
          <label for="transaction-type" class="required">Transaction Type</label>
          <select id="transaction-type" class="border-gray-300 rounded-lg p-3 w-full" required>
            <option value="">Select type</option>
            ${transactionTypes.map(type => `<option value="${type}">${type}</option>`).join('')}
          </select>
        </div>
        <div>
          <label for="product" class="required">Product</label>
          <input type="text" id="product" class="border-gray-300 rounded-lg p-3 w-full" placeholder="Enter product name" required>
        </div>
        <div>
          <label for="quantity" class="required">Quantity</label>
          <input type="number" id="quantity" class="border-gray-300 rounded-lg p-3 w-full" min="1" required>
        </div>
        <div>
          <label for="storage-location">Storage Location</label>
          <input type="text" id="storage-location" class="border-gray-300 rounded-lg p-3 w-full">
        </div>
        <div>
          <label for="comments">Comments</label>
          <textarea id="comments" class="border-gray-300 rounded-lg p-3 w-full" rows="3"></textarea>
        </div>
      </div>
    `;

    console.log('After rendering, checking DOM elements:');
    console.log('Date input exists:', !!document.getElementById('date'));
    console.log('Location input exists:', !!document.getElementById('location'));
    console.log('Product input exists:', !!document.getElementById('product'));

    flatpickr('#date', {
      dateFormat: 'Y-m-d',
      defaultDate: new Date(),
      maxDate: config?.settings?.maxDate || 'today',
    });
  },
  getData() {
    console.log('Getting form data, checking DOM elements:');
    const dateInput = document.getElementById('date');
    const locationInput = document.getElementById('location');
    const transactionTypeInput = document.getElementById('transaction-type');
    const productInput = document.getElementById('product');
    const quantityInput = document.getElementById('quantity');
    const storageLocationInput = document.getElementById('storage-location');
    const commentsInput = document.getElementById('comments');

    console.log('Date input:', dateInput);
    console.log('Location input:', locationInput);
    console.log('Transaction Type input:', transactionTypeInput);
    console.log('Product input:', productInput);
    console.log('Quantity input:', quantityInput);
    console.log('Storage Location input:', storageLocationInput);
    console.log('Comments input:', commentsInput);

    if (!dateInput) throw new Error('Date input not found');
    if (!locationInput) throw new Error('Location input not found');
    if (!transactionTypeInput) throw new Error('Transaction Type input not found');
    if (!productInput) throw new Error('Product input not found');
    if (!quantityInput) throw new Error('Quantity input not found');
    if (!storageLocationInput) throw new Error('Storage Location input not found');
    if (!commentsInput) throw new Error('Comments input not found');

    const date = dateInput.value;
    const location = locationInput.value;
    const transaction_type = transactionTypeInput.value;
    const product = productInput.value.trim(); // Trim whitespace
    const quantity = parseInt(quantityInput.value, 10);
    const storage_location = storageLocationInput.value || null;
    const comments = commentsInput.value || null;

    return {
      data: {
        date,
        location,
        transaction_type,
        product,
        quantity,
        storage_location,
        comments
      }
    };
  },
  validate(data) {
    return (
      data.date &&
      data.location &&
      data.transaction_type &&
      data.product && // Ensure product is not empty
      Number.isInteger(data.quantity) &&
      data.quantity > 0
    );
  },
  resetDate(input) {
    flatpickr(input, {
      dateFormat: 'Y-m-d',
      defaultDate: new Date(),
      maxDate: 'today',
    }).clear();
  }
};

module.exports = transferInOut;