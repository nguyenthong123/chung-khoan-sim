/**
 * SIÊU SCRIPT: STOCK TRADING & FINANCE MANAGER
 * Version: Consolidated + OAuth Debug Fix + Trading Functions Restored + Advanced parsing (VIB Broad)
 */

// CẤU HÌNH CHÍNH
const SPREADSHEET_ID = '11ndIWy9yteJQFuWO4rssp3_8YJ-rYZgpJ1cLuLVQuy8'; // File Chứng khoán
const FINANCE_SPREADSHEET_ID = '1mKriBf9F_MST3nCe66b7675Ha6DxdYZ_EuPij2mU_MY'; // File Tài chính

const API_SECRET_KEY = 'STOCKS_SIM_SECURE_V1_2024_@SEC';

// GOOGLE OAUTH2 CONFIGURATION
const GOOGLE_CLIENT_ID = 'YOUR_GOOGLE_CLIENT_ID';
const GOOGLE_CLIENT_SECRET = 'YOUR_GOOGLE_CLIENT_SECRET';

// ==========================================
// 1. HTTP HANDLERS (DUY NHẤT)
// ==========================================

function doGet(e) {
  if (e.parameter.code && e.parameter.state) {
    const result = handleOAuthCallback(e.parameter.code, e.parameter.state);
    if (result.success) {
      return HtmlService.createHtmlOutput(`
        <div style="font-family: sans-serif; text-align: center; padding: 50px;">
          <h2 style="color: #10B981;">Kết nối thành công!</h2>
          <p>Tài khoản Gmail của bạn đã được liên kết với StockSim.</p>
          <script>setTimeout(function(){ window.close(); }, 3000);</script>
        </div>
      `);
    } else {
      return HtmlService.createHtmlOutput(`
        <div style="font-family: sans-serif; text-align: center; padding: 50px;">
          <h2 style="color: #EF4444;">Kết nối thất bại</h2>
          <p>Chi tiết lỗi: <strong>${result.error}</strong></p>
          <p>Vui lòng kiểm tra lại cấu hình Redirect URI trong Google Cloud Console.</p>
        </div>
      `);
    }
  }
  return HtmlService.createHtmlOutput("StockSim Unified API is running.");
}

function doPost(e) {
  const params = JSON.parse(e.postData.contents);
  const action = params.action;
  
  if (params.apiKey !== API_SECRET_KEY) return response({ error: 'API Key không hợp lệ.' }, 401);

  try {
    const criticalActions = ['placeOrder', 'deposit', 'deleteTransaction', 'sendOTP', 'verifyOTP'];
    if (criticalActions.includes(action)) checkRateLimit(params.email, action);

    switch (action) {
      case 'login': return response(login(params.email, params.password));
      case 'register': return response(register(params.email, params.password, params.otp));
      case 'resetPassword': return response(resetPassword(params.email, params.password, params.otp));
      case 'getProfile': return response(getProfile(params.email));
      case 'sendOTP': return response(sendOTP(params.email, params.type));
      case 'verifyOTP': return response(verifyOTP(params.email, params.otp));
      case 'placeOrder': return response(placeOrder(params));
      case 'getHoldings': return response(getHoldings(params.email));
      case 'getHistory': return response(getHistory(params.email));
      case 'deleteTransaction': return response(deleteTradingTransaction(params.email, params.id));
      case 'deposit': return response(depositFunds(params));
      case 'adjustBalance': return response(adjustBalance(params));
      case 'getNotifications': return response(getNotifications(params.email));
      case 'markNotificationsRead': return response(markNotificationsRead(params.email));
      case 'getStockData': return response(getStockData(params.symbol));
      case 'getStockHistory': return response(getStockHistory(params.symbol));
      case 'refreshStockPrices': return response(refreshStockPrices());
      case 'checkGmailConnection': return response(checkGmailConnection(params.email));
      case 'syncGmailReceipts': return response(syncGmailReceipts(params.email));
      case 'getGoogleAuthUrl': return response(getGoogleAuthUrl(params.email));
      case 'getFinanceSummary': return response(getFinanceSummary(params.email));
      case 'getFinanceTransactions': return response(getFinanceTransactions(params.email));
      case 'addManualTransaction': return response(addManualTransaction(params));
      case 'deleteFinanceTransaction': return response(deleteFinanceTransaction(params.email, params.id));
      case 'updateFinanceTransaction': return response(updateFinanceTransaction(params));
      default: return response({ error: 'Hành động không hợp lệ: ' + action }, 400);
    }
  } catch (err) { return response({ error: err.message }, 500); }
}

