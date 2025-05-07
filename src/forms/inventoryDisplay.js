const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const inventoryDisplay = {
  title: 'Inventory Display',
  currentPage: 1,
  pageSize: 10,
  totalPages: 1,
  allData: [],
  filteredData: null,
  
  render: async (container, config) => {
    // Clear the container and show a loading state
    container.innerHTML = `
      <div class="space-y-4">
        <!-- Form fields in horizontal layout -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label for="form_no" class="required block mb-1">Form No</label>
            <input type="text" id="form_no" class="border-gray-300 rounded-lg p-2 w-full form-input-transparent" required>
          </div>
          <div>
            <label for="batch" class="required block mb-1">Batch</label>
            <input type="text" id="batch" class="border-gray-300 rounded-lg p-2 w-full form-input-transparent" required>
          </div>
          <div>
            <label for="strain" class="required block mb-1">Strain</label>
            <input type="text" id="strain" class="border-gray-300 rounded-lg p-2 w-full form-input-transparent" required>
          </div>
        </div>
        
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label for="warehouse" class="required block mb-1">Warehouse</label>
            <select id="warehouse" class="border-gray-300 rounded-lg p-2 w-full form-input-transparent" required>
              <option value="">Select warehouse</option>
              ${config.locations.map(loc => `<option value="${loc}">${loc}</option>`).join('')}
            </select>
          </div>
          <div>
            <label for="units_staged" class="required block mb-1">Units Staged</label>
            <input type="number" id="units_staged" class="border-gray-300 rounded-lg p-2 w-full form-input-transparent" min="0" required>
          </div>
        </div>

        <!-- Filter controls -->
        <div class="flex flex-wrap gap-2 my-4 items-center">
          <div>
            <label for="filter-batch" class="text-sm mr-1">Filter Batch:</label>
            <input type="text" id="filter-batch" class="border-gray-300 rounded-lg p-1 text-sm form-input-transparent" placeholder="Search batch...">
          </div>
          <div>
            <label for="filter-strain" class="text-sm mr-1">Filter Strain:</label>
            <input type="text" id="filter-strain" class="border-gray-300 rounded-lg p-1 text-sm form-input-transparent" placeholder="Search strain...">
          </div>
          <div>
            <label for="filter-bom" class="text-sm mr-1">Filter BOM:</label>
            <input type="text" id="filter-bom" class="border-gray-300 rounded-lg p-1 text-sm form-input-transparent" placeholder="Search BOM...">
          </div>
          <button id="apply-filters" class="bg-blue-500 text-white px-3 py-1 rounded-lg text-sm">Apply Filters</button>
          <button id="clear-filters" class="bg-gray-300 text-gray-700 px-3 py-1 rounded-lg text-sm">Clear Filters</button>
        </div>

        <!-- Current inventory heading -->
        <h3 class="text-lg font-semibold mb-2">Current Inventory</h3>
        
        <!-- Table container with fixed height -->
        <div class="border border-gray-300 rounded-lg mb-4 bg-white/70 backdrop-blur-sm">
          <div class="overflow-x-auto" style="max-height: 500px; overflow-y: auto;">
            <table id="inventory-table" class="w-full border-collapse">
              <thead class="bg-purple-100 sticky top-0 z-10">
                <tr>
                  <th class="border border-gray-300 p-2 text-sm font-semibold text-gray-700">Date</th>
                  <th class="border border-gray-300 p-2 text-sm font-semibold text-gray-700">Form No</th>
                  <th class="border border-gray-300 p-2 text-sm font-semibold text-gray-700">Batch</th>
                  <th class="border border-gray-300 p-2 text-sm font-semibold text-gray-700">Strain</th>
                  <th class="border border-gray-300 p-2 text-sm font-semibold text-gray-700">BOM</th>
                  <th class="border border-gray-300 p-2 text-sm font-semibold text-gray-700">Est. Units</th>
                  <th class="border border-gray-300 p-2 text-sm font-semibold text-gray-700">Units Staged</th>
                  <th class="border border-gray-300 p-2 text-sm font-semibold text-gray-700">Staged Date</th>
                  <th class="border border-gray-300 p-2 text-sm font-semibold text-gray-700">Staged Time</th>
                  <th class="border border-gray-300 p-2 text-sm font-semibold text-gray-700">Completed Date</th>
                  <th class="border border-gray-300 p-2 text-sm font-semibold text-gray-700">Usage</th>
                  <th class="border border-gray-300 p-2 text-sm font-semibold text-gray-700">Waste</th>
                  <th class="border border-gray-300 p-2 text-sm font-semibold text-gray-700">Returned</th>
                  <th class="border border-gray-300 p-2 text-sm font-semibold text-gray-700">Warehouse</th>
                  <th class="border border-gray-300 p-2 text-sm font-semibold text-gray-700">Packaging</th>
                  <th class="border border-gray-300 p-2 text-sm font-semibold text-gray-700">Comments</th>
                </tr>
              </thead>
              <tbody id="inventory-table-body">
                <tr><td colspan="16" class="text-center p-4">Loading...</td></tr>
              </tbody>
            </table>
          </div>
        </div>
        
        <!-- Pagination container -->
        <div class="pagination-container mb-4 flex justify-between items-center p-2 bg-white/70 backdrop-blur-sm border border-gray-300 rounded-lg">
          <div class="pagination-info">
            <span class="text-sm">Showing page <span id="current-page">1</span> of <span id="total-pages">1</span></span>
          </div>
          <div class="flex space-x-2">
            <button id="prev-page" class="px-3 py-1 bg-purple-500 text-white rounded-lg disabled:bg-gray-300 disabled:text-gray-500">Previous</button>
            <button id="next-page" class="px-3 py-1 bg-purple-500 text-white rounded-lg disabled:bg-gray-300 disabled:text-gray-500">Next</button>
          </div>
          <div>
            <select id="page-size" class="border-gray-300 rounded-lg p-1 text-sm form-input-transparent">
              <option value="10">10 per page</option>
              <option value="25">25 per page</option>
              <option value="50">50 per page</option>
              <option value="100">100 per page</option>
            </select>
          </div>
        </div>
      </div>
    `;

    // Add style for transparent form inputs
    const style = document.createElement('style');
    style.textContent = `
      .form-input-transparent {
        background-color: rgba(255, 255, 255, 0.7) !important;
        backdrop-filter: blur(5px);
      }
      #form-container {
        background-color: transparent !important;
      }
      #content {
        background-color: transparent !important;
      }
      #message {
        background-color: transparent !important;
      }
    `;
    document.head.appendChild(style);

    // Fetch data from Supabase
    try {
      const { data, error } = await supabase
        .from('inventoy_display')
        .select('*')
        .order('date', { ascending: false });

      if (error) {
        throw new Error(`Failed to fetch data: ${error.message}`);
      }

      const tbody = document.getElementById('inventory-table-body');
      if (!data || data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="16" class="text-center p-4">No inventory data available.</td></tr>';
        document.querySelector('.pagination-container').classList.add('hidden');
      } else {
        // Store the data for pagination
        inventoryDisplay.allData = data;
        inventoryDisplay.filteredData = null;
        
        // Initialize pagination
        inventoryDisplay.setupPagination();
        
        // Setup filter handlers
        inventoryDisplay.setupFilters();
      }
    } catch (err) {
      console.error('Error fetching inventory data from Supabase:', err);
      const tbody = document.getElementById('inventory-table-body');
      tbody.innerHTML = `<tr><td colspan="16" class="text-center p-4 text-red-600">Error: ${err.message}</td></tr>`;
    }
  },

  setupPagination: function() {
    const pageSize = parseInt(document.getElementById('page-size').value);
    this.pageSize = pageSize;
    
    // Get the data source (filtered or all)
    const dataSource = this.filteredData || this.allData;
    this.totalPages = Math.ceil(dataSource.length / this.pageSize);
    
    document.getElementById('total-pages').textContent = this.totalPages;
    
    // Update page display and button states
    this.renderPageData();
    this.updatePaginationControls();
    
    // Add event listeners for pagination controls
    document.getElementById('prev-page').addEventListener('click', () => {
      if (this.currentPage > 1) {
        this.currentPage--;
        this.renderPageData();
        this.updatePaginationControls();
      }
    });
    
    document.getElementById('next-page').addEventListener('click', () => {
      if (this.currentPage < this.totalPages) {
        this.currentPage++;
        this.renderPageData();
        this.updatePaginationControls();
      }
    });
    
    document.getElementById('page-size').addEventListener('change', (e) => {
      this.pageSize = parseInt(e.target.value);
      // Get the data source (filtered or all)
      const dataSource = this.filteredData || this.allData;
      this.totalPages = Math.ceil(dataSource.length / this.pageSize);
      this.currentPage = 1; // Reset to first page
      document.getElementById('total-pages').textContent = this.totalPages;
      this.renderPageData();
      this.updatePaginationControls();
    });
  },
  
  setupFilters: function() {
    const applyFiltersBtn = document.getElementById('apply-filters');
    const clearFiltersBtn = document.getElementById('clear-filters');
    
    applyFiltersBtn.addEventListener('click', () => {
      const batchFilter = document.getElementById('filter-batch').value.toLowerCase();
      const strainFilter = document.getElementById('filter-strain').value.toLowerCase();
      const bomFilter = document.getElementById('filter-bom').value.toLowerCase();
      
      if (!batchFilter && !strainFilter && !bomFilter) {
        // If no filters, use all data
        this.filteredData = null;
      } else {
        // Apply filters
        this.filteredData = this.allData.filter(item => {
          return (!batchFilter || (item.batch && item.batch.toLowerCase().includes(batchFilter))) &&
                (!strainFilter || (item.strain && item.strain.toLowerCase().includes(strainFilter))) &&
                (!bomFilter || (item.bom && item.bom.toLowerCase().includes(bomFilter)));
        });
      }
      
      // Reset to first page
      this.currentPage = 1;
      
      // Get the data source (filtered or all)
      const dataSource = this.filteredData || this.allData;
      this.totalPages = Math.ceil(dataSource.length / this.pageSize);
      
      document.getElementById('total-pages').textContent = this.totalPages;
      this.renderPageData();
      this.updatePaginationControls();
    });
    
    clearFiltersBtn.addEventListener('click', () => {
      // Clear filter inputs
      document.getElementById('filter-batch').value = '';
      document.getElementById('filter-strain').value = '';
      document.getElementById('filter-bom').value = '';
      
      // Reset to using all data
      this.filteredData = null;
      this.currentPage = 1;
      this.totalPages = Math.ceil(this.allData.length / this.pageSize);
      
      document.getElementById('total-pages').textContent = this.totalPages;
      this.renderPageData();
      this.updatePaginationControls();
    });
  },
  
  renderPageData: function() {
    const tbody = document.getElementById('inventory-table-body');
    
    // Use filtered data if available, otherwise use all data
    const dataSource = this.filteredData || this.allData;
    
    // Clear the tbody first
    tbody.innerHTML = '';
    
    if (dataSource.length === 0) {
      tbody.innerHTML = '<tr><td colspan="16" class="text-center p-4">No data matches your filters.</td></tr>';
      return;
    }
    
    const startIndex = (this.currentPage - 1) * this.pageSize;
    const endIndex = Math.min(startIndex + this.pageSize, dataSource.length);
    const pageData = dataSource.slice(startIndex, endIndex);
    
    // Create a document fragment for better performance
    const fragment = document.createDocumentFragment();
    
    // Add each row to the fragment
    pageData.forEach(row => {
      const tr = document.createElement('tr');
      tr.className = 'hover:bg-gray-50';
      
      // Create the row HTML
      tr.innerHTML = `
        <td class="border border-gray-300 p-2 text-sm text-center">${row.date || ''}</td>
        <td class="border border-gray-300 p-2 text-sm text-center">${row.form_no || ''}</td>
        <td class="border border-gray-300 p-2 text-sm text-center">${row.batch || ''}</td>
        <td class="border border-gray-300 p-2 text-sm text-center">${row.strain || ''}</td>
        <td class="border border-gray-300 p-2 text-sm text-center">${row.bom || ''}</td>
        <td class="border border-gray-300 p-2 text-sm text-center">${row.estimated_units ?? ''}</td>
        <td class="border border-gray-300 p-2 text-sm text-center">${row.units_staged ?? ''}</td>
        <td class="border border-gray-300 p-2 text-sm text-center">${row.staged_date || ''}</td>
        <td class="border border-gray-300 p-2 text-sm text-center">${row.staged_time || ''}</td>
        <td class="border border-gray-300 p-2 text-sm text-center">${row.completed_date || ''}</td>
        <td class="border border-gray-300 p-2 text-sm text-center">${row.usage ?? ''}</td>
        <td class="border border-gray-300 p-2 text-sm text-center">${row.waste ?? ''}</td>
        <td class="border border-gray-300 p-2 text-sm text-center">${row.returned ?? ''}</td>
        <td class="border border-gray-300 p-2 text-sm text-center">${row.warehouse || ''}</td>
        <td class="border border-gray-300 p-2 text-sm text-center">${row.packaging || ''}</td>
        <td class="border border-gray-300 p-2 text-sm text-center">${row.comments || ''}</td>
      `;
      
      fragment.appendChild(tr);
    });
    
    // Append all rows at once
    tbody.appendChild(fragment);
  },
  
  updatePaginationControls: function() {
    document.getElementById('current-page').textContent = this.currentPage;
    document.getElementById('prev-page').disabled = this.currentPage === 1;
    document.getElementById('next-page').disabled = this.currentPage === this.totalPages;
  },
  
  getData: () => {
    const form_no = document.getElementById('form_no').value;
    const batch = document.getElementById('batch').value;
    const strain = document.getElementById('strain').value;
    const warehouse = document.getElementById('warehouse').value;
    const units_staged = parseInt(document.getElementById('units_staged').value, 10);

    return {
      data: {
        form_no,
        batch,
        strain,
        warehouse,
        units_staged,
        date: new Date().toISOString().split('T')[0] // Add current date
      }
    };
  },
  
  validate: (data) => {
    return (
      data.form_no &&
      data.batch &&
      data.strain &&
      data.warehouse &&
      Number.isInteger(data.units_staged) &&
      data.units_staged >= 0
    );
  }
};

module.exports = inventoryDisplay;