const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');
const XLSX = require('xlsx');
const path = require('path');

async function extractText(buffer, fileName, fileType) {
  const ext = path.extname(fileName).toLowerCase();

  if (ext === '.pdf' || fileType === 'application/pdf') {
    return extractPdf(buffer);
  }
  if (ext === '.docx' || fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
    return extractDocx(buffer);
  }
  if (ext === '.xlsx' || ext === '.xls' || fileType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') {
    return extractXlsx(buffer);
  }

  throw new Error(`Unsupported file type: ${ext || fileType}`);
}

async function extractPdf(buffer) {
  const data = await pdfParse(buffer);
  return data.text || '';
}

async function extractDocx(buffer) {
  const result = await mammoth.extractRawText({ buffer });
  return result.value || '';
}

function extractXlsx(buffer) {
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const texts = [];

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });
    texts.push(`--- Sheet: ${sheetName} ---`);
    for (const row of rows) {
      const line = row.map(cell => (cell != null ? String(cell) : '')).join(' | ');
      if (line.trim()) texts.push(line);
    }
  }

  return texts.join('\n');
}

module.exports = { extractText };