function response(data, code = 200) {
  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);
}

// ==========================================
// 2. OAUTH & GMAIL UTILS
// ==========================================

function getGoogleAuthUrl(userEmail) {
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

function handleOAuthCallback(code, userEmail) {
  const scriptUrl = ScriptApp.getService().getUrl();
  const tokenUrl = 'https://oauth2.googleapis.com/token';
  const payload = { code: code, client_id: GOOGLE_CLIENT_ID, client_secret: GOOGLE_CLIENT_SECRET, redirect_uri: scriptUrl, grant_type: 'authorization_code' };
  try {
    const response = UrlFetchApp.fetch(tokenUrl, { method: 'post', payload: payload, muteHttpExceptions: true });
    const content = response.getContentText();
    const tokenData = JSON.parse(content);
    
    if (tokenData.error) return { success: false, error: tokenData.error_description || tokenData.error };
    if (tokenData.refresh_token) { saveUserToken(userEmail, tokenData.refresh_token); return { success: true }; }
    else if (tokenData.access_token) return { success: true };
  } catch (e) { return { success: false, error: e.message }; }
  return { success: false, error: "Unknown Error" };
}

function saveUserToken(email, refreshToken) {
  const ss = SpreadsheetApp.openById(FINANCE_SPREADSHEET_ID);
  let sheet = ss.getSheetByName('UserTokens');
  if (!sheet) { sheet = ss.insertSheet('UserTokens'); sheet.appendRow(['Email', 'RefreshToken', 'UpdatedAt']); }
  const data = sheet.getDataRange().getValues();
  let found = false;
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === email) { sheet.getRange(i + 1, 2).setValue(refreshToken); sheet.getRange(i + 1, 3).setValue(new Date()); found = true; break; }
  }
  if (!found) sheet.appendRow([email, refreshToken, new Date()]);
}

function getUserToken(email) {
  const ss = SpreadsheetApp.openById(FINANCE_SPREADSHEET_ID);
  const sheet = ss.getSheetByName('UserTokens');
  if (!sheet) return null;
  const data = sheet.getDataRange().getValues();
  const row = data.find(r => r[0] === email);
  if (row) return { refreshToken: row[1] };
  return null;
}

function checkGmailConnection(email) {
  const token = getUserToken(email);
  return { connected: !!(token && token.refreshToken) };
}

function refreshAccessToken(refreshToken) {
  const tokenUrl = 'https://oauth2.googleapis.com/token';
  const payload = { client_id: GOOGLE_CLIENT_ID, client_secret: GOOGLE_CLIENT_SECRET, refresh_token: refreshToken, grant_type: 'refresh_token' };
  try {
    const response = UrlFetchApp.fetch(tokenUrl, { method: 'post', payload: payload });
    return JSON.parse(response.getContentText()).access_token;
  } catch (e) { return null; }
}

function syncGmailApi(userEmail, accessToken) {
  const ss = SpreadsheetApp.openById(FINANCE_SPREADSHEET_ID);
  const headers = ['ID', 'Date', 'Amount', 'Type', 'Category', 'Description', 'Source', 'Beneficiary', 'AccountNum', 'Status', 'UserEmail', 'Actual', 'Projected'];
  const sheet = ensureSheet(ss, 'Financial_Transactions', headers);
  const data = sheet.getDataRange().getValues();
  const idx = getIndices(data[0]);
  const existingIdMap = {};
  data.forEach(r => { if(r[idx.id]) existingIdMap[r[idx.id].toString()] = true; });

  let syncCount = 0; const rowsToAppend = [];
  const query = 'newer_than:90d (subject:("biên lai" OR "biến động" OR "giao dịch" OR "thanh toán" OR "nạp thẻ") OR from:info@myvib.vib.com.vn)';
  const listUrl = `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${encodeURIComponent(query)}&maxResults=50`;
  const listParams = { method: 'get', headers: { Authorization: `Bearer ${accessToken}` }, muteHttpExceptions: true };
  
  const listResp = UrlFetchApp.fetch(listUrl, listParams);
  const listData = JSON.parse(listResp.getContentText());

  if (listData.messages) {
    listData.messages.forEach(m => {
      const emailId = 'EMAIL_' + m.id;
      if (existingIdMap[emailId]) return;
      const msgUrl = `https://gmail.googleapis.com/gmail/v1/users/me/messages/${m.id}`;
      const msgResp = UrlFetchApp.fetch(msgUrl, listParams);
      const msgData = JSON.parse(msgResp.getContentText());
      let body = "";
      if (msgData.payload.parts) {
        const part = msgData.payload.parts.find(p => p.mimeType === 'text/html') || msgData.payload.parts[0];
        if (part && part.body && part.body.data) body = Utilities.newBlob(Utilities.base64DecodeWebSafe(part.body.data)).getDataAsString();
      } else if (msgData.payload.body && msgData.payload.body.data) body = Utilities.newBlob(Utilities.base64DecodeWebSafe(msgData.payload.body.data)).getDataAsString();
      const subject = (msgData.payload.headers.find(h => h.name === 'Subject') || {}).value || '';
      const sender = (msgData.payload.headers.find(h => h.name === 'From') || {}).value || '';
      const date = new Date(parseInt(msgData.internalDate));
      
      const rowData = processEmailParsing(subject, body, body.replace(/<[^>]*>/g, ' '), sender, date, emailId, userEmail, headers.length, idx);
      if (rowData) { rowsToAppend.push(rowData); existingIdMap[emailId] = true; syncCount++; }
    });
    if (rowsToAppend.length > 0) sheet.getRange(sheet.getLastRow() + 1, 1, rowsToAppend.length, headers.length).setValues(rowsToAppend);
  }
  return { success: true, message: `Synced ${syncCount} messages via API.` };
}

