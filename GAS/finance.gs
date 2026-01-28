/**
 * Google Apps Script for Finance Management & Gmail Receipt Sync
 * Spreadsheet ID: 1mKriBf9F_MST3nCe66b7675Ha6DxdYZ_EuPij2mU_MY
 * 
 * Data Separation:
 * - 'Financial_Transactions': Synced from Gmail.
 * - 'Manual_Transactions': Entries added via form.
 */

const FINANCE_SPREADSHEET_ID = '1mKriBf9F_MST3nCe66b7675Ha6DxdYZ_EuPij2mU_MY';
const API_SECRET_KEY = 'STOCKS_SIM_SECURE_V1_2024_@SEC';

function doPost(e) {
  const params = JSON.parse(e.postData.contents);
  const action = params.action;

  if (params.apiKey !== API_SECRET_KEY) {
    return response({ error: 'API Key không hợp lệ.' }, 401);
  }

  try {
    switch (action) {
      case 'syncGmailReceipts':
        return response(syncGmailReceipts(params.email));
      case 'getFinanceSummary':
        return response(getFinanceSummary(params.email));
      case 'getFinanceTransactions':
        return response(getFinanceTransactions(params.email));
      case 'addManualTransaction':
        return response(addManualTransaction(params));
      default:
        return response({ error: 'Hành động không hợp lệ' }, 400);
    }
  } catch (err) {
    return response({ error: err.message }, 500);
  }
}

function response(data, code = 200) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

function getIndices(headers) {
  const h = headers.map(v => String(v).trim().toLowerCase());
  return {
    id: h.indexOf('id'),
    date: h.indexOf('date'),
    actual: h.indexOf('actual'),
    projected: h.indexOf('projected'),
    amount: h.indexOf('amount'),
    type: h.indexOf('type'),
    category: h.indexOf('category'),
    description: h.indexOf('description'),
    source: h.indexOf('source'),
    status: h.indexOf('status'),
    email: h.indexOf('useremail')
  };
}

function ensureSheet(ss, name, headers) {
  let sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    sheet.appendRow(headers);
  }
  
  const currentHeaders = sheet.getRange(1, 1, 1, Math.max(sheet.getLastColumn(), 1)).getValues()[0];
  const normalized = currentHeaders.map(v => String(v).trim());
  let lastCol = sheet.getLastColumn();
  
  headers.forEach(h => {
    if (normalized.indexOf(h) === -1) {
      lastCol++;
      sheet.getRange(1, lastCol).setValue(h);
    }
  });
  SpreadsheetApp.flush();
  return sheet;
}

function extractField(html, labelVi, labelEn) {
  const regex = new RegExp(`(?:${labelVi}|${labelEn})[\\s\\S]*?<td[^>]*>([\\s\\S]*?)</td>`, 'i');
  const match = html.match(regex);
  if (match) {
    return match[1].replace(/<[^>]*>/g, '').trim();
  }
  return '';
}

function syncGmailReceipts(userEmail) {
  const startTime = new Date().getTime();
  const ss = SpreadsheetApp.openById(FINANCE_SPREADSHEET_ID);
  const headers = ['ID', 'Date', 'Amount', 'Type', 'Category', 'Description', 'Source', 'Status', 'UserEmail', 'Actual', 'Projected'];
  const sheet = ensureSheet(ss, 'Financial_Transactions', headers);
  
  const data = sheet.getDataRange().getValues();
  const idx = getIndices(data[0]);
  const existingIdMap = {};
  data.forEach(r => { if(r[idx.id]) existingIdMap[r[idx.id].toString()] = true; });

  const queries = [
    'from:VCBDigibank "Biên lai" OR "Biến động" OR "VietQR"',
    'from:vib "Thanh toán" OR "giao dịch" OR "biên lai"',
    'category:purchases after:2025/01/01'
  ];

  let syncCount = 0;
  let rowsToAppend = [];

  queries.forEach(query => {
    const threads = GmailApp.search(query, 0, 30);
    const threadMessages = GmailApp.getMessagesForThreads(threads);
    threadMessages.forEach((messages) => {
      if (new Date().getTime() - startTime > 300000) return; 
      messages.forEach((msg) => {
        const body = msg.getBody();
        const subject = msg.getSubject();
        const id = 'EMAIL_' + msg.getId().substring(0, 10);
        
        if (!existingIdMap[id]) {
          const amountStr = extractField(body, 'Số tiền', 'Amount');
          const amount = parseFloat(amountStr.replace(/[^\d]/g, '')) || 0;
          if (amount > 0) {
            let type = (subject.includes('nhận') || body.includes('+') || body.includes('Ghi có')) ? 'INCOME' : 'EXPENSE';
            const newRow = new Array(headers.length).fill('');
            newRow[idx.id] = id;
            newRow[idx.date] = msg.getDate().toISOString();
            newRow[idx.amount] = amount;
            newRow[idx.actual] = amount;
            newRow[idx.projected] = amount;
            newRow[idx.type] = type;
            newRow[idx.category] = 'Deep Sync';
            newRow[idx.description] = extractField(body, 'Nội dung', 'Details') || subject;
            newRow[idx.source] = 'Ngân hàng';
            newRow[idx.status] = 'SYNCED';
            newRow[idx.email] = userEmail;
            rowsToAppend.push(newRow);
            existingIdMap[id] = true;
            syncCount++;
          }
        }
      });
    });
  });

  if (rowsToAppend.length > 0) sheet.getRange(sheet.getLastRow() + 1, 1, rowsToAppend.length, data[0].length).setValues(rowsToAppend);
  return { success: true, syncCount: syncCount };
}

