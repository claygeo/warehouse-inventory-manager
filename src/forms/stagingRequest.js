// stagingRequest.js
const flatpickr = require('flatpickr');

const stagingRequest = {
  title: 'Staging Request',
  render(container, config) {
    console.log('Rendering Staging Request form, config:', config);
    const transferConfig = config?.transferInOut;
    const stagingConfig = config?.stagingRequest;
    if (!transferConfig || !transferConfig.locations || !Array.isArray(transferConfig.locations)) {
      console.error('transferInOut.locations is not defined or not an array:', transferConfig?.locations);
      container.innerHTML = '<p class="text-red-600">Error: Locations not configured. Please contact support.</p>';
      return;
    }
    if (!stagingConfig || !stagingConfig.strains || !Array.isArray(stagingConfig.strains)) {
      console.error('stagingRequest.strains is not defined or not an array:', stagingConfig?.strains);
      container.innerHTML = '<p class="text-red-600">Error: Strains not configured. Please contact support.</p>';
      return;
    }
    if (!stagingConfig || !stagingConfig.statuses || !Array.isArray(stagingConfig.statuses)) {
      console.error('stagingRequest.statuses is not defined or not an array:', stagingConfig?.statuses);
      container.innerHTML = '<p class="text-red-600">Error: Statuses not configured. Please contact support.</p>';
      return;
    }

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
          <label for="location" class="required">Location</label>
          <select id="location" class="border-gray-300 rounded-lg p-3 w-full" required>
            <option value="">Select location</option>
            ${transferConfig.locations.map(loc => `<option value="${loc}">${loc}</option>`).join('')}
          </select>
        </div>
        <div>
          <label for="product" class="required">Strain</label>
          <select id="product" class="border-gray-300 rounded-lg p-3 w-full" required>
            <option value="">Select strain</option>
            ${stagingConfig.strains.map(strain => `<option value="${strain}">${strain}</option>`).join('')}
          </select>
        </div>
        <div>
          <label for="quantity" class="required">Quantity</label>
          <input type="number" id="quantity" class="border-gray-300 rounded-lg p-3 w-full" min="1" required>
        </div>
        <div>
          <label for="staging-location" class="required">Staging Location</label>
          <input type="text" id="staging-location" class="border-gray-300 rounded-lg p-3 w-full" required>
        </div>
        <div>
          <label for="status" class="required">Status</label>
          <select id="status" class="border-gray-300 rounded-lg p-3 w-full" required>
            <option value="">Select status</option>
            ${stagingConfig.statuses.map(status => `<option value="${status}">${status}</option>`).join('')}
          </select>
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
    const formNoInput = document.getElementById('form-no');
    const locationInput = document.getElementById('location');
    const productInput = document.getElementById('product');
    const quantityInput = document.getElementById('quantity');
    const stagingLocationInput = document.getElementById('staging-location');
    const statusInput = document.getElementById('status');
    const commentsInput = document.getElementById('comments');

    console.log('Date input:', dateInput);
    console.log('Form No input:', formNoInput);
    console.log('Location input:', locationInput);
    console.log('Product input:', productInput);
    console.log('Quantity input:', quantityInput);
    console.log('Staging Location input:', stagingLocationInput);
    console.log('Status input:', statusInput);
    console.log('Comments input:', commentsInput);

    if (!dateInput) throw new Error('Date input not found');
    if (!formNoInput) throw new Error('Form No input not found');
    if (!locationInput) throw new Error('Location input not found');
    if (!productInput) throw new Error('Product input not found');
    if (!quantityInput) throw new Error('Quantity input not found');
    if (!stagingLocationInput) throw new Error('Staging Location input not found');
    if (!statusInput) throw new Error('Status input not found');
    if (!commentsInput) throw new Error('Comments input not found');

    const date = dateInput.value;
    const form_no = formNoInput.value;
    const location = locationInput.value;
    const product = productInput.value;
    const quantity = parseInt(quantityInput.value, 10);
    const staging_location = stagingLocationInput.value;
    const status = statusInput.value;
    const comments = commentsInput.value || null;

    return {
      data: {
        date,
        form_no,
        location,
        product,
        quantity,
        staging_location,
        status,
        comments
      }
    };
  },
  validate(data) {
    return (
      data.date &&
      data.form_no &&
      data.location &&
      data.product &&
      Number.isInteger(data.quantity) &&
      data.quantity > 0 &&
      data.staging_location &&
      data.status
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

module.exports = stagingRequest;