function syncGmailReceipts(userEmail) {
  const tokenData = getUserToken(userEmail);
  if (tokenData && tokenData.refreshToken) {
    const accessToken = refreshAccessToken(tokenData.refreshToken);
    if (accessToken) return syncGmailApi(userEmail, accessToken);
  }
  const ss = SpreadsheetApp.openById(FINANCE_SPREADSHEET_ID);
  const headers = ['ID', 'Date', 'Amount', 'Type', 'Category', 'Description', 'Source', 'Beneficiary', 'AccountNum', 'Status', 'UserEmail', 'Actual', 'Projected'];
  const sheet = ensureSheet(ss, 'Financial_Transactions', headers);
  const data = sheet.getDataRange().getValues();
  const idx = getIndices(data[0]);
  const existingIdMap = {};
  data.forEach(r => { if(r[idx.id]) existingIdMap[r[idx.id].toString()] = true; });

  let syncCount = 0; const rowsToAppend = [];
  const queries = ['from:VCBDigibank newer_than:90d', 'from:no-reply@techcombank.com.vn newer_than:90d', 'from:info@myvib.vib.com.vn newer_than:90d', 'subject:("giao dịch thành công") newer_than:90d'];
  
  queries.forEach(query => {
    try {
      const threads = GmailApp.search(query, 0, 50);
      const msgs = GmailApp.getMessagesForThreads(threads);
      msgs.forEach(thread => thread.forEach(msg => {
        const id = 'EMAIL_' + msg.getId();
        if (existingIdMap[id]) return;
        const rowData = processEmailParsing(msg.getSubject(), msg.getBody(), msg.getPlainBody(), msg.getFrom(), msg.getDate(), id, userEmail, headers.length, idx);
        if (rowData) { rowsToAppend.push(rowData); existingIdMap[id] = true; syncCount++; }
      }));
    } catch (e) {}
  });

  if (rowsToAppend.length > 0) sheet.getRange(sheet.getLastRow() + 1, 1, rowsToAppend.length, headers.length).setValues(rowsToAppend);
  return { success: true, syncCount: syncCount, message: `Synced ${syncCount} via Internal App.` };
}

