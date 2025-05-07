// transactionUpdates.js
const flatpickr = require('flatpickr');

const transactionUpdates = {
  title: 'Transaction Updates',
  render(container) {
    container.innerHTML = `
      <div class="space-y-6">
        <div>
          <label for="date" class="required">Date</label>
          <input type="text" id="date" class="border-gray-300 rounded-lg p-3 w-full" placeholder="Select date" required>
        </div>
        <div>
          <label for="form-no" class="required">Form No</label>
          <input type="text" id="form-no" class="border-gray-300 rounded-lg p-3 w-full" required>
        </div>
        <div>
          <label for="transaction-id" class="required">Transaction ID</label>
          <input type="text" id="transaction-id" class="border-gray-300 rounded-lg p-3 w-full" required>
        </div>
        <div>
          <label for="product" class="required">Product</label>
          <input type="text" id="product" class="border-gray-300 rounded-lg p-3 w-full" required>
        </div>
        <div>
          <label for="quantity" class="required">Quantity</label>
          <input type="number" id="quantity" class="border-gray-300 rounded-lg p-3 w-full" min="1" required>
        </div>
        <div>
          <label for="status" class="required">Status</label>
          <select id="status" class="border-gray-300 rounded-lg p-3 w-full" required>
            <option value="">Select status</option>
            <option value="Pending">Pending</option>
            <option value="Completed">Completed</option>
            <option value="Cancelled">Cancelled</option>
          </select>
        </div>
        <div>
          <label for="comments">Comments</label>
          <textarea id="comments" class="border-gray-300 rounded-lg p-3 w-full" rows="3"></textarea>
        </div>
      </div>
    `;

    flatpickr('#date', {
      dateFormat: 'Y-m-d',
      defaultDate: new Date(),
    });
  },
  getData() {
    const date = document.getElementById('date').value;
    const form_no = document.getElementById('form-no').value;
    const transaction_id = document.getElementById('transaction-id').value;
    const product = document.getElementById('product').value;
    const quantity = parseInt(document.getElementById('quantity').value, 10);
    const status = document.getElementById('status').value;
    const comments = document.getElementById('comments').value || null;

    return {
      data: {
        date,
        form_no,
        transaction_id,
        product,
        quantity,
        status,
        comments
      }
    };
  },
  validate(data) {
    return (
      data.date &&
      data.form_no &&
      data.transaction_id &&
      data.product &&
      Number.isInteger(data.quantity) &&
      data.quantity > 0 &&
      data.status
    );
  },
  resetDate(input) {
    flatpickr(input, {
      dateFormat: 'Y-m-d',
      defaultDate: new Date(),
    }).clear();
  }
};

module.exports = transactionUpdates;