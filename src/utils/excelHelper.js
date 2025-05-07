const ExcelJS = require('exceljs');
const path = require('path');
const fs = require('fs');

async function saveToExcel(data) {
  const { excelFile, sheet, data: formData } = data;

  // Construct the full path to the Excel file (assumes files are in the root directory)
  const excelPath = path.join(__dirname, '../../', excelFile); // Adjust path based on src/utils/

  // Check if the file exists
  if (!fs.existsSync(excelPath)) {
    throw new Error(`${excelFile} not found. Please ensure the file exists in the root directory.`);
  }

  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(excelPath);
  const worksheet = workbook.getWorksheet(sheet || 1); // Default to first sheet if not specified

  if (!worksheet) {
    throw new Error(`Sheet ${sheet} not found in ${excelFile}`);
  }

  // Map form data to the main sheet columns
  const rowData = mapDataToColumns(formData);
  worksheet.addRow(rowData);

  await workbook.xlsx.writeFile(excelPath);
  return 'Data saved successfully!';
}

function mapDataToColumns(formData) {
  // Map form data to the columns A-Q as specified
  return {
    date: formData.date || '',              // A: Date
    formNo: formData.formNo || `FORM${Date.now()}`, // B: Form No
    batch: formData.product || formData.batch || '', // C: Batch
    strain: formData.strain || formData.product || '', // D: Strain
    sku: '',                                // E: (empty as specified)
    bom: formData.bom || formData.invoice || '', // F: BOM
    estimatedUnits: formData.estimatedUnits || formData.quantity || '', // G: Estimated Units
    unitsStaged: formData.unitsStaged || '', // H: Units Staged
    stagedDate: formData.stagedDate || '',  // I: Staged Date
    stagedTime: formData.stagedTime || '',  // J: Staged Time
    completedDate: formData.completedDate || '', // K: Completed Date
    usage: formData.usage || '',            // L: Usage
    waste: formData.waste || '',            // M: Waste
    returned: formData.returned || '',      // N: Returned
    warehouse: formData.warehouse || formData.location || '', // O: Warehouse
    packaging: formData.packaging || formData.storageLocation || '', // P: Packaging
    comments: formData.comments || '',      // Q: Comments
  };
}

module.exports = { saveToExcel };