function processEmailParsing(subject, body, plainText, sender, dateObj, id, userEmail, rowLength, idx) {
  const contentToStyle = (subject + plainText).toLowerCase();
  
  // 1. BLACKLIST
  const blacklist = ['quảng cáo', 'tóm tắt', 'cơ hội', 'tin tức', 'giới thiệu', 'khóa thẻ', 'tạm khóa', 'mở khóa', 'đăng nhập', 'otp', 'mã xác thực', 'ưu đãi', 'quà tặng', 'sao kê'];
  if (blacklist.some(word => contentToStyle.includes(word)) && !subject.toLowerCase().includes('thanh toán')) return null;

  // 2. WHITELIST
  const whitelist = ['số dư', 'giao dịch', 'biến động', 'biên lai', 'số tiền', 'amount', 'transaction', 'nạp thẻ', 'thanh toán'];
  if (!whitelist.some(word => contentToStyle.includes(word))) return null;

  // 3. PARSING CHUYÊN BIỆT
  // KIỂM TRA NGUỒN NGÂN HÀNG
  let sourceName = 'Ngân hàng';
  const sLower = (sender + subject + body).toLowerCase();
  if (sLower.includes('vcb') || sLower.includes('vietcombank')) sourceName = 'Vietcombank';
  else if (sLower.includes('tcb') || sLower.includes('techcombank')) sourceName = 'Techcombank';
  else if (sLower.includes('vib') || sLower.includes('quoc te')) sourceName = 'VIB';
  
  let amount = 0;
  let description = subject;
  let beneficiary = "";
  let accountNum = "";
  let parsedDate = dateObj;
  
  // LOGIC VIETCOMBANK (Biên lai)
  if (sourceName === 'Vietcombank') {
     const amtMatch = body.match(/(?:Số tiền|Amount)[\s\S]*?([\d.,]+)\s*(?:VND|đ|d)/i) || plainText.match(/(?:Số tiền|Amount)[\s\S]*?([\d.,]+)\s*(?:VND|đ|d)/i);
     if (amtMatch) amount = parseFloat(amtMatch[1].replace(/[^\d]/g, ''));
     
     const benMatch = body.match(/(?:Tên người hưởng|Beneficiary Name)[\s\S]*?([^\n<]+)/i) || plainText.match(/(?:Tên người hưởng|Beneficiary Name)[\s\S]*?([^\n<]+)/i);
     if (benMatch) beneficiary = benMatch[1].trim();

     const accMatch = body.match(/(?:Tài khoản nguồn|Debit Account)[\s\S]*?(\d{10,})/i) || plainText.match(/(?:Tài khoản nguồn|Debit Account)[\s\S]*?(\d{10,})/i);
     if (accMatch) accountNum = accMatch[1].trim();

     const descMatch = body.match(/(?:Nội dung chuyển tiền|Details of Payment)[\s\S]*?([^\n<]+)/i) || plainText.match(/(?:Nội dung chuyển tiền|Details of Payment)[\s\S]*?([^\n<]+)/i);
     if (descMatch) description = descMatch[1].trim();
     
     const dateMatch = body.match(/([0-9]{2}:[0-9]{2}).*?([0-9]{2}\/[0-9]{2}\/[0-9]{4})/);
     if (dateMatch) {
         try {
             const parts = dateMatch[2].split('/'); const timeParts = dateMatch[1].split(':');
             const d = new Date(parts[2], parts[1]-1, parts[0], timeParts[0], timeParts[1]);
             if (!isNaN(d.getTime())) parsedDate = d;
         } catch(e) {}
     }
  } 
  // LOGIC VIB (Nạp thẻ)
  else if (sourceName === 'VIB') {
      const amtMatch = body.match(/(?:Số tiền thanh toán|Mệnh giá|Số tiền|Tổng tiền)[\s\S]*?([\d.,]+)\s*(?:VND|đ|d|VNĐ)/i) || plainText.match(/(?:Số tiền thanh toán|Mệnh giá|Số tiền|Tổng tiền)[\s\S]*?([\d.,]+)\s*(?:VND|đ|d|VNĐ)/i);
      if (amtMatch) amount = parseFloat(amtMatch[1].replace(/[^\d]/g, ''));

      const descMatch = body.match(/(?:Diễn giải|Nội dung)[\s\S]*?([^\n<]+)/i) || plainText.match(/(?:Diễn giải|Nội dung)[\s\S]*?([^\n<]+)/i);
      if (descMatch) description = descMatch[1].trim();
      
      const accMatch = body.match(/(?:Từ tài khoản\/thẻ tín dụng|Số thẻ)[\s\S]*?(\d+)/i) || plainText.match(/(?:Từ tài khoản\/thẻ tín dụng|Số thẻ)[\s\S]*?(\d+)/i);
      if (accMatch) accountNum = accMatch[1].trim();
      
      const dateMatch = body.match(/([0-9]{2}:[0-9]{2})\s+([0-9]{2}\/[0-9]{2}\/[0-9]{4})/);
      if (dateMatch) {
         try {
             const parts = dateMatch[2].split('/'); const timeParts = dateMatch[1].split(':');
             const d = new Date(parts[2], parts[1]-1, parts[0], timeParts[0], timeParts[1]);
             if (!isNaN(d.getTime())) parsedDate = d;
         } catch(e) {}
     }
  }
  // LOGIC CHUNG (FALLBACK)
  else {
      let amountStr = "";
      const strictRegex = /(?:số tiền|amount|giá trị|gd|thanh toán)[:\-\s]+([\d\.,]{4,15})\s*(?:VND|đ|d|bdsd)/i;
      const match = body.match(strictRegex) || plainText.match(strictRegex);
      if (match) amountStr = match[1];
      else { amountStr = extractField(body, 'Số tiền', 'Amount'); if (!amountStr) amountStr = extractField(plainText, 'Số tiền', 'Amount'); }
      amount = parseFloat(String(amountStr || "").replace(/[^\d]/g, '')) || 0;
  }

  // VALIDATION
  if (amount < 2000 || amount > 5000000000) return null; 

  // TYPE DETECTION (Income vs Expense)
  let type = 'EXPENSE';
  const isIncome = subject.includes('+') || body.includes('+') || body.includes('Ghi có') || body.includes('đã nhận') || body.includes('vào tài khoản');
  if (isIncome) type = 'INCOME';

  const newRow = new Array(rowLength).fill('');
  
  if (idx.id !== -1) newRow[idx.id] = id;
  if (idx.date !== -1) newRow[idx.date] = parsedDate.toISOString();
  if (idx.amount !== -1) newRow[idx.amount] = amount;
  if (idx.actual !== -1) newRow[idx.actual] = amount;
  if (idx.type !== -1) newRow[idx.type] = type;
  
  if (idx.category !== -1) newRow[idx.category] = sourceName;
  if (idx.description !== -1) newRow[idx.description] = description.substring(0, 250);
  if (idx.source !== -1) newRow[idx.source] = sourceName;
  if (idx.beneficiary !== -1) newRow[idx.beneficiary] = beneficiary;
  if (idx.accountNum !== -1) newRow[idx.accountNum] = accountNum;

  if (idx.status !== -1) newRow[idx.status] = 'SYNCED';
  if (idx.email !== -1) newRow[idx.email] = userEmail.toLowerCase().trim();
  
  return newRow;
}

