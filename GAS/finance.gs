/**
 * Google Apps Script for Finance Management & Gmail Receipt Sync
 * Spreadsheet ID: 1mKriBf9F_MST3nCe66b7675Ha6DxdYZ_EuPij2mU_MY
 */

const FINANCE_SPREADSHEET_ID = '1mKriBf9F_MST3nCe66b7675Ha6DxdYZ_EuPij2mU_MY';
const API_SECRET_KEY = 'STOCKS_SIM_SECURE_V1_2024_@SEC';

function doPost(e) {
  const params = JSON.parse(e.postData.contents);
  const action = params.action;

  // Security check
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

/**
 * Deep Sync: Optimized for high-volume users (QR payments & Transfers)
 */
function syncGmailReceipts(userEmail) {
  const startTime = new Date().getTime();
  const queries = [
    'from:VCBDigibank "Biên lai" OR "Biến động" OR "nhận tiền" OR "Chuyển tiền" OR "VietQR" OR "Nạp tiền" OR "Lương" OR "Cộng"',
    'from:vib "Thanh toán" OR "giao dịch" OR "biên lai" OR "biến động" OR "QR" OR "nhận tiền"',
    'category:purchases after:2025/01/01'
  ];
  
  const ss = SpreadsheetApp.openById(FINANCE_SPREADSHEET_ID);
  let sheet = ss.getSheetByName('Financial_Transactions');
  if (!sheet) {
    sheet = ss.insertSheet('Financial_Transactions');
    sheet.appendRow(['ID', 'Date', 'Amount', 'Type', 'Category', 'Description', 'Source', 'Beneficiary', 'AccountNum', 'Status', 'UserEmail']);
  }

  // Use a Map for O(1) checking of existing IDs
  const dataRange = sheet.getDataRange().getValues();
  const existingIdMap = {};
  dataRange.forEach(r => { existingIdMap[r[0].toString()] = true; });
  
  let syncCount = 0;
  let rowsToAppend = [];

  queries.forEach(query => {
    // Increase limit to 100 threads to catch more history for active users
    const threads = GmailApp.search(query, 0, 100);
    
    // Batch fetch messages to be faster
    const threadMessages = GmailApp.getMessagesForThreads(threads);
    
    threadMessages.forEach((messages, index) => {
      // Safety check: Apps Script has a 6 min limit
      if (new Date().getTime() - startTime > 300000) return; 

      const msg = messages[0]; // Process the latest message in each thread
      const body = msg.getBody();
      const subject = msg.getSubject();
      const plainBody = msg.getPlainBody();
      const msgDate = msg.getDate();
      
      let transData = null;

      if (subject.includes('VCBDigibank') || body.includes('Vietcombank')) {
        const orderNum = extractField(body, 'Số lệnh giao dịch', 'Order Number') || ('VCB_' + msg.getId().substring(0, 10));
        if (!existingIdMap[orderNum]) {
          let rawDate = extractField(body, 'Ngày, giờ giao dịch', 'Trans. Date, Time');
          let parsedDate = msgDate; 
          if (rawDate) {
            const dateMatch = rawDate.match(/(\d{2}:\d{2}).*?(\d{2}\/\d{2}\/\d{4})/);
            if (dateMatch) {
              const [h, m] = dateMatch[1].split(':');
              const [d, mon, y] = dateMatch[2].split('/');
              parsedDate = new Date(y, mon - 1, d, h, m).toISOString();
            }
          } else {
            parsedDate = msgDate.toISOString();
          }

          const amountStr = extractField(body, 'Số tiền', 'Amount');
          const amount = parseFloat(amountStr.replace(/[^0-9]/g, ''));
          
          let type = 'EXPENSE';
          if (subject.includes('nhận tiền') || body.toLowerCase().includes('nhận được') || body.includes('+')) {
            type = 'INCOME';
          }

          transData = {
            id: orderNum,
            date: parsedDate,
            amount: amount,
            type: type,
            note: extractField(body, 'Nội dung chuyển tiền', 'Details of Payment') || subject,
            source: 'Vietcombank'
          };
        }
      } else if (subject.toUpperCase().includes('VIB') || body.includes('Ngân hàng Quốc tế')) {
        const id = 'VIB_' + msg.getId().substring(0, 10);
        if (!existingIdMap[id]) {
          const amountMatch = plainBody.match(/(?:Số tiền|Giá trị):?\s?([\+|-]?[\d\.,]+)\s?VND/i);
          let amount = 0;
          let type = 'EXPENSE';
          if (amountMatch) {
            const str = amountMatch[1];
            if (str.includes('+')) type = 'INCOME';
            amount = parseFloat(str.replace(/[^0-9]/g, ''));
          }

          transData = {
            id: id,
            date: msgDate.toISOString(),
            amount: amount,
            type: type,
            note: subject,
            source: 'VIB'
          };
        }
      } else {
        // Purchases
        const id = 'PUR_' + msg.getId().substring(0, 10);
        if (!existingIdMap[id]) {
          const amountMatch = plainBody.match(/(?:Total|Tổng cộng|Số tiền):?\s?VND\s?([\d\.,]+)|([\d\.,]+)\s?VND/i);
          let amount = amountMatch ? parseFloat((amountMatch[1] || amountMatch[2]).replace(/[\.,]/g, '')) : 0;
          transData = {
            id: id,
            date: msgDate.toISOString(),
            amount: amount,
            type: 'EXPENSE',
            note: subject,
            source: subject.split(' ')[0]
          };
        }
      }

      if (transData && transData.amount > 0) {
        rowsToAppend.push([
          transData.id,
          transData.date,
          transData.amount,
          transData.type,
          'Deep Sync',
          transData.note,
          transData.source,
          '', '', 'SYNCED',
          userEmail
        ]);
        existingIdMap[transData.id.toString()] = true;
        syncCount++;
      }
    });
  });

  // Batch append rows for maximum performance
  if (rowsToAppend.length > 0) {
    sheet.getRange(sheet.getLastRow() + 1, 1, rowsToAppend.length, 11).setValues(rowsToAppend);
  }

  return { success: true, syncCount: syncCount };
}

function extractField(html, labelVi, labelEn) {
  const regex = new RegExp(`(?:${labelVi}|${labelEn})[\\s\\S]*?<td[^>]*>([\\s\\S]*?)</td>`, 'i');
  const match = html.match(regex);
  if (match) {
    return match[1].replace(/<[^>]*>/g, '').trim();
  }
  return '';
}

function getFinanceSummary(email) {
  const ss = SpreadsheetApp.openById(FINANCE_SPREADSHEET_ID);
  const sheet = ss.getSheetByName('Financial_Transactions');
  if (!sheet) return { monthlyIncome: 0, monthlyExpense: 0, balance: 0, categories: [] };

  const data = sheet.getDataRange().getValues();
  let income = 0;
  let expense = 0;
  const categoryMap = {};

  data.slice(1).forEach(row => {
    if (row[10] === email) { // Filter by userEmail column
      const amount = parseFloat(row[2]) || 0;
      if (row[3] === 'INCOME') income += amount;
      else expense += amount;

      const cat = row[4] || 'Other';
      categoryMap[cat] = (categoryMap[cat] || 0) + amount;
    }
  });

  const categories = Object.keys(categoryMap).map(name => ({
    name: name,
    amount: categoryMap[name]
  })).slice(0, 4);

  return {
    monthlyIncome: income / 1000, // Scaling for UI placeholder logic
    monthlyExpense: expense / 1000,
    balance: (income - expense) / 1000,
    categories: categories.length > 0 ? categories : [
      { name: 'General', amount: expense }
    ]
  };
}

function getFinanceTransactions(email) {
  const ss = SpreadsheetApp.openById(FINANCE_SPREADSHEET_ID);
  const sheet = ss.getSheetByName('Financial_Transactions');
  if (!sheet) return [];
  
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];
  
  return data.slice(1)
    .filter(row => row[10] === email) // Filter by userEmail column
    .map(row => {
      let rawDate = row[1];
      let finalDate = rawDate;

      // Check if it's a Vietnamese date string: "07:39 Thứ Tư 28/01/2026"
      if (typeof rawDate === 'string' && rawDate.includes('Thứ')) {
        const match = rawDate.match(/(\d{2}:\d{2}).*?(\d{2}\/\d{2}\/\d{4})/);
        if (match) {
          const [h, m] = match[1].split(':');
          const [d, mon, y] = match[2].split('/');
          finalDate = new Date(y, mon - 1, d, h, m).toISOString();
        }
      } else if (rawDate instanceof Date) {
        finalDate = rawDate.toISOString();
      }

      return {
        id: row[0],
        date: finalDate,
        amount: row[2],
        type: row[3],
        category: row[4],
        description: row[5],
        source: row[6]
      };
    }).reverse();
}