function getFinanceTransactions(email) {
  const ss = SpreadsheetApp.openById(FINANCE_SPREADSHEET_ID);
  const headers = ['ID', 'Date', 'Amount', 'Type', 'Category', 'Description', 'Source', 'Status', 'UserEmail', 'Actual', 'Projected'];
  
  const sheetSync = ensureSheet(ss, 'Financial_Transactions', headers);
  const sheetManual = ensureSheet(ss, 'Manual_Transactions', headers);
  
  const dataSync = sheetSync.getDataRange().getValues();
  const dataManual = sheetManual.getDataRange().getValues();
  
  const targetEmail = String(email || "").trim().toLowerCase();

  const cleanNum = (val) => {
    if (typeof val === 'number') return val;
    const s = String(val || "").replace(/[^\d]/g, "");
    return s === "" ? 0 : parseFloat(s);
  };

  const parseData = (data, isSyncSource) => {
    if (data.length <= 1) return [];
    const idx = getIndices(data[0]);
    const results = [];

    data.slice(1).forEach((row, rowIndex) => {
      try {
        const rowEmail = String(row[idx.email] || "").trim().toLowerCase();
        
        // Hỗ trợ lọc email linh hoạt
        if (!targetEmail || rowEmail === targetEmail || rowEmail === "") {
          if (!row[idx.id]) return;

          let actual = 0;
          let projected = 0;

          if (isSyncSource) {
            // Nguồn Ngân hàng: Chỉ là THỰC TẾ
            actual = cleanNum(row[idx.actual]) || cleanNum(row[idx.amount]) || 0;
            projected = 0;
          } else {
            // Nguồn Nhập tay: Chỉ là DỰ KIẾN
            actual = cleanNum(row[idx.actual]);
            projected = cleanNum(row[idx.projected]) || cleanNum(row[idx.amount]) || 0;
          }

          if (actual > 0 || projected > 0) {
            // Chuẩn hóa thời gian đa định dạng
            let dateVal = row[idx.date];
            let dateObj = robustParseDate(dateVal);
            
            if (!dateObj || isNaN(dateObj.getTime())) return; // Vẫn bỏ qua nếu thực sự không thể parse

            results.push({
              id: String(row[idx.id] || "ID_" + rowIndex),
              date: dateObj.toISOString(),
              actual: actual,
              projected: projected,
              type: String(row[idx.type] || "EXPENSE").trim().toUpperCase(),
              category: String(row[idx.category] || "Khác"),
              description: String(row[idx.description] || ""),
              source: String(row[idx.source] || (isSyncSource ? "Ngân hàng" : "Thủ công")),
              status: isSyncSource ? 'SYNCED' : 'MANUAL'
            });
          }
        }
      } catch (e) {
        Logger.log("Error at row " + (rowIndex + 2) + ": " + e.message);
      }
    });
    return results;
  };

  const allTx = [
    ...parseData(dataSync, true), 
    ...parseData(dataManual, false)
  ];
  
  // SẮP XẾP XEN KẼ THÔNG MINH: Mới nhất lên đầu
  return allTx.sort((a, b) => {
    const timeA = new Date(a.date).getTime();
    const timeB = new Date(b.date).getTime();
    if (timeA !== timeB) return timeB - timeA;
    return a.status === 'MANUAL' ? -1 : 1; 
  });
}