function extractField(text, keyVi, keyEn) {
  const ViRegex = new RegExp(keyVi + '\\s*[:\\-]?\\s*([^\\n\\r<]+)', 'i');
  let match = text.match(ViRegex); if (match) return match[1].trim();
  const EnRegex = new RegExp(keyEn + '\\s*[:\\-]?\\s*([^\\n\\r<]+)', 'i');
  match = text.match(EnRegex); if (match) return match[1].trim();
  return '';
}

function getIndices(headers) {
  const h = headers.map(v => String(v).trim().toLowerCase());
  const find = (names) => { for (let name of names) { const i = h.indexOf(name.toLowerCase()); if (i !== -1) return i; } return -1; };
  return { id: find(['ID']), date: find(['Date', 'Ngày']), amount: find(['Amount']), type: find(['Type']), category: find(['Category']), description: find(['Description']), source: find(['Source']), status: find(['Status']), email: find(['UserEmail']), actual: find(['Actual']), projected: find(['Projected']), beneficiary: find(['Beneficiary', 'Người hưởng']), accountNum: find(['AccountNum', 'Số tài khoản']) };
}

function ensureSheet(ss, name, headers) {
  let sheet = ss.getSheetByName(name);
  if (!sheet) { sheet = ss.insertSheet(name); sheet.appendRow(headers); }
  return sheet;
}

