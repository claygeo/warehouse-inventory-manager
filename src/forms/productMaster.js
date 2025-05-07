const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const productMaster = {
  title: 'Product Master',
  currentPage: 1,
  pageSize: 10,
  totalPages: 1,
  allData: [],
  filteredData: null,
  
  render: async (container, config) => {
    // Clear the container and show a loading state
    container.innerHTML = `
      <div class="space-y-4">
        <!-- Search controls -->
        <div class="border border-gray-300 rounded-lg p-4 bg-gray-50">
          <h3 class="text-lg font-semibold mb-3">Search Products</h3>
          
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label for="search-component" class="block text-sm mb-1">Search Component:</label>
              <input type="text" id="search-component" class="border-gray-300 rounded-lg p-2 w-full" placeholder="Enter component name...">
            </div>
            <div>
              <label for="search-description" class="block text-sm mb-1">Search Description:</label>
              <input type="text" id="search-description" class="border-gray-300 rounded-lg p-2 w-full" placeholder="Enter description text...">
            </div>
          </div>
          
          <div class="flex justify-end space-x-2">
            <button id="apply-filters" class="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600">Search</button>
            <button id="clear-filters" class="bg-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-400">Clear</button>
          </div>
        </div>
        
        <!-- Product list heading -->
        <h3 class="text-lg font-semibold mb-2">Product List</h3>
        
        <!-- Products table container -->
        <div class="border border-gray-300 rounded-lg mb-4">
          <div class="overflow-x-auto" style="max-height: 500px; overflow-y: auto;">
            <table id="products-table" class="w-full border-collapse">
              <thead class="bg-purple-100 sticky top-0 z-10">
                <tr>
                  <th class="border border-gray-300 p-2 text-sm font-semibold text-gray-700">Component</th>
                  <th class="border border-gray-300 p-2 text-sm font-semibold text-gray-700">Description</th>
                </tr>
              </thead>
              <tbody id="products-table-body">
                <tr><td colspan="2" class="text-center p-4">Loading products...</td></tr>
              </tbody>
            </table>
          </div>
        </div>
        
        <!-- Pagination container -->
        <div class="pagination-container mb-4 flex justify-between items-center p-2 bg-gray-100 border border-gray-300 rounded-lg">
          <div class="pagination-info">
            <span class="text-sm">Showing page <span id="current-page">1</span> of <span id="total-pages">1</span></span>
          </div>
          <div class="flex space-x-2">
            <button id="prev-page" class="px-3 py-1 bg-purple-500 text-white rounded-lg disabled:bg-gray-300 disabled:text-gray-500">Previous</button>
            <button id="next-page" class="px-3 py-1 bg-purple-500 text-white rounded-lg disabled:bg-gray-300 disabled:text-gray-500">Next</button>
          </div>
          <div>
            <select id="page-size" class="border-gray-300 rounded-lg p-1 text-sm">
              <option value="10">10 per page</option>
              <option value="25">25 per page</option>
              <option value="50">50 per page</option>
              <option value="100">100 per page</option>
            </select>
          </div>
        </div>
        
        <!-- Product details section (will show when a product is clicked) -->
        <div id="product-details" class="hidden border border-gray-300 rounded-lg p-4 bg-gray-50 mb-4">
          <div class="flex justify-between items-center mb-4">
            <h3 class="text-lg font-semibold">Product Details</h3>
            <button id="close-details" class="text-gray-500 hover:text-gray-700">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
              </svg>
            </button>
          </div>
          <div id="details-content">
            <!-- Will be populated when a product is clicked -->
          </div>
        </div>
      </div>
    `;

    // Fetch data from Supabase
    try {
      // Check the schema of the table first
      const { data: tables, error: schemaError } = await supabase
        .from('product_master')
        .select('*')
        .limit(1);
      
      if (schemaError) {
        console.error('Schema error:', schemaError);
        throw new Error(`Failed to fetch schema: ${schemaError.message}`);
      }

      // Now fetch all the data
      let query = supabase.from('product_master').select('*');
      
      // Check if we have Component or component column
      const sampleRow = tables[0];
      let componentField = 'Component';
      let descriptionField = 'Description';
      
      // Check if we have lowercase column names
      if ('component' in sampleRow) {
        componentField = 'component';
      }
      if ('description' in sampleRow) {
        descriptionField = 'description';
      }
      
      query = query.order(componentField, { ascending: true });
      
      const { data, error } = await query;

      if (error) {
        throw new Error(`Failed to fetch data: ${error.message}`);
      }

      const tbody = document.getElementById('products-table-body');
      if (!data || data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="2" class="text-center p-4">No products available.</td></tr>';
        document.querySelector('.pagination-container').classList.add('hidden');
      } else {
        // Store the data and column names for pagination
        productMaster.allData = data;
        productMaster.filteredData = null;
        productMaster.componentField = componentField;
        productMaster.descriptionField = descriptionField;
        
        // Initialize pagination
        productMaster.setupPagination();
        
        // Setup filter handlers
        productMaster.setupFilters();
        
        // Setup product details view
        productMaster.setupProductDetails();
      }
    } catch (err) {
      console.error('Error fetching product data from Supabase:', err);
      const tbody = document.getElementById('products-table-body');
      tbody.innerHTML = `<tr><td colspan="2" class="text-center p-4 text-red-600">Error: ${err.message}</td></tr>`;
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
    const componentField = this.componentField;
    const descriptionField = this.descriptionField;
    
    applyFiltersBtn.addEventListener('click', () => {
      const componentSearch = document.getElementById('search-component').value.toLowerCase();
      const descriptionSearch = document.getElementById('search-description').value.toLowerCase();
      
      if (!componentSearch && !descriptionSearch) {
        // If no filters, use all data
        this.filteredData = null;
      } else {
        // Apply filters
        this.filteredData = this.allData.filter(item => {
          // Component search
          const componentMatch = !componentSearch || 
            (item[componentField] && item[componentField].toLowerCase().includes(componentSearch));
          
          // Description search
          const descriptionMatch = !descriptionSearch || 
            (item[descriptionField] && item[descriptionField].toLowerCase().includes(descriptionSearch));
          
          return componentMatch && descriptionMatch;
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
      
      // Hide product details when filter changes
      document.getElementById('product-details').classList.add('hidden');
    });
    
    clearFiltersBtn.addEventListener('click', () => {
      // Clear filter inputs
      document.getElementById('search-component').value = '';
      document.getElementById('search-description').value = '';
      
      // Reset to using all data
      this.filteredData = null;
      this.currentPage = 1;
      this.totalPages = Math.ceil(this.allData.length / this.pageSize);
      
      document.getElementById('total-pages').textContent = this.totalPages;
      this.renderPageData();
      this.updatePaginationControls();
      
      // Hide product details when filter changes
      document.getElementById('product-details').classList.add('hidden');
    });
  },
  
  setupProductDetails: function() {
    // Event delegation for product row clicks
    const componentField = this.componentField;
    
    document.getElementById('products-table-body').addEventListener('click', (e) => {
      // Find the closest tr element (if any)
      const row = e.target.closest('tr');
      if (!row) return;
      
      // Get the component from the first cell
      const component = row.cells[0].textContent;
      if (!component) return;
      
      // Find the product in the data
      const dataSource = this.filteredData || this.allData;
      const product = dataSource.find(p => p[this.componentField] === component);
      if (!product) return;
      
      // Show the details
      this.showProductDetails(product);
    });
    
    // Close button for product details
    document.getElementById('close-details').addEventListener('click', () => {
      document.getElementById('product-details').classList.add('hidden');
    });
  },
  
  showProductDetails: function(product) {
    const detailsContainer = document.getElementById('details-content');
    const detailsSection = document.getElementById('product-details');
    
    // Build the details HTML
    detailsContainer.innerHTML = `
      <div class="mb-4">
        <h4 class="text-base font-semibold mb-2">Component</h4>
        <p class="p-2 bg-gray-100 rounded-lg">${product[this.componentField] || 'N/A'}</p>
      </div>
      <div>
        <h4 class="text-base font-semibold mb-2">Description</h4>
        <p class="p-2 bg-gray-100 rounded-lg">${product[this.descriptionField] || 'No description available.'}</p>
      </div>
    `;
    
    // Show the details section
    detailsSection.classList.remove('hidden');
  },
  
  renderPageData: function() {
    const tbody = document.getElementById('products-table-body');
    const componentField = this.componentField;
    const descriptionField = this.descriptionField;
    
    // Use filtered data if available, otherwise use all data
    const dataSource = this.filteredData || this.allData;
    
    // Clear the tbody first
    tbody.innerHTML = '';
    
    if (dataSource.length === 0) {
      tbody.innerHTML = '<tr><td colspan="2" class="text-center p-4">No products match your search criteria.</td></tr>';
      return;
    }
    
    const startIndex = (this.currentPage - 1) * this.pageSize;
    const endIndex = Math.min(startIndex + this.pageSize, dataSource.length);
    const pageData = dataSource.slice(startIndex, endIndex);
    
    // Create a document fragment for better performance
    const fragment = document.createDocumentFragment();
    
    // Add each row to the fragment
    pageData.forEach(product => {
      const tr = document.createElement('tr');
      tr.className = 'hover:bg-gray-50 cursor-pointer';
      
      // Create the row HTML
      tr.innerHTML = `
        <td class="border border-gray-300 p-2 text-sm">${product[componentField] || ''}</td>
        <td class="border border-gray-300 p-2 text-sm">${product[descriptionField] || ''}</td>
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
    // This module is for display only, no data to get
    return { data: {} };
  },
  
  validate: (data) => {
    // This module is for display only, no validation needed
    return true;
  }
};

module.exports = productMaster;