function addManualTransaction(params) {
  const ss = SpreadsheetApp.openById(FINANCE_SPREADSHEET_ID);
  let sheet = ss.getSheetByName('Financial_Transactions');
  if (!sheet) {
    sheet = ss.insertSheet('Financial_Transactions');
    sheet.appendRow(['ID', 'Date', 'Amount', 'Type', 'Category', 'Description', 'Source', 'Beneficiary', 'AccountNum', 'Status', 'UserEmail']);
  }
  
  const id = 'MANUAL_' + new Date().getTime();
  const amount = parseFloat(params.amount) || 0;
  
  sheet.appendRow([
    id,
    new Date().toISOString(),
    amount,
    params.type.toUpperCase(), // INCOME or EXPENSE
    params.category || 'Manual',
    params.description || '',
    params.source || 'Cash',
    '',
    '',
    'COMPLETED',
    params.email
  ]);
  
  return { success: true, id: id };
}

/**
 * Hàm này dùng để cài đặt Trigger (Kích hoạt theo thời gian)
 * Bạn có thể vào mục 'Triggers' trong Apps Script -> Add Trigger -> autoSyncTask -> Every 1 hour
 */
function autoSyncTask() {
  const ss = SpreadsheetApp.openById(FINANCE_SPREADSHEET_ID);
  const sheet = ss.getSheetByName('Financial_Transactions');
  if (!sheet) return;

  // Lấy danh sách email người dùng duy nhất đã từng dùng app
  const data = sheet.getDataRange().getValues();
  const emails = [...new Set(data.slice(1).map(r => r[10]).filter(e => e))];
  
  emails.forEach(email => {
    try {
      syncGmailReceipts(email);
      Logger.log('Auto-synced for: ' + email);
    } catch(e) {
      Logger.log('Failed auto-sync for: ' + email);
    }
  });
}
