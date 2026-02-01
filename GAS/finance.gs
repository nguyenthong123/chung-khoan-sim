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

// GOOGLE OAUTH2 CONFIGURATION
// GOOGLE OAUTH2 CONFIGURATION
const GOOGLE_CLIENT_ID = 'YOUR_GOOGLE_CLIENT_ID';
const GOOGLE_CLIENT_SECRET = 'YOUR_GOOGLE_CLIENT_SECRET';

function doGet(e) {
  // Xử lý Google OAuth Callback
  if (e.parameter.code && e.parameter.state) {
    const success = handleOAuthCallback(e.parameter.code, e.parameter.state);
    if (success) {
      return HtmlService.createHtmlOutput(`
        <div style="font-family: sans-serif; text-align: center; padding: 50px;">
          <h2 style="color: #10B981;">Kết nối thành công!</h2>
          <p>Tài khoản Gmail của bạn đã được liên kết với StockSim.</p>
          <p>Bạn có thể đóng cửa sổ này và quay lại ứng dụng.</p>
          <script>setTimeout(function(){ window.close(); }, 3000);</script>
        </div>
      `);
    } else {
      return HtmlService.createHtmlOutput(`
        <div style="font-family: sans-serif; text-align: center; padding: 50px;">
          <h2 style="color: #EF4444;">Kết nối thất bại</h2>
          <p>Có lỗi xảy ra trong quá trình xác thực. Vui lòng thử lại.</p>
        </div>
      `);
    }
  }
  return HtmlService.createHtmlOutput("StockSim Finance API is running.");
}

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
      case 'getGoogleAuthUrl':
        return response(getGoogleAuthUrl(params.email));
      case 'getFinanceSummary':
        return response(getFinanceSummary(params.email));
      case 'getFinanceTransactions':
        return response(getFinanceTransactions(params.email));
      case 'addManualTransaction':
        return response(addManualTransaction(params));
      case 'deleteFinanceTransaction':
        return response(deleteFinanceTransaction(params.email, params.id));
      case 'updateFinanceTransaction':
        return response(updateFinanceTransaction(params));
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
  const find = (names) => {
    for (let name of names) {
      const i = h.indexOf(name.toLowerCase());
      if (i !== -1) return i;
    }
    return -1;
  };

  return {
    id: find(['id', 'mã', 'transid']),
    date: find(['date', 'ngày', 'time']),
    actual: find(['actual', 'thực tế', 'thực thu', 'thực chi']),
    projected: find(['projected', 'dự kiến', 'kế hoạch']),
    amount: find(['amount', 'số tiền', 'giá trị']),
    type: find(['type', 'loại', 'phân loại']),
    category: find(['category', 'danh mục', 'nhóm']),
    description: find(['description', 'mô tả', 'nội dung']),
    source: find(['source', 'nguồn', 'tài khoản']),
    status: find(['status', 'trạng thái']),
    email: find(['useremail', 'email', 'người dùng'])
  };
}

function ensureSheet(ss, name, targetHeaders) {
  let sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    sheet.appendRow(targetHeaders);
    return sheet;
  }
  
  // 1. Lấy tiêu đề hiện tại và chuẩn hóa
  let currentHeaders = sheet.getRange(1, 1, 1, Math.max(sheet.getLastColumn(), 1)).getValues()[0];
  
  // 2. Tìm và xóa các cột trùng lặp (Case-insensitive)
  const seenHeader = {};
  const colsToDelete = [];
  
  for (let i = 0; i < currentHeaders.length; i++) {
    const raw = String(currentHeaders[i]).trim();
    if (!raw) continue;
    const lower = raw.toLowerCase();
    
    if (seenHeader[lower]) {
      // Nếu đã thấy tiêu đề này rồi (trùng lặp), đánh dấu để xóa
      colsToDelete.push(i + 1);
    } else {
      seenHeader[lower] = true;
    }
  }
  
  // Xóa từ phải qua trái để không lệch index
  for (let i = colsToDelete.length - 1; i >= 0; i--) {
    sheet.deleteColumn(colsToDelete[i]);
  }

  // 3. Sau khi xóa, kiểm tra xem có thiếu cột nào trong targetHeaders không
  currentHeaders = sheet.getRange(1, 1, 1, Math.max(sheet.getLastColumn(), 1)).getValues()[0];
  const normalizedCurrent = currentHeaders.map(v => String(v).trim().toLowerCase());
  
  targetHeaders.forEach(h => {
    if (normalizedCurrent.indexOf(h.toLowerCase()) === -1) {
      sheet.getRange(1, sheet.getLastColumn() + 1).setValue(h);
    }
  });
  
  SpreadsheetApp.flush();
  return sheet;
}