// ==========================================
// 3. FINANCE CRUD
// ==========================================
function getFinanceTransactions(email) {
  const ss = SpreadsheetApp.openById(FINANCE_SPREADSHEET_ID);
  const transactionList = [];
  const user = email.toLowerCase().trim();

  // 1. Read from Financial_Transactions (Synced Data)
  const syncHeaders = ['ID', 'Date', 'Amount', 'Type', 'Category', 'Description', 'Source', 'Beneficiary', 'AccountNum', 'Status', 'UserEmail', 'Actual', 'Projected'];
  const syncSheet = ensureSheet(ss, 'Financial_Transactions', syncHeaders);
  const syncData = syncSheet.getDataRange().getValues();
  const syncIdx = getIndices(syncData[0]);
  
  for (let i = 1; i < syncData.length; i++) {
    const row = syncData[i];
    const rowEmail = row[syncIdx.email] ? String(row[syncIdx.email]).toLowerCase().trim() : "";
    if (rowEmail === user || rowEmail === "") {
        transactionList.push({ 
            id: row[syncIdx.id], 
            date: row[syncIdx.date], 
            amount: row[syncIdx.amount], 
            type: row[syncIdx.type], 
            category: row[syncIdx.category], 
            description: row[syncIdx.description], 
            source: row[syncIdx.source], 
            status: row[syncIdx.status], 
            actual: row[syncIdx.actual], 
            projected: row[syncIdx.projected],
            beneficiary: syncIdx.beneficiary !== -1 ? row[syncIdx.beneficiary] : '',
            accountNum: syncIdx.accountNum !== -1 ? row[syncIdx.accountNum] : ''
        });
    }
  }

  // 2. Read from Manual_Transactions (Manual Data)
  const manualSheet = ss.getSheetByName('Manual_Transactions');
  if (manualSheet) {
    const manualData = manualSheet.getDataRange().getValues();
    const manualIdx = getIndices(manualData[0]);
    
    for (let i = 1; i < manualData.length; i++) {
      const row = manualData[i];
      const rowEmail = row[manualIdx.email] ? String(row[manualIdx.email]).toLowerCase().trim() : "";
      if (rowEmail === user || rowEmail === "") {
          transactionList.push({ 
              id: row[manualIdx.id], 
              date: row[manualIdx.date], 
              amount: row[manualIdx.amount], 
              type: row[manualIdx.type], 
              category: row[manualIdx.category], 
              description: row[manualIdx.description], 
              source: row[manualIdx.source] || 'Tiền mặt', 
              status: row[manualIdx.status] || 'MANUAL', 
              actual: row[manualIdx.actual] || row[manualIdx.amount], 
              projected: row[manualIdx.projected] || 0,
              beneficiary: manualIdx.beneficiary !== -1 ? row[manualIdx.beneficiary] : '',
              accountNum: manualIdx.accountNum !== -1 ? row[manualIdx.accountNum] : ''
          });
      }
    }
  }

  return transactionList.sort((a, b) => new Date(b.date) - new Date(a.date));
}

function getFinanceSummary(email) {
  const transactions = getFinanceTransactions(email);
  let totalIncome = 0; let totalExpense = 0;
  transactions.forEach(t => { const amt = parseFloat(t.amount) || 0; if (t.type === 'INCOME') totalIncome += amt; else if (t.type === 'EXPENSE') totalExpense += amt; });
  return { totalIncome, totalExpense, netBalance: totalIncome - totalExpense };
}

function addManualTransaction(params) {
    const ss = SpreadsheetApp.openById(FINANCE_SPREADSHEET_ID);
    // Use Manual_Transactions sheet for manual entries
    const headers = ['ID', 'Date', 'Amount', 'Type', 'Category', 'Description', 'Source', 'Status', 'UserEmail', 'Actual', 'Projected'];
    const sheet = ensureSheet(ss, 'Manual_Transactions', headers);
    const id = 'MANUAL_' + new Date().getTime();
    
    const newRow = new Array(headers.length).fill('');
    const idx = getIndices(headers);
    
    if (idx.id !== -1) newRow[idx.id] = id;
    if (idx.date !== -1) newRow[idx.date] = params.date || new Date().toISOString();
    if (idx.amount !== -1) newRow[idx.amount] = params.amount;
    if (idx.type !== -1) newRow[idx.type] = params.type;
    if (idx.category !== -1) newRow[idx.category] = params.category;
    if (idx.description !== -1) newRow[idx.description] = params.description;
    if (idx.source !== -1) newRow[idx.source] = params.source || 'Tiền mặt';
    if (idx.status !== -1) newRow[idx.status] = 'MANUAL';
    if (idx.email !== -1) newRow[idx.email] = params.email;
    if (idx.actual !== -1) newRow[idx.actual] = params.amount;
    if (idx.projected !== -1) newRow[idx.projected] = 0;

    sheet.appendRow(newRow);
    return { success: true, id: id };
}

function deleteFinanceTransaction(email, id) {
    const ss = SpreadsheetApp.openById(FINANCE_SPREADSHEET_ID);
    const sheet = ss.getSheetByName('Financial_Transactions');
    const data = sheet.getDataRange().getValues();
    const idx = getIndices(data[0]);
    for (let i = 1; i < data.length; i++) { if (String(data[i][idx.id]) === String(id)) { sheet.deleteRow(i + 1); return { success: true }; } }
    return { error: 'Transaction not found' };
}

function updateFinanceTransaction(params) {
    const ss = SpreadsheetApp.openById(FINANCE_SPREADSHEET_ID);
    const sheet = ss.getSheetByName('Financial_Transactions');
    const data = sheet.getDataRange().getValues();
    const idx = getIndices(data[0]);
    for (let i = 1; i < data.length; i++) {
        if (String(data[i][idx.id]) === String(params.id)) {
            if (params.amount) sheet.getRange(i + 1, idx.amount + 1).setValue(params.amount);
            if (params.category) sheet.getRange(i + 1, idx.category + 1).setValue(params.category);
            return { success: true };
        }
    }
    return { error: 'Transaction not found' };
}

