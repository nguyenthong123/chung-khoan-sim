/**
 * Master Script: Stock Trading SIM + Finance Management
 * Unified backend for StockSim Pro
 */

const TRADING_SPREADSHEET_ID = '11ndIWy9yteJQFuWO4rssp3_8YJ-rYZgpJ1cLuLVQuy8';
const FINANCE_SPREADSHEET_ID = '1mKriBf9F_MST3nCe66b7675Ha6DxdYZ_EuPij2mU_MY';
const API_SECRET_KEY = 'STOCKS_SIM_SECURE_V1_2024_@SEC';

function doGet(e) {
  return response({ error: 'Truy cập bị từ chối. Vui lòng sử dụng ứng dụng khách hợp lệ.' }, 403);
}

function doPost(e) {
  const params = JSON.parse(e.postData.contents);
  const action = params.action;
  
  // 1. Bảo mật: Kiểm tra API Key
  if (params.apiKey !== API_SECRET_KEY) {
    return response({ error: 'API Key không hợp lệ.' }, 401);
  }

  const email = params.email || 'anonymous';
  
  try {
    // Chống Spam/DDoS
    const criticalActions = ['placeOrder', 'deposit', 'deleteTransaction', 'sendOTP', 'verifyOTP', 'syncGmailReceipts'];
    if (criticalActions.includes(action)) {
      checkRateLimit(email, action);
    }

    switch (action) {
      // --- AUTH & PROFILE ---
      case 'login':
        return response(login(params.email, params.password));
      case 'register':
        return response(register(params.email, params.password, params.otp));
      case 'resetPassword':
        return response(resetPassword(params.email, params.password, params.otp));
      case 'getProfile':
        return response(getProfile(params.email));
      case 'sendOTP':
        return response(sendOTP(params.email, params.type));
      case 'verifyOTP':
        return response(verifyOTP(params.email, params.otp));
      
      // --- TRADING LOGIC ---
      case 'placeOrder':
        return response(placeOrder(params));
      case 'getHoldings':
        return response(getHoldings(params.email));
      case 'getHistory':
        return response(getHistory(params.email));
      case 'deleteTransaction':
        return response(deleteTransaction(params.email, params.id));
      case 'deposit':
        return response(depositFunds(params));
      case 'getStockData':
        return response(getStockData(params.symbol));
      case 'getStockHistory':
        return response(getStockHistory(params.symbol));
      
      // --- NOTIFICATIONS ---
      case 'getNotifications':
        return response(getNotifications(params.email));
      case 'markNotificationsRead':
        return response(markNotificationsRead(params.email));

      // --- FINANCE & GMAIL SYNC ---
      case 'syncGmailReceipts':
        return response(syncGmailReceipts(params.email));
      case 'getFinanceSummary':
        return response(getFinanceSummary(params.email));
      case 'getFinanceTransactions':
        return response(getFinanceTransactions(params.email));
      case 'addManualTransaction':
        return response(addManualTransaction(params));

      default:
        return response({ error: 'Hành động ' + action + ' không tồn tại' }, 400);
    }
  } catch (err) {
    return response({ error: err.message }, 500);
  }
}

function response(data, code = 200) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

function checkRateLimit(email, action) {
  const cache = CacheService.getScriptCache();
  const key = `rl_${email}_${action}`;
  const isLocked = cache.get(key);
  if (isLocked) throw new Error('Bạn đang thao tác quá nhanh. Vui lòng đợi 2 giây.');
  cache.put(key, 'locked', 2);
}

// ==========================================
// SECTION 1: TRADING LOGIC (backend.gs)
// ==========================================

function login(email, password) {
  if (!email || !password) throw new Error('Vui lòng điền đủ email và mật khẩu');
  const ss = SpreadsheetApp.openById(TRADING_SPREADSHEET_ID);
  const sheet = ss.getSheetByName('Users');
  const data = sheet.getDataRange().getValues();
  const user = data.find(row => row[0] === email);
  if (!user) throw new Error('Người dùng không tồn tại');
  if (user[3].toString() !== password.toString()) throw new Error('Mật khẩu không chính xác');
  return { success: true };
}

function register(email, password, otp) {
  const v = verifyOTP(email, otp);
  if (!v.success) return v;
  const ss = SpreadsheetApp.openById(TRADING_SPREADSHEET_ID);
  const sheet = ss.getSheetByName('Users');
  const data = sheet.getDataRange().getValues();
  if (data.some(row => row[0] === email)) throw new Error('Email đã tồn tại');
  sheet.appendRow([email, 100000000, new Date(), password]);
  return { success: true };
}

function getProfile(email) {
  const ss = SpreadsheetApp.openById(TRADING_SPREADSHEET_ID);
  const userSheet = ss.getSheetByName('Users');
  const userData = userSheet.getDataRange().getValues();
  const user = userData.find(row => row[0] === email);
  if (!user) throw new Error('Không tìm thấy người dùng');

  const holdings = getHoldings(email);
  const history = getHistory(email);
  
  // Logic tính toán tài sản... (Rút gọn từ backend.gs)
  let stockValue = 0;
  holdings.forEach(h => { stockValue += h.quantity * h.avgPrice; });

  return {
    email: user[0],
    balance: user[1],
    holdings: holdings,
    totalAssets: user[1] + stockValue,
    recentHistory: history.slice(0, 5)
  };
}

