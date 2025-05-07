// stagingUpdates.js
const flatpickr = require('flatpickr');
const { ipcRenderer } = require('electron');

const stagingUpdates = {
  title: 'Staging Updates',
  render(container, config) {
    console.log('Rendering Staging Updates form, config:', config);
    const transConfig = config?.transactionUpdates;
    if (!transConfig || !transConfig.formNumbers || !Array.isArray(transConfig.formNumbers)) {
      console.error('transactionUpdates.formNumbers is not defined or not an array:', transConfig?.formNumbers);
      container.innerHTML = '<p class="text-red-600">Error: Form numbers not configured. Please contact support.</p>';
      return;
    }

    container.innerHTML = `
      <div class="space-y-6">
        <div>
          <label for="date" class="required">Date</label>
          <input type="text" id="date" class="border-gray-300 rounded-lg p-3 w-full" placeholder="Select date" required>
          <p id="date-error" class="text-red-500 text-sm mt-1 hidden">This field is required.</p>
        </div>
        <div>
          <label for="form-no" class="required">Form No</label>
          <div class="flex space-x-2">
            <select id="form-no" class="border-gray-300 rounded-lg p-3 w-full" required>
              <option value="">Select form number</option>
              ${transConfig.formNumbers.map(form => `<option value="${form}">${form}</option>`).join('')}
            </select>
            <button id="search-btn" class="bg-blue-500 text-white py-2 px-4 rounded-lg hover:bg-blue-600">Search</button>
          </div>
          <p id="form-no-error" class="text-red-500 text-sm mt-1 hidden">This field is required.</p>
        </div>
        <div>
          <label for="current-batch">Current Batch</label>
          <input type="text" id="current-batch" class="border-gray-300 rounded-lg p-3 w-full bg-gray-100" readonly>
        </div>
        <div>
          <label for="new-batch" class="required">New Batch</label>
          <input type="text" id="new-batch" class="border-gray-300 rounded-lg p-3 w-full" placeholder="Enter new batch number (e.g., BATCH001)" required>
          <p id="new-batch-error" class="text-red-500 text-sm mt-1 hidden">This field is required.</p>
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
          <label for="comments">Comments</label>
          <textarea id="comments" class="border-gray-300 rounded-lg p-3 w-full" rows="3"></textarea>
        </div>
      </div>
    `;

    // Initialize Flatpickr for the date field
    flatpickr('#date', {
      dateFormat: 'Y-m-d',
      defaultDate: new Date(),
      maxDate: config?.settings?.maxDate || 'today',
    });

    // Add event listener for the Search button
    const searchBtn = document.getElementById('search-btn');
    const formNoSelect = document.getElementById('form-no');
    const currentBatchInput = document.getElementById('current-batch');

    searchBtn.addEventListener('click', () => {
      const formNo = formNoSelect.value;
      if (!formNo) {
        currentBatchInput.value = '';
        alert('Please select a form number to search.');
        return;
      }

      // Fetch staging_updates data using IPC
      ipcRenderer.invoke('fetch-data', 'staging_updates').then(result => {
        if (result.success) {
          const matchingRecord = result.data
            .filter(row => row.form_no === formNo)
            .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0];
          if (matchingRecord && matchingRecord.current_batch) {
            currentBatchInput.value = matchingRecord.current_batch;
          } else {
            currentBatchInput.value = '';
            alert('No previous batch found for this form number.');
          }
        } else {
          currentBatchInput.value = '';
          alert('Error searching for batch: ' + result.message);
        }
      }).catch(err => {
        console.error('Error searching for batch:', err);
        currentBatchInput.value = '';
        alert('Error searching for batch.');
      });
    });
  },
  getData() {
    console.log('Getting form data, checking DOM elements:');
    const dateInput = document.getElementById('date');
    const formNoInput = document.getElementById('form-no');
    const currentBatchInput = document.getElementById('current-batch');
    const newBatchInput = document.getElementById('new-batch');
    const productInput = document.getElementById('product');
    const quantityInput = document.getElementById('quantity');
    const commentsInput = document.getElementById('comments');

    console.log('Date input:', dateInput);
    console.log('Form No input:', formNoInput);
    console.log('Current Batch input:', currentBatchInput);
    console.log('New Batch input:', newBatchInput);
    console.log('Product input:', productInput);
    console.log('Quantity input:', quantityInput);
    console.log('Comments input:', commentsInput);

    if (!dateInput) throw new Error('Date input not found');
    if (!formNoInput) throw new Error('Form No input not found');
    if (!currentBatchInput) throw new Error('Current Batch input not found');
    if (!newBatchInput) throw new Error('New Batch input not found');
    if (!productInput) throw new Error('Product input not found');
    if (!quantityInput) throw new Error('Quantity input not found');
    if (!commentsInput) throw new Error('Comments input not found');

    const date = dateInput.value;
    const form_no = formNoInput.value;
    const current_batch = currentBatchInput.value || null;
    const batch_id = newBatchInput.value;
    const product = productInput.value;
    const quantity = parseInt(quantityInput.value, 10);
    const comments = commentsInput.value || null;

    // Field-level validation feedback
    document.getElementById('date-error').classList.toggle('hidden', !!date);
    document.getElementById('date').classList.toggle('border-red-500', !date);
    document.getElementById('form-no-error').classList.toggle('hidden', !!form_no);
    document.getElementById('form-no').classList.toggle('border-red-500', !form_no);
    document.getElementById('new-batch-error').classList.toggle('hidden', !!batch_id);
    document.getElementById('new-batch').classList.toggle('border-red-500', !batch_id);

    return {
      data: {
        date,
        form_no,
        current_batch,
        batch_id,
        product,
        quantity,
        comments
      }
    };
  },
  validate(data) {
    return (
      data.date &&
      data.form_no &&
      data.batch_id &&
      data.product &&
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

module.exports = stagingUpdates;