// ==========================================
// 4. TRADING LOGIC
// ==========================================

function checkRateLimit(email, action) {
  const cache = CacheService.getScriptCache();
  const key = `rl_${email}_${action}`;
  if (cache.get(key)) throw new Error('Bạn đang thao tác quá nhanh. Vui lòng đợi 2 giây.');
  cache.put(key, 'locked', 2);
}

function login(email, password) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName('Users');
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === email && data[i][3] === password) return { success: true, role: (email === 'admin@stocksim.com' || email === 'nbt1024@gmail.com') ? 'admin' : 'user', balance: data[i][1] };
  }
  return { error: 'Email hoặc mật khẩu không đúng' };
}

function register(email, password, otp) { 
  if (verifyOTP(email, otp).success === false) return { error: "OTP sai" };
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName('Users');
  sheet.appendRow([email, 0, new Date(), password]);
  return { success: true };
}

function resetPassword(email, password, otp) {
  if (verifyOTP(email, otp).success === false) return { error: "OTP sai" };
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName('Users');
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === email) { sheet.getRange(i+1, 4).setValue(password); return { success: true }; }
  }
  return { error: "Email không tồn tại" };
}

function getProfile(email) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName('Users');
  const user = sheet.getDataRange().getValues().find(row => row[0] === email);
  if (!user) throw new Error('Người dùng không tồn tại');
  const holdings = getHoldings(email);
  return { email: user[0], balance: user[1], holdings: holdings };
}

function sendOTP(email, type) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName('OTP') || ss.insertSheet('OTP');
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  sheet.appendRow([email, otp, new Date(new Date().getTime() + 300000)]);
  MailApp.sendEmail({ to: email, subject: 'StockSim OTP', htmlBody: `<h1>${otp}</h1>` });
  return { success: true };
}

function verifyOTP(email, userOtp) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName('OTP');
  const data = sheet.getDataRange().getValues();
  const row = data.find(r => r[0] === email && r[1].toString() === userOtp.toString());
  if (row) return { success: true };
  return { success: false, error: 'Sai OTP' };
}

function placeOrder(params) {
  const { email, symbol, quantity, type, side, price } = params;
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const userSheet = ss.getSheetByName('Users');
  const userData = userSheet.getDataRange().getValues();
  const uIdx = userData.findIndex(r => r[0] === email);
  if (uIdx === -1) throw new Error('User not found');
  
  let balance = userData[uIdx][1];
  const execPrice = price || getStockData(symbol).price;
  const total = execPrice * quantity;
  const fee = total * 0.0015;
  const finalTotal = side === 'BUY' ? total + fee : total - fee;
  
  if (side === 'BUY') {
     if (balance < finalTotal) throw new Error('Không đủ tiền');
     balance -= finalTotal;
     updateHolding(email, symbol, quantity, execPrice, 'BUY');
  } else {
     updateHolding(email, symbol, quantity, execPrice, 'SELL');
     balance += finalTotal;
  }
  userSheet.getRange(uIdx + 1, 2).setValue(balance);
  logTransaction(email, symbol, quantity, execPrice, side, type, fee, finalTotal, 0);
  addNotification(email, `Lệnh ${side} ${quantity} ${symbol} thành công khớp.`);
  return { success: true, balance: balance };
}

function updateHolding(email, symbol, quantity, price, side) {
   const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
   let sheet = ss.getSheetByName('Holdings') || ss.insertSheet('Holdings');
   const data = sheet.getDataRange().getValues();
   const idx = data.findIndex(r => r[0] === email && r[1] === symbol);
   if (idx === -1 && side === 'BUY') { sheet.appendRow([email, symbol, quantity, price]); }
   else if (idx !== -1) {
     let q = data[idx][2];
     if (side === 'BUY') sheet.getRange(idx+1, 3).setValue(q + quantity);
     else sheet.getRange(idx+1, 3).setValue(q - quantity);
   }
}

function getHoldings(email) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName('Holdings');
  if (!sheet) return [];
  return sheet.getDataRange().getValues().filter(r => r[0] === email).map(r => ({ symbol: r[1], quantity: r[2], avgPrice: r[3] }));
}