function getStockData(symbol) {
  // Logic lấy giá từ SSI/Vietstock...
  try {
    const url = `https://wgateway-finfo.ssi.com.vn/quotes/daily?symbol=${symbol}`;
    const res = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
    const json = JSON.parse(res.getContentText());
    if (json && json.data && json.data.length > 0) {
      const s = json.data[0];
      return { symbol, price: s.lastPrice * 1000, change: (s.lastPrice - s.priorClose) * 1000 };
    }
  } catch(e) {}
  return { error: 'Không lấy được giá' };
}

function placeOrder(params) {
  // Logic đặt lệnh...
  return { success: true };
}

function getHoldings(email) {
  const ss = SpreadsheetApp.openById(TRADING_SPREADSHEET_ID);
  const sheet = ss.getSheetByName('Holdings');
  if (!sheet) return [];
  const data = sheet.getDataRange().getValues();
  return data.filter(r => r[0] === email).map(r => ({ symbol: r[1], quantity: r[2], avgPrice: r[3] }));
}

function getHistory(email) {
  const ss = SpreadsheetApp.openById(TRADING_SPREADSHEET_ID);
  const sheet = ss.getSheetByName('History');
  if (!sheet) return [];
  const data = sheet.getDataRange().getValues();
  return data.filter(r => r[1] === email).map(r => ({ date: r[0], symbol: r[2], side: r[3], quantity: r[5], price: r[6], total: r[8] })).reverse();
}

function sendOTP(email, type) { /* ... Logic gửi OTP ... */ return { success: true }; }
function verifyOTP(email, otp) { /* ... Logic xác thực OTP ... */ return { success: true }; }

// ==========================================
// SECTION 2: FINANCE LOGIC (finance.gs)
// ==========================================

function syncGmailReceipts(userEmail) {
  const query = 'from:VCBDigibank "Biên lai chuyển tiền"';
  const threads = GmailApp.search(query, 0, 10);
  const ss = SpreadsheetApp.openById(FINANCE_SPREADSHEET_ID);
  let sheet = ss.getSheetByName('Financial_Transactions') || ss.insertSheet('Financial_Transactions');
  
  let syncCount = 0;
  threads.forEach(thread => {
    const msg = thread.getMessages()[0];
    const body = msg.getBody();
    const orderNum = extractField(body, 'Số lệnh giao dịch', 'Order Number');
    
    // Check duplication
    const data = sheet.getDataRange().getValues();
    if (data.some(r => r[0] == orderNum)) return;

    const amount = parseFloat(extractField(body, 'Số tiền', 'Amount').replace(/[^0-9]/g, ''));
    const note = extractField(body, 'Nội dung chuyển tiền', 'Details of Payment');
    
    sheet.appendRow([orderNum, new Date(), amount, 'EXPENSE', 'Bank Transfer', note, 'Vietcombank', '', '', 'SYNCED']);
    syncCount++;
  });
  return { success: true, syncCount };
}

function extractField(html, labelVi, labelEn) {
  const regex = new RegExp(`(?:${labelVi}|${labelEn})[\\s\\S]*?<td[^>]*>([\\s\\S]*?)</td>`, 'i');
  const match = html.match(regex);
  return match ? match[1].replace(/<[^>]*>/g, '').trim() : '';
}

function getFinanceSummary(email) {
  const ss = SpreadsheetApp.openById(FINANCE_SPREADSHEET_ID);
  const sheet = ss.getSheetByName('Financial_Transactions');
  if (!sheet) return { monthlyIncome: 0, monthlyExpense: 0, balance: 0, categories: [] };
  
  const data = sheet.getDataRange().getValues();
  let income = 0, expense = 0;
  data.slice(1).forEach(r => {
    if (r[3] === 'INCOME') income += r[2];
    else expense += r[2];
  });
  
  return {
    monthlyIncome: income / 1000,
    monthlyExpense: expense / 1000,
    balance: (income - expense) / 1000,
    categories: [{ name: 'Bank Transfer', amount: expense }]
  };
}

function getFinanceTransactions(email) {
  const ss = SpreadsheetApp.openById(FINANCE_SPREADSHEET_ID);
  const sheet = ss.getSheetByName('Financial_Transactions');
  if (!sheet) return [];
  const data = sheet.getDataRange().getValues();
  return data.slice(1).map(r => ({ id: r[0], date: r[1], amount: r[2], type: r[3], category: r[4], description: r[5], source: r[6] })).reverse();
}

function addManualTransaction(params) {
  const ss = SpreadsheetApp.openById(FINANCE_SPREADSHEET_ID);
  const sheet = ss.getSheetByName('Financial_Transactions') || ss.insertSheet('Financial_Transactions');
  sheet.appendRow(['MANUAL_' + new Date().getTime(), new Date(), params.amount, params.type, params.category, params.description, 'Manual', '', '', 'COMPLETED']);
  return { success: true };
}

// Notifications... (Rút gọn)
function getNotifications(email) { return []; }
function markNotificationsRead(email) { return { success: true }; }
function getStockHistory(symbol) { return { history: [] }; }