/**
 * Hàm phân tích ngày tháng cực mạnh: Chấp nhận DD/MM/YYYY, ISO, Date object, và Tiếng Việt
 */
function robustParseDate(val) {
  if (val instanceof Date) return val;
  if (!val) return null;
  
  const s = String(val).trim();
  
  // 1. Thử parse trực tiếp (ISO hoặc định dạng chuẩn JS)
  let d = new Date(s);
  if (!isNaN(d.getTime())) return d;

  // 2. Xử lý định dạng VN: DD/MM/YYYY (có hoặc không có HH:mm)
  // Phù hợp với: 18/11/2023, 28/01/2026, kể cả khi có text như "Thứ Ba 28/01/2026"
  const vnMatch = s.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{1,2}))?/);
  if (vnMatch) {
    const day = parseInt(vnMatch[1], 10);
    const month = parseInt(vnMatch[2], 10) - 1;
    const year = parseInt(vnMatch[3], 10);
    const hour = parseInt(vnMatch[4] || 0, 10);
    const min = parseInt(vnMatch[5] || 0, 10);
    return new Date(year, month, day, hour, min);
  }

  // 3. Xử lý định dạng YYYY-MM-DD
  const isoMatch = s.match(/(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (isoMatch) {
    return new Date(parseInt(isoMatch[1], 10), parseInt(isoMatch[2], 10) - 1, parseInt(isoMatch[3], 10));
  }

  return null;
}

function addManualTransaction(params) {
  const ss = SpreadsheetApp.openById(FINANCE_SPREADSHEET_ID);
  const headers = ['ID', 'Date', 'Amount', 'Type', 'Category', 'Description', 'Source', 'Status', 'UserEmail', 'Actual', 'Projected'];
  const sheet = ensureSheet(ss, 'Manual_Transactions', headers);
  
  const idx = getIndices(sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0]);
  const newRow = new Array(sheet.getLastColumn()).fill('');
  
  // Logic: Nhập tay từ Form mặc định là Dự kiến (Actual = 0)
  // Trừ khi người dùng truyền cả hai số
  const act = parseFloat(params.actual) || 0;
  const proj = parseFloat(params.projected) || parseFloat(params.amount) || 0;

  newRow[idx.id] = 'MANUAL_' + new Date().getTime();
  newRow[idx.date] = params.date ? new Date(params.date).toISOString() : new Date().toISOString();
  newRow[idx.actual] = act;
  newRow[idx.projected] = proj;
  newRow[idx.amount] = proj; // Lưu vào Amount chính để dự phòng
  
  newRow[idx.type] = String(params.type || "EXPENSE").trim().toUpperCase();
  newRow[idx.category] = params.category || 'Manual';
  newRow[idx.description] = params.description || '';
  newRow[idx.source] = params.source || 'Thủ công';
  newRow[idx.status] = 'MANUAL';
  newRow[idx.email] = String(params.email).trim().toLowerCase();

  // CHÈN VÀO DÒNG 2 (Ngay dưới tiêu đề)
  sheet.insertRowBefore(2);
  sheet.getRange(2, 1, 1, newRow.length).setValues([newRow]);
  
  return { success: true };
}

function getFinanceSummary(email) {
  const tx = getFinanceTransactions(email);
  let income = 0, expense = 0;
  const catMap = {};
  tx.forEach(t => {
    if (t.type === 'INCOME') income += t.actual;
    else expense += t.actual;
    const cat = t.category || 'Khác';
    catMap[cat] = (catMap[cat] || 0) + t.actual;
  });
  return { monthlyIncome: income, monthlyExpense: expense, balance: income - expense, categories: Object.keys(catMap).map(k => ({name: k, amount: catMap[k]})) };
}

function autoSyncTask() {
  const ss = SpreadsheetApp.openById(FINANCE_SPREADSHEET_ID);
  const sheet = ss.getSheetByName('Financial_Transactions');
  if (!sheet) return;
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const emailIdx = headers.indexOf('UserEmail');
  if (emailIdx === -1) return;
  
  const emails = [...new Set(data.slice(1).map(r => String(r[emailIdx]).trim().toLowerCase()).filter(e => e))];
  emails.forEach(email => {
    try { syncGmailReceipts(email); } catch(e) {}
  });
}