function getStockData(symbol) {
   const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
   let fetchSheet = ss.getSheetByName('PriceFetcher');
   if(!fetchSheet) { fetchSheet = ss.insertSheet('PriceFetcher'); fetchSheet.appendRow(['Mã', 'Link', 'Price']); }
   const data = fetchSheet.getDataRange().getValues();
   const row = data.find(r => r[0] === symbol.toUpperCase());
   if(row && row[2]) return { price: row[2], symbol: symbol, change: 0, pctChange: 0 };
   try {
    const url = `https://wgateway-finfo.ssi.com.vn/quotes/daily?symbol=${symbol}`;
    const res = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
    const json = JSON.parse(res.getContentText());
    if (json && json.data && json.data.length > 0) {
      const s = json.data[0];
      return { price: s.lastPrice * 1000, symbol: symbol, change: (s.lastPrice - s.priorClose) * 1000, pctChange: (((s.lastPrice - s.priorClose) / s.priorClose) * 100).toFixed(2), high: s.highest * 1000, low: s.lowest * 1000, volume: s.totalVol };
    }
   } catch(e) {}
   return { price: 10000, symbol: symbol, error: "Mock Data" };
}

function getStockHistory(symbol) { return { error: "Not implemented" }; }

function getHistory(email) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName('History');
  if (!sheet) return [];
  return sheet.getDataRange().getValues().filter(r => r[1] === email).map(r => ({ date: r[0], email: r[1], symbol: r[2], quantity: r[3], price: r[4], side: r[5], type: r[6], fee: r[7], total: r[8], pnl: r[9] }));
}

function deleteTradingTransaction(email, id) { return { success: true }; }

function depositFunds(params) { 
   const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
   const sheet = ss.getSheetByName('Users');
   const data = sheet.getDataRange().getValues();
   const idx = data.findIndex(r => r[0] === params.email);
   if (idx !== -1) {
      const bal = data[idx][1] + params.amount;
      sheet.getRange(idx+1, 2).setValue(bal);
      logTransaction(params.email, 'DEPOSIT', 0, 0, 'IN', 'CASH', 0, params.amount, 0);
      return { success: true, balance: bal };
   }
   return { error: 'User not found' };
}
function adjustBalance(params) { return depositFunds(params); }

function getNotifications(email) { 
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName('Notifications');
  if(!sheet) return [];
  return sheet.getDataRange().getValues().filter(r => r[1] === email).map(r => ({ date: r[0], message: r[2], isRead: r[3] })).reverse().slice(0, 20);
}
function markNotificationsRead(email) { return { success: true }; }
function refreshStockPrices() { return { success: true }; }

function logTransaction(email, symbol, quantity, price, side, type, fee, total, pnl) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = ss.getSheetByName('History') || ss.insertSheet('History');
  if (sheet.getLastRow() === 0) sheet.appendRow(['Date', 'Email', 'Symbol', 'Quantity', 'Price', 'Side', 'Type', 'Fee', 'Total', 'PnL']);
  sheet.appendRow([new Date(), email, symbol, quantity, price, side, type, fee, total, pnl]);
}

function addNotification(email, message) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = ss.getSheetByName('Notifications');
  if (!sheet) { sheet = ss.insertSheet('Notifications'); sheet.appendRow(['Date', 'Email', 'Message', 'IsRead']); }
  sheet.appendRow([new Date(), email, message, false]);
}

// === HÀM HỖ TRỢ CẤP QUYỀN (CHẠY 1 LẦN TRONG EDITOR) ===
function _CAP_QUYEN_TRUY_CAP() {
  console.log("Đang yêu cầu cấp quyền...");
  UrlFetchApp.fetch("https://www.google.com");
  GmailApp.getInboxThreads(0, 1);
  SpreadsheetApp.getActive();
}

// === HÀM DEBUG ID EMAIL (FOR USER) ===
function DEBUG_GMAIL_ID() {
  const query = 'from:info@myvib.vib.com.vn newer_than:90d';
  console.log(`Đang tìm kiếm email với query: "${query}"...`);
  const threads = GmailApp.search(query, 0, 50);
  console.log(`Tìm thấy ${threads.length} chuỗi thư.`);
  
  threads.forEach(t => {
    t.getMessages().forEach(m => {
      console.log('--------------------------------------------------');
      console.log(`Tittle: ${m.getSubject()}`);
      console.log(`Date: ${m.getDate()}`);
      console.log(`ID: EMAIL_${m.getId()}`);
      // console.log(`Body Snippet: ${m.getPlainBody().substring(0, 100)}...`);
    });
  });
  console.log('--------------------------------------------------');
  console.log('Done. Copy ID trên để kiểm tra trong Sheet.');
}
