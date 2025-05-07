// reports.js
const { ipcRenderer } = require('electron');

const reports = {
  title: 'Reports',
  render(container, config) {
    console.log('Rendering Reports form, config:', config);
    const reportConfig = config?.reports;
    if (!reportConfig || !reportConfig.reportTypes || !Array.isArray(reportConfig.reportTypes)) {
      console.error('reports.reportTypes is not defined or not an array:', reportConfig?.reportTypes);
      container.innerHTML = '<p class="text-red-600">Error: Report types not configured. Please contact support.</p>';
      return;
    }

    // List of all tables for admin view
    const allTables = [
      'transfers',
      'staging_requests',
      'transaction_updates',
      'inventory_display',
      'staging_updates', // Fixed from staging_orders
      'product_master',
      'reports'
    ];

    container.innerHTML = `
      <div class="space-y-6">
        <div>
          <label for="view-mode" class="required">View Mode</label>
          <select id="view-mode" class="border-gray-300 rounded-lg p-3 w-full" required>
            <option value="report">Standard Report</option>
            <option value="admin">Admin View</option>
          </select>
        </div>
        <div id="report-type-container">
          <label for="report-type" class="required">Report Type</label>
          <select id="report-type" class="border-gray-300 rounded-lg p-3 w-full" required>
            <option value="">Select report type</option>
            ${reportConfig.reportTypes.map(type => `<option value="${type}">${type}</option>`).join('')}
          </select>
        </div>
        <div id="table-select-container" class="hidden">
          <label for="table-select" class="required">Select Table</label>
          <select id="table-select" class="border-gray-300 rounded-lg p-3 w-full" required>
            <option value="">Select table</option>
            ${allTables.map(table => `<option value="${table}">${table.replace('_', ' ').toUpperCase()}</option>`).join('')}
          </select>
        </div>
        <div>
          <label for="parameters">Date Range (YYYY-MM-DD to YYYY-MM-DD)</label>
          <input type="text" id="parameters" class="border-gray-300 rounded-lg p-3 w-full" placeholder="e.g., 2025-01-01 to 2025-12-31">
        </div>
        <div class="mt-6">
          <h3 class="text-lg font-semibold mb-2">Results</h3>
          <table id="report-table" class="w-full border-collapse border border-gray-300 hidden">
            <thead id="report-table-head"></thead>
            <tbody id="report-table-body"></tbody>
          </table>
          <p id="report-message" class="text-gray-600 text-center"></p>
        </div>
      </div>
    `;

    // Toggle visibility of report-type and table-select based on view mode
    const viewModeSelect = document.getElementById('view-mode');
    const reportTypeContainer = document.getElementById('report-type-container');
    const tableSelectContainer = document.getElementById('table-select-container');

    viewModeSelect.addEventListener('change', () => {
      if (viewModeSelect.value === 'admin') {
        reportTypeContainer.classList.add('hidden');
        tableSelectContainer.classList.remove('hidden');
      } else {
        reportTypeContainer.classList.remove('hidden');
        tableSelectContainer.classList.add('hidden');
      }
    });
  },
  getData() {
    const viewMode = document.getElementById('view-mode').value;
    const reportType = document.getElementById('report-type').value;
    const tableSelect = document.getElementById('table-select').value;
    const parameters = document.getElementById('parameters').value || null;

    let table;
    if (viewMode === 'admin') {
      table = tableSelect;
    } else {
      const tableMap = {
        'Inventory Report': 'inventory_display',
        'Transaction Report': 'transaction_updates',
        'Product Report': 'product_master'
      };
      table = tableMap[reportType];
    }

    if (!table) {
      document.getElementById('report-message').textContent = 'Please select a valid report type or table.';
      return { data: { report_type: viewMode === 'admin' ? `Admin View: ${tableSelect}` : reportType, parameters } };
    }

    // Fetch data using IPC
    ipcRenderer.invoke('fetch-data', table).then(result => {
      if (result.success) {
        let filteredRows = result.data;
        if (parameters) {
          const [startDate, endDate] = parameters.split(' to ');
          if (startDate && endDate) {
            filteredRows = filteredRows.filter(row => {
              const createdAt = new Date(row.created_at);
              return createdAt >= new Date(startDate) && createdAt <= new Date(endDate);
            });
          }
        }
        this.displayReport(filteredRows, table);
      } else {
        document.getElementById('report-message').textContent = `Error generating report: ${result.message}`;
      }
    }).catch(err => {
      console.error('Error generating report:', err);
      document.getElementById('report-message').textContent = 'Error generating report.';
    });

    return {
      data: {
        report_type: viewMode === 'admin' ? `Admin View: ${tableSelect}` : reportType,
        parameters
      }
    };
  },
  displayReport(rows, table) {
    const tableElement = document.getElementById('report-table');
    const thead = document.getElementById('report-table-head');
    const tbody = document.getElementById('report-table-body');
    const message = document.getElementById('report-message');

    if (rows.length === 0) {
      tableElement.classList.add('hidden');
      message.textContent = 'No data found.';
      return;
    }

    // Get all columns from the first row
    const columns = Object.keys(rows[0]);

    // Render table headers
    thead.innerHTML = `
      <tr>
        ${columns.map(col => `<th class="border border-gray-300 p-2 bg-gray-200">${col.replace('_', ' ').toUpperCase()}</th>`).join('')}
      </tr>
    `;

    // Render table rows
    tbody.innerHTML = rows.map(row => `
      <tr>
        ${columns.map(col => `<td class="border border-gray-300 p-2 text-center">${row[col] !== null ? row[col] : ''}</td>`).join('')}
      </tr>
    `).join('');

    tableElement.classList.remove('hidden');
    message.textContent = '';
  },
  validate(data) {
    return data.report_type;
  }
};

module.exports = reports;