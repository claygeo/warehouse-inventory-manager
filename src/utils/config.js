// src/utils/config.js
module.exports = {
  // General locations used across forms
  locations: ['Mount Dora', 'Fort Pierce', 'Homestead', '3PL'],

  // Dropdown options for "Transfer In/Out"
  transferInOut: {
    locations: ['Mount Dora', 'Fort Pierce', 'Homestead', '3PL'],
    transactionTypes: [
      'Vendor Receipt',
      'Transfer In',
      'Transfer Out',
      'Positive Adjustment',
      'Write Off',
      'Quarantine'
    ]
  },

  // Dropdown options for "Staging Request"
  stagingRequest: {
    strains: ['Strain1', 'Strain2', 'Strain3'],
    statuses: ['Pending', 'In Progress', 'Completed']
  },

  // Dropdown options for "Transaction Updates"
  transactionUpdates: {
    formNumbers: ['FORM001', 'FORM002', 'FORM003']
  },

  // Dropdown options for "Product Master"
  productMaster: {
    categories: ['Raw Materials', 'Finished Goods', 'Packaging']
  },

  // Dropdown options for "Reports"
  reports: {
    reportTypes: ['Inventory Report', 'Transaction Report', 'Product Report']
  },

  // General settings
  settings: {
    defaultDateFormat: 'm/d/Y',
    maxDate: 'today'
  }
};