function extractField(html, labelVi, labelEn) {
  // Chuẩn hóa labels
  const labelPattern = `(?:${labelVi}|${labelEn})`;
  
  // 1. Thử tìm trong bảng (Cấu trúc của VCB, Techcombank)
  const tdRegex = new RegExp(`${labelPattern}[\\s\\S]*?<td[^>]*>([\\s\\S]*?)</td>`, 'i');
  let match = html.match(tdRegex);
  if (match) {
    let val = match[1].replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();
    if (val) return val;
  }
  
  // 2. Thử tìm dạng inline "Label: Value" (Cấu trúc MB Bank, MoMo)
  const inlineRegex = new RegExp(`${labelPattern}\\s*[:\\-]?\\s*([^\\n<|]+)`, 'i');
  match = html.match(inlineRegex);
  if (match) {
    let val = match[1].replace(/<[^>]*>/g, '').trim();
    if (val) return val;
  }
  
  // 3. Dự phòng cuối cùng: Tìm xung quanh label trong text thuần
  const plainText = html.replace(/<[^>]*>/g, ' ');
  const plainRegex = new RegExp(`${labelPattern}\\s*[:\\-]?\\s*([\\d\\.,]+(?:\\s*VND|đ|VND)?)`, 'i');
  match = plainText.match(plainRegex);
  if (match) return match[1].trim();

  return '';
}

function syncGmailReceipts(userEmail) {
  const startTime = new Date().getTime();
  const ss = SpreadsheetApp.openById(FINANCE_SPREADSHEET_ID);
  
  // KIỂM TRA TOKEN RIÊNG CỦA NGƯỜI DÙNG (Cho tính năng Premium thực thụ)
  let accessToken = null;
  const tokenData = getUserToken(userEmail);
  if (tokenData && tokenData.refreshToken) {
    accessToken = refreshAccessToken(tokenData.refreshToken);
  }

  const headers = ['ID', 'Date', 'Amount', 'Type', 'Category', 'Description', 'Source', 'Status', 'UserEmail', 'Actual', 'Projected'];
  const sheet = ensureSheet(ss, 'Financial_Transactions', headers);
  
  const data = sheet.getDataRange().getValues();
  const idx = getIndices(data[0]);
  const existingIdMap = {};
  data.forEach(r => { if(r[idx.id]) existingIdMap[r[idx.id].toString()] = true; });

  // Kiểm tra nếu có token riêng, chuyển hướng sang dùng Gmail API (OAuth)
  if (accessToken) {
       return syncGmailApi(userEmail, accessToken);
  }
  // Nếu không có token riêng, chạy bằng Gmail App mặc định (Dành cho admin hoặc chuyển tiếp)
  const queries = [
    'from:VCBDigibank "Biên lai" OR "Biến động"',
    'from:no-reply@techcombank.com.vn OR "Techcombank" "biến động số dư"',
    'from:mbbank.com.vn OR "MB Bank" "biến động số dư" OR "số dư thay đổi"',
    'from:ebanking@tpb.com.vn OR "TPBank" "biến động số dư"',
    'from:customercare@vpbank.com.vn OR "VPBank" "giao dịch"',
    'from:no-reply@momo.vn "Giao dịch thành công"',
    'from:acb.com.vn "thông báo giao dịch"',
    'subject:"biên lai" OR subject:"giao dịch" OR subject:"biến động" OR subject:"số dư"',
    'after:2025/01/01'
  ];

  let syncCount = 0;
  let rowsToAppend = [];

  queries.forEach(query => {
    try {
      const threads = GmailApp.search(query, 0, 20); // Giới hạn 20 threads mỗi query để tránh timeout
      const threadMessages = GmailApp.getMessagesForThreads(threads);
      
      threadMessages.forEach((messages) => {
        messages.forEach((msg) => {
          if (new Date().getTime() - startTime > 240000) return; 
          
          const id = 'EMAIL_' + msg.getId();
          if (existingIdMap[id]) return;

          const rowData = processEmailParsing(
            msg.getSubject(),
            msg.getBody(),
            msg.getPlainBody(),
            msg.getFrom(),
            msg.getDate(),
            id,
            userEmail,
            data[0].length,
            idx
          );

          if (rowData) {
            rowsToAppend.push(rowData);
            existingIdMap[id] = true;
            syncCount++;
          }
        });
      });
    } catch (e) {
      Logger.log("Lỗi quét Query [" + query + "]: " + e.message);
    }
  });

  if (rowsToAppend.length > 0) {
    // Ghi vào Sheet cực kỳ an toàn: Luôn dùng đúng số cột của hàng tiêu đề
    sheet.getRange(sheet.getLastRow() + 1, 1, rowsToAppend.length, data[0].length).setValues(rowsToAppend);
  }
  
  return { success: true, syncCount: syncCount, message: `Đã đồng bộ ${syncCount} giao dịch mới từ các ngân hàng.` };
}

/**
 * LOGIC BÓC TÁCH EMAIL CHUNG (Dùng cho cả GmailApp và Gmail API)
 */
function processEmailParsing(subject, body, plainText, sender, dateObj, id, userEmail, rowLength, idx) {
  // 1. BỘ LỌC CHỐNG RÁC (BLACKLIST)
  const blacklist = ['quảng cáo', 'tóm tắt', 'cơ hội', 'tin tức', 'giới thiệu', 'khóa thẻ', 'tạm khóa', 'mở khóa', 'đăng nhập', 'otp', 'mã xác thực', 'ưu đãi', 'quà tặng', 'sao kê'];
  const contentToStyle = (subject + plainText).toLowerCase();
  if (blacklist.some(word => contentToStyle.includes(word))) return null;

  // 2. XÁC THỰC GIAO DỊCH (WHITELIST)
  const whitelist = ['số dư', 'giao dịch', 'biến động', 'biên lai', 'số tiền', 'amount', 'transaction'];
  if (!whitelist.some(word => contentToStyle.includes(word))) return null;

  // ĐẢM BẢO: Luôn sử dụng email người dùng đang đăng nhập
  let effectiveUser = userEmail.toLowerCase().trim();

  // 3. BÓC TÁCH SỐ TIỀN CHẶT CHẼ
  let amountStr = "";
  // Ưu tiên tìm định dạng: "Số tiền... VND/đ"
  const strictRegex = /(?:số tiền|amount|giá trị|gd|thanh toán)[:\-\s]+([\d\.,]{4,15})\s*(?:VND|đ|d|bdsd)/i;
  const match = body.match(strictRegex) || plainText.match(strictRegex);
  
  if (match) {
    amountStr = match[1];
  } else {
    // Nếu không khớp regex chặt chẽ, thử hàm extractField cũ nhưng phải kiểm tra lại
    amountStr = extractField(body, 'Số tiền', 'Amount');
    if (!amountStr) amountStr = extractField(plainText, 'Số tiền', 'Amount');
  }

  // Xử lý chuỗi số thành số thực
  let amount = parseFloat(String(amountStr || "").replace(/[^\d]/g, '')) || 0;
  
  // Loại bỏ các giao dịch quá nhỏ hoặc rác
  if (amount < 2000 || amount > 5000000000) return null; 

  if (amount > 0) {
    const isIncome = subject.includes('+') || body.includes('+') || 
                      body.includes('Ghi có') || body.includes('đã nhận') || 
                      body.includes('vào tài khoản') || body.includes('nạp tiền');
    
    const type = isIncome ? 'INCOME' : 'EXPENSE';
    const newRow = new Array(rowLength).fill('');
    
    if (idx.id !== -1) newRow[idx.id] = id;
    if (idx.date !== -1) newRow[idx.date] = dateObj.toISOString();
    if (idx.amount !== -1) newRow[idx.amount] = amount;
    if (idx.actual !== -1) newRow[idx.actual] = amount;
    if (idx.projected !== -1) newRow[idx.projected] = 0; 
    if (idx.type !== -1) newRow[idx.type] = type;
    
    let sourceName = 'Ngân hàng';
    const sLower = (sender + subject + body).toLowerCase();
    if (sLower.includes('vcb') || sLower.includes('vietcombank')) sourceName = 'Vietcombank';
    else if (sLower.includes('tcb') || sLower.includes('techcombank')) sourceName = 'Techcombank';
    else if (sLower.includes('mbbank') || sLower.includes('mb bank')) sourceName = 'MB Bank';
    else if (sLower.includes('vib')) sourceName = 'VIB';
    else if (sLower.includes('momo')) sourceName = 'MoMo';
    
    if (idx.category !== -1) newRow[idx.category] = sourceName;
    
    let desc = extractField(body, 'Nội dung', 'Details');
    if (!desc) desc = extractField(plainText, 'Nội dung', 'Details');
    if (!desc) desc = subject;
    
    if (idx.description !== -1) newRow[idx.description] = desc;
    if (idx.source !== -1) newRow[idx.source] = sourceName;
    if (idx.status !== -1) newRow[idx.status] = 'SYNCED';
    if (idx.email !== -1) newRow[idx.email] = effectiveUser;
    
    return newRow;
  }
  return null;
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
        const rowEmail = idx.email !== -1 ? String(row[idx.email] || "").trim().toLowerCase() : "";
        
        if (!targetEmail || rowEmail === targetEmail || rowEmail === "") {
          const transId = (idx.id !== -1 && row[idx.id]) ? String(row[idx.id]) : ("MANUAL_" + rowIndex + "_" + (new Date().getTime()));

          let actual = 0;
          let projected = 0;

          const rawActual = idx.actual !== -1 ? cleanNum(row[idx.actual]) : 0;
          const rawProjected = idx.projected !== -1 ? cleanNum(row[idx.projected]) : 0;
          const rawAmount = idx.amount !== -1 ? cleanNum(row[idx.amount]) : 0;

          if (isSyncSource) {
            actual = rawActual || rawAmount || 0;
            projected = 0;
          } else {
            actual = rawActual;
            projected = rawProjected || rawAmount || 0;
          }

          if (actual > 0 || projected > 0) {
            // Chuẩn hóa thời gian đa định dạng
            let dateVal = row[idx.date];
            let dateObj = robustParseDate(dateVal);
            
            if (!dateObj || isNaN(dateObj.getTime())) return; // Vẫn bỏ qua nếu thực sự không thể parse

            results.push({
              id: transId,
              date: dateObj.toISOString(),
              actual: actual,
              projected: projected,
              type: idx.type !== -1 ? String(row[idx.type] || "EXPENSE").trim().toUpperCase() : "EXPENSE",
              category: idx.category !== -1 ? String(row[idx.category] || "Khác") : "Khác",
              description: idx.description !== -1 ? String(row[idx.description] || "") : "",
              source: idx.source !== -1 ? String(row[idx.source] || "") : (isSyncSource ? "Ngân hàng" : "Thủ công"),
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
    const d1 = new Date(a.date);
    const d2 = new Date(b.date);
    
    // So sánh ngày (không tính giờ)
    const dateA = d1.toISOString().split('T')[0];
    const dateB = d2.toISOString().split('T')[0];
    
    if (dateA !== dateB) {
      return dateB.localeCompare(dateA); // Ngày mới nhất lên đầu
    }
    
    // Nếu cùng ngày: Ưu tiên MANUAL (Kế hoạch) hiển thị trước SYNCED (Thực tế)
    if (a.status !== b.status) {
      return a.status === 'MANUAL' ? -1 : 1;
    }
    
    // Nếu cùng status: Sắp xếp theo giờ chính xác
    return d2.getTime() - d1.getTime();
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

function deleteFinanceTransaction(email, id) {
  const ss = SpreadsheetApp.openById(FINANCE_SPREADSHEET_ID);
  const sheets = ['Manual_Transactions', 'Financial_Transactions'];
  let deleted = false;

  sheets.forEach(name => {
    const sheet = ss.getSheetByName(name);
    if (!sheet) return;
    const data = sheet.getDataRange().getValues();
    const idx = getIndices(data[0]);
    if (idx.id === -1) return;

    for (let i = 1; i < data.length; i++) {
      if (String(data[i][idx.id]) === String(id) && String(data[i][idx.email]).toLowerCase() === String(email).toLowerCase()) {
        sheet.deleteRow(i + 1);
        deleted = true;
        break;
      }
    }
  });

  return { success: deleted, message: deleted ? 'Đã xóa giao dịch' : 'Không tìm thấy giao dịch hoặc quyền bị từ chối' };
}

function updateFinanceTransaction(params) {
  const { email, id, date, actual, projected, type, category, description, source } = params;
  const ss = SpreadsheetApp.openById(FINANCE_SPREADSHEET_ID);
  const sheets = ['Manual_Transactions', 'Financial_Transactions'];
  let updated = false;

  sheets.forEach(name => {
    const sheet = ss.getSheetByName(name);
    if (!sheet) return;
    const data = sheet.getDataRange().getValues();
    const idx = getIndices(data[0]);
    if (idx.id === -1) return;

    for (let i = 1; i < data.length; i++) {
      if (String(data[i][idx.id]) === String(id) && String(data[i][idx.email]).toLowerCase() === String(email).toLowerCase()) {
        const row = i + 1;
        if (idx.date !== -1) sheet.getRange(row, idx.date + 1).setValue(new Date(date).toISOString());
        if (idx.actual !== -1) sheet.getRange(row, idx.actual + 1).setValue(parseFloat(actual) || 0);
        if (idx.projected !== -1) sheet.getRange(row, idx.projected + 1).setValue(parseFloat(projected) || 0);
        if (idx.amount !== -1) sheet.getRange(row, idx.amount + 1).setValue(parseFloat(projected || actual) || 0);
        if (idx.type !== -1) sheet.getRange(row, idx.type + 1).setValue(String(type || "EXPENSE").toUpperCase());
        if (idx.category !== -1) sheet.getRange(row, idx.category + 1).setValue(category);
        if (idx.description !== -1) sheet.getRange(row, idx.description + 1).setValue(description);
        if (idx.source !== -1) sheet.getRange(row, idx.source + 1).setValue(source);
        
        updated = true;
        break;
      }
    }
  });

  return { success: updated, message: updated ? 'Cập nhật thành công' : 'Không tìm thấy hoặc không có quyền sửa' };
}
// --- HỆ THỐNG XÁC THỰC GOOGLE OAUTH2 ---

function getGoogleAuthUrl(userEmail) {
  if (GOOGLE_CLIENT_ID === 'YOUR_CLIENT_ID') {
    return { error: 'Chưa cấu hình Google API. Vui lòng liên hệ Admin.' };
  }
  
  const scriptUrl = ScriptApp.getService().getUrl();
  const scope = 'https://www.googleapis.com/auth/gmail.readonly';
  const url = 'https://accounts.google.com/o/oauth2/v2/auth' +
    '?client_id=' + GOOGLE_CLIENT_ID +
    '&redirect_uri=' + encodeURIComponent(scriptUrl) +
    '&response_type=code' +
    '&scope=' + encodeURIComponent(scope) +
    '&state=' + encodeURIComponent(userEmail) +
    '&access_type=offline' +
    '&prompt=consent';
    
  return { url: url };
}

function getUserToken(email) {
  const ss = SpreadsheetApp.openById(FINANCE_SPREADSHEET_ID);
  let sheet = ss.getSheetByName('UserTokens');
  if (!sheet) {
    sheet = ss.insertSheet('UserTokens');
    sheet.appendRow(['Email', 'RefreshToken', 'LastUpdate']);
    return null;
  }
  
  const data = sheet.getDataRange().getValues();
  const row = data.find(r => String(r[0]).toLowerCase() === String(email).toLowerCase());
  return row ? { refreshToken: row[1] } : null;
}

function saveUserToken(email, refreshToken) {
  const ss = SpreadsheetApp.openById(FINANCE_SPREADSHEET_ID);
  let sheet = ss.getSheetByName('UserTokens') || ss.insertSheet('UserTokens');
  const data = sheet.getDataRange().getValues();
  const rowIndex = data.findIndex(r => String(r[0]).toLowerCase() === String(email).toLowerCase());
  
  if (rowIndex !== -1) {
    sheet.getRange(rowIndex + 1, 2).setValue(refreshToken);
    sheet.getRange(rowIndex + 1, 3).setValue(new Date());
  } else {
    sheet.appendRow([email, refreshToken, new Date()]);
  }
}

function refreshAccessToken(refreshToken) {
  const url = 'https://oauth2.googleapis.com/token';
  const payload = {
    client_id: GOOGLE_CLIENT_ID,
    client_secret: GOOGLE_CLIENT_SECRET,
    refresh_token: refreshToken,
    grant_type: 'refresh_token'
  };
  
  const options = {
    method: 'post',
    payload: payload,
    muteHttpExceptions: true
  };
  
  try {
    const res = UrlFetchApp.fetch(url, options);
    const data = JSON.parse(res.getContentText());
    return data.access_token;
  } catch(e) { return null; }
}

/**
 * Hàm mới: Đồng bộ qua Gmail API chính thức (hỗ trợ cho người dùng đã cấp quyền OAuth)
 */
function syncGmailApi(userEmail, accessToken) {
  const ss = SpreadsheetApp.openById(FINANCE_SPREADSHEET_ID);
  const headers = ['ID', 'Date', 'Amount', 'Type', 'Category', 'Description', 'Source', 'Status', 'UserEmail', 'Actual', 'Projected'];
  const sheet = ensureSheet(ss, 'Financial_Transactions', headers);
  const data = sheet.getDataRange().getValues();
  const idx = getIndices(data[0]);
  const existingIdMap = {};
  data.forEach(r => { if(r[idx.id]) existingIdMap[r[idx.id].toString()] = true; });

  const query = 'subject:("biên lai" OR "giao dịch" OR "biến động" OR "số dư") after:2025/01/01';
  const url = `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${encodeURIComponent(query)}&maxResults=20`;
  
  const options = {
    headers: { Authorization: `Bearer ${accessToken}` },
    muteHttpExceptions: true
  };
  
  const res = UrlFetchApp.fetch(url, options);
  const listData = JSON.parse(res.getContentText());
  
  let syncCount = 0;
  let rowsToAppend = [];

  if (listData.messages) {
    listData.messages.forEach(m => {
      const msgUrl = `https://gmail.googleapis.com/gmail/v1/users/me/messages/${m.id}`;
      const msgRes = UrlFetchApp.fetch(msgUrl, options);
      const msgData = JSON.parse(msgRes.getContentText());
      
      const emailId = 'EMAIL_' + m.id;
      if (existingIdMap[emailId]) return;

      // Giải mã body (Base64URL)
      let body = "";
      if (msgData.payload.parts) {
        body = Utilities.newBlob(Utilities.base64DecodeWebSafe(msgData.payload.parts[0].body.data)).getDataAsString();
      } else {
        body = Utilities.newBlob(Utilities.base64DecodeWebSafe(msgData.payload.body.data)).getDataAsString();
      }
      
      const subject = msgData.payload.headers.find(h => h.name === 'Subject').value;
      const sender = msgData.payload.headers.find(h => h.name === 'From').value;
      const date = new Date(parseInt(msgData.internalDate));
      
      const rowData = processEmailParsing(
        subject,
        body,
        body.replace(/<[^>]*>/g, ' '), // Simple plain text conversion
        sender,
        date,
        emailId,
        userEmail,
        data[0].length,
        idx
      );

      if (rowData) {
        rowsToAppend.push(rowData);
        existingIdMap[emailId] = true;
        syncCount++;
      }
    });

    if (rowsToAppend.length > 0) {
      sheet.getRange(sheet.getLastRow() + 1, 1, rowsToAppend.length, data[0].length).setValues(rowsToAppend);
    }
  }
  
  return { success: true, message: `Đã đồng bộ ${syncCount} giao dịch mới qua kết nối trực tiếp.` };
}

// Hàm bổ sung cho doGet của backend.gs để xử lý callback
function handleOAuthCallback(code, userEmail) {
  const url = 'https://oauth2.googleapis.com/token';
  const scriptUrl = ScriptApp.getService().getUrl();
  
  const payload = {
    code: code,
    client_id: GOOGLE_CLIENT_ID,
    client_secret: GOOGLE_CLIENT_SECRET,
    redirect_uri: scriptUrl,
    grant_type: 'authorization_code'
  };
  
  const options = {
    method: 'post',
    payload: payload,
    muteHttpExceptions: true
  };
  
  const res = UrlFetchApp.fetch(url, options);
  const data = JSON.parse(res.getContentText());
  
  if (data.refresh_token) {
    saveUserToken(userEmail, data.refresh_token);
    return true;
  }
  return false;
}
