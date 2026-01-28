/**
 * Google Apps Script Backend for Stock Trading App
 * Sheet ID: https://docs.google.com/spreadsheets/d/11ndIWy9yteJQFuWO4rssp3_8YJ-rYZgpJ1cLuLVQuy8/edit
 */

const SPREADSHEET_ID = '11ndIWy9yteJQFuWO4rssp3_8YJ-rYZgpJ1cLuLVQuy8';
const API_SECRET_KEY = 'STOCKS_SIM_SECURE_V1_2024_@SEC';

function doGet(e) {
  return response({ error: 'Truy cập bị từ chối. Vui lòng sử dụng ứng dụng khách hợp lệ.' }, 403);
}

function doPost(e) {
  const params = JSON.parse(e.postData.contents);
  const action = params.action;
  
  // 0. Đảm bảo cấu trúc các Sheet chính xác
  ensureHeaders();

  // 1. Kiểm tra API Key (Bảo mật lớp ngoài)
  if (params.apiKey !== API_SECRET_KEY) {
    return response({ error: 'API Key không hợp lệ.' }, 401);
  }
  const email = params.email || 'anonymous';
  
  try {
    // Chống Spam/DDoS: Giới hạn 2 giây mới được gửi 1 request cho các hành động quan trọng
    const criticalActions = ['placeOrder', 'deposit', 'deleteTransaction', 'sendOTP', 'verifyOTP'];
    if (criticalActions.includes(action)) {
      checkRateLimit(email, action);
    }

    switch (action) {
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
      case 'getNotifications':
        return response(getNotifications(params.email));
      case 'markNotificationsRead':
        return response(markNotificationsRead(params.email));
      case 'getStockData':
        return response(getStockData(params.symbol));
      case 'getStockHistory':
        return response(getStockHistory(params.symbol));
      case 'refreshStockPrices':
        return response(refreshStockPrices());
      default:
        return response({ error: 'Invalid action' }, 400);
    }
  } catch (err) {
    return response({ error: err.message }, 500);
  }
}

function ensureHeaders() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  
  // 1. Sheet Users
  const userSheet = ss.getSheetByName('Users') || ss.insertSheet('Users');
  if (userSheet.getLastRow() === 0 || userSheet.getRange(1, 4).getValue() !== 'Password') {
    userSheet.getRange(1, 1, 1, 4).setValues([['Email', 'Balance', 'CreatedAt', 'Password']]);
  }
  
  // 2. Sheet OTP
  const otpSheet = ss.getSheetByName('OTP') || ss.insertSheet('OTP');
  if (otpSheet.getLastRow() === 0) {
    otpSheet.appendRow(['Email', 'OTP', 'Expiry']);
  }

  // 3. Sheet Notifications
  const notifSheet = ss.getSheetByName('Notifications') || ss.insertSheet('Notifications');
  if (notifSheet.getLastRow() === 0) {
    notifSheet.appendRow(['Date', 'Email', 'Message', 'IsRead']);
  }

  // 4. Sheet PriceFetcher (Đảm bảo có cột K để Refresh)
  const fetchSheet = ss.getSheetByName('PriceFetcher') || ss.insertSheet('PriceFetcher');
  if (fetchSheet.getLastRow() === 0) {
    fetchSheet.getRange(1, 1, 1, 11).setValues([['Mã', 'Link', 'Công thức lấy giá', '', '', '', '', '', '', '', 'FORCE REFRESH']]);
  } else if (fetchSheet.getRange(1, 11).getValue() !== 'FORCE REFRESH') {
    fetchSheet.getRange(1, 11).setValue('FORCE REFRESH');
  }
}

function checkRateLimit(email, action) {
  const cache = CacheService.getScriptCache();
  const key = `rl_${email}_${action}`;
  const isLocked = cache.get(key);
  
  if (isLocked) {
    throw new Error('Bạn đang thao tác quá nhanh. Vui lòng đợi 2 giây.');
  }
  
  // Khóa trong 2 giây
  cache.put(key, 'locked', 2);
}

function depositFunds(params) {
  const { email, amount } = params;
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const userSheet = ss.getSheetByName('Users');
  const data = userSheet.getDataRange().getValues();
  const rowIndex = data.findIndex(row => row[0] === email);
  
  if (rowIndex === -1) throw new Error('Người dùng không tồn tại');
  
  const currentBalance = (data[rowIndex][1] || 0);
  const newBalance = currentBalance + amount;
  userSheet.getRange(rowIndex + 1, 2).setValue(newBalance);
  
  // 1. Lưu vào Sheet "Deposits" riêng biệt
  let depSheet = ss.getSheetByName('Deposits');
  if (!depSheet) {
    depSheet = ss.insertSheet('Deposits');
    depSheet.appendRow(['Date', 'Email', 'Amount']);
  }
  depSheet.appendRow([new Date(), email, amount]);
  
  // 2. Vẫn log một bản sao vào History để hiển thị trong "Hoạt động gần đây"
  logTransaction(email, 'DEPOSIT', 1, amount, 'IN', 'CASH', 0, amount, 0);

  // 3. THÔNG BÁO
  addNotification(email, `Nạp tiền thành công: +${amount.toLocaleString('vi-VN')} đ`);
  
  return { success: true, balance: newBalance };
}

/**
 * LẤY BẢNG THỐNG KÊ GIAO DỊCH - TỐI ƯU ĐA NGƯỜI DÙNG
 */
function getStockHistory(symbol) {
  if (!symbol) return { error: 'Mã không được để trống' };
  const cleanSymbol = symbol.toUpperCase().trim();
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const now = new Date();
  const dateToday = Utilities.formatDate(now, "GMT+7", "yyyy-MM-dd");

  // 1. KIỂM TRA BỘ NHỚ ĐỆM (CACHE)
  let cacheSheet = ss.getSheetByName('HistoryCache');
  if (!cacheSheet) {
    cacheSheet = ss.insertSheet('HistoryCache');
    cacheSheet.appendRow(['Mã', 'Dữ liệu JSON', 'Ngày cập nhật']);
  }

  const cacheData = cacheSheet.getDataRange().getValues();
  const cachedRow = cacheData.find(row => row[0] === cleanSymbol);

  // Nếu đã có dữ liệu trong ngày hôm nay, trả về luôn (Cực nhanh)
  if (cachedRow && cachedRow[2] === dateToday) {
    try {
      return { symbol: cleanSymbol, history: JSON.parse(cachedRow[1]), source: 'Cache' };
    } catch(e) { /* Lỗi JSON thì lấy lại */ }
  }

  // 2. NẾU CHƯA CÓ HOẶC DỮ LIỆU CŨ -> LẤY MỚI (DÙNG LOCK ĐỂ TRÁNH XUNG ĐỘT)
  const lock = LockService.getScriptLock();
  try {
    // Đợi tối đa 10 giây để lấy quyền truy cập
    lock.waitLock(10000);

    let fetchSheet = ss.getSheetByName('HistoryFetcher');
    if (!fetchSheet) fetchSheet = ss.insertSheet('HistoryFetcher');
    
    // Tìm link
    let url = `https://finance.vietstock.vn/${cleanSymbol}-ctcp.htm`;
    const dataSheet = ss.getSheetByName('data');
    if (dataSheet) {
      const dr = dataSheet.getDataRange().getValues();
      const f = dr.find(r => r[0].toString().toUpperCase() === cleanSymbol);
      if (f && f[1]) url = f[1];
    }

    // Ghi công thức vào ô A1 của sheet Fetcher
    fetchSheet.clear();
    fetchSheet.getRange("A1").setFormula(`=IMPORTHTML("${url}"; "table"; 3)`);
    SpreadsheetApp.flush();
    Utilities.sleep(2500); // Đợi lấy data

    const data = fetchSheet.getDataRange().getValues();
    if (!data || data.length <= 1) throw new Error("Dữ liệu trống");

    // Parse dữ liệu
    const history = data.slice(1, 6).map(row => {
      let dateStr = "";
      if (row[0] instanceof Date) {
        dateStr = Utilities.formatDate(row[0], "GMT+7", "dd/MM");
      } else {
        dateStr = row[0].toString().substring(0, 5);
      }
      return {
        date: dateStr,
        price: parseFloat(row[1].toString().replace(',', '.')) * 1000,
        change: row[2],
        volume: row[3],
        foreignBuy: row[6],
        foreignSell: row[7]
      };
    });

    // Cập nhật vào Cache để dùng chung cho mọi người
    if (cachedRow) {
      const rowIndex = cacheData.findIndex(r => r[0] === cleanSymbol) + 1;
      cacheSheet.getRange(rowIndex, 2).setValue(JSON.stringify(history));
      cacheSheet.getRange(rowIndex, 3).setValue(dateToday);
    } else {
      cacheSheet.appendRow([cleanSymbol, JSON.stringify(history), dateToday]);
    }

    lock.releaseLock();
    return { symbol: cleanSymbol, history, source: 'Vietstock' };

  } catch (e) {
    lock.releaseLock();
    return { error: "Máy chủ đang bận hoặc lỗi: " + e.message };
  }
}

// --- OTP LOGIC ---

function sendOTP(email, type = 'register') {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName('OTP') || ss.insertSheet('OTP');
  
  // Check user existence for reset
  if (type === 'reset') {
    const userSheet = ss.getSheetByName('Users');
    const userData = userSheet.getDataRange().getValues();
    if (!userData.some(row => row[0] === email)) {
      throw new Error('Email chưa được đăng ký trong hệ thống.');
    }
  }

  if (sheet.getLastRow() === 0) {
    sheet.appendRow(['Email', 'OTP', 'Expiry']);
  }
  
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const expiry = new Date(new Date().getTime() + 5 * 60000); // 5 minutes expiry
  
  const data = sheet.getDataRange().getValues();
  const rowIndex = data.findIndex(row => row[0] === email);
  
  if (rowIndex !== -1) {
    sheet.getRange(rowIndex + 1, 2).setValue(otp);
    sheet.getRange(rowIndex + 1, 3).setValue(expiry);
  } else {
    sheet.appendRow([email, otp, expiry]);
  }
  
  const subject = type === 'reset' ? '[StockSim] Khôi phục mật khẩu' : '[StockSim] Mã xác nhận đăng ký tài khoản';
  const title = type === 'reset' ? 'Khôi phục mật khẩu StockSim' : 'Xác nhận đăng ký StockSim';
  const desc = type === 'reset' ? 'Bạn đã yêu cầu đặt lại mật khẩu. Vui lòng sử dụng mã OTP dưới đây:' : 'Để hoàn tất việc tạo tài khoản, vui mã nhập mã OTP dưới đây vào hệ thống:';

  // Send Email
  MailApp.sendEmail({
    to: email,
    subject: subject,
    htmlBody: `
      <div style="font-family: sans-serif; max-width: 500px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
        <h2 style="color: #3B82F6; text-align: center;">${title}</h2>
        <p>Chào bạn,</p>
        <p>${desc}</p>
        <div style="background: #f3f4f6; padding: 15px; text-align: center; font-size: 24px; font-weight: bold; letter-spacing: 5px; color: #1e293b; border-radius: 8px; margin: 20px 0;">
          ${otp}
        </div>
        <p style="color: #64748b; font-size: 12px; text-align: center;">Mã này sẽ hết hạn trong vòng 5 phút.</p>
        <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
        <p style="color: #94a3b8; font-size: 11px; text-align: center;">Nếu bạn không yêu cầu mã này, vui lòng bỏ qua email này.</p>
      </div>
    `
  });
  
  return { success: true };
}

function verifyOTP(email, userOtp) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName('OTP');
  if (!sheet) return { success: false, error: 'Chưa có mã được gửi' };
  
  const data = sheet.getDataRange().getValues();
  const row = data.find(r => r[0] === email);
  
  if (!row) return { success: false, error: 'Mã không tồn tại' };
  
  const [dbEmail, dbOtp, dbExpiry] = row;
  const now = new Date();
  
  if (dbOtp.toString() !== userOtp.toString()) {
    return { success: false, error: 'Mã xác nhận không đúng' };
  }
  
  if (now > new Date(dbExpiry)) {
    return { success: false, error: 'Mã đã hết hạn' };
  }
  
  // Verified!
  return { success: true };
}

function response(data, code = 200) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

// --- CORE LOGIC ---

/**
 * Fetches real-time stock data from VNDirect API
 * MUCH faster and more reliable than IMPORTXML
 */
function getStockData(symbol) {
  if (!symbol) return { error: 'Mã không được để trống' };
  const cleanSymbol = symbol.toUpperCase().trim();
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  
  // 1. TÌM LINK TỪ SHEET 'data'
  let vietstockUrl = "";
  const dataSheet = ss.getSheetByName('data') || ss.getSheetByName('Data');
  if (dataSheet) {
    const dataRows = dataSheet.getDataRange().getValues();
    const foundRow = dataRows.find(row => row[0].toString().toUpperCase() === cleanSymbol);
    if (foundRow && foundRow[1]) vietstockUrl = foundRow[1];
  }

  if (!vietstockUrl) {
    vietstockUrl = `https://finance.vietstock.vn/${cleanSymbol}-ctcp.htm`;
  }

  // 2. SỬ DỤNG SHEET 'PriceFetcher'
  let fetchSheet = ss.getSheetByName('PriceFetcher');
  if (!fetchSheet) {
    fetchSheet = ss.insertSheet('PriceFetcher');
    fetchSheet.appendRow(['Mã', 'Link', 'Công thức lấy giá']);
  }

  const fetchRows = fetchSheet.getDataRange().getValues();
  let rowIndex = -1;
  
  // Tìm chính xác hàng của mã đó (0-indexed)
  for (let i = 0; i < fetchRows.length; i++) {
    if (fetchRows[i][0].toString().toUpperCase() === cleanSymbol) {
      rowIndex = i;
      break;
    }
  }

  // Lấy giá trị checkbox ở cột K (cột 11)
  const refreshSignal = fetchSheet.getRange(1, 11).getValue();

  let finalRowNumber = -1;
  if (rowIndex === -1) {
    // Nếu chưa có, append hàng mới. Sử dụng tham số ?v= để ép cập nhật khi checkbox thay đổi
    const formula = `=IFERROR(PRODUCT(IMPORTXML(CONCATENATE("${vietstockUrl}"; "?v="; $K$1); "//*[@id='stockprice']/span[1]"); 1000); 0)`;
    fetchSheet.appendRow([cleanSymbol, vietstockUrl, formula]);
    finalRowNumber = fetchSheet.getLastRow();
  } else {
    // Nếu có rồi, hàng trong sheet = index + 1
    finalRowNumber = rowIndex + 1;
    // Cập nhật lại công thức để luôn bám theo ô K1
    const formula = `=IFERROR(PRODUCT(IMPORTXML(CONCATENATE("${vietstockUrl}"; "?v="; $K$1); "//*[@id='stockprice']/span[1]"); 1000); 0)`;
    fetchSheet.getRange(finalRowNumber, 3).setFormula(formula);
  }

  // 3. ĐỢI DỮ LIỆU
  SpreadsheetApp.flush();
  Utilities.sleep(1000); 
  
  // Lấy giá trị chính xác từ hàng đã xác định, cột 3
  const price = fetchSheet.getRange(finalRowNumber, 3).getValue();

  if (!price || price === 0) {
    return getStockDataSSI(cleanSymbol);
  }

  return {
    source: 'Vietstock (IMPORTXML)',
    symbol: cleanSymbol,
    price: price,
    change: 0,
    pctChange: "0.00",
    high: 0,
    low: 0,
    volume: 0
  };
}

function getStockDataSSI(symbol) {
  try {
    const url = `https://wgateway-finfo.ssi.com.vn/quotes/daily?symbol=${symbol}`;
    const res = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
    const json = JSON.parse(res.getContentText());
    if (json && json.data && json.data.length > 0) {
      const s = json.data[0];
      return {
        source: 'SSI',
        symbol: symbol,
        price: s.lastPrice * 1000,
        change: (s.lastPrice - s.priorClose) * 1000,
        pctChange: (((s.lastPrice - s.priorClose) / s.priorClose) * 100).toFixed(2),
        high: s.highest * 1000,
        low: s.lowest * 1000,
        volume: s.totalVol
      };
    }
  } catch(e) {}
  return { error: `Mã ${symbol} không tồn tại hoặc lỗi.` };
}

/**
 * ÉP LÀM MỚI GIÁ TỪ WEB
 * Toggles the checkbox in K1 of PriceFetcher to break cache
 */
function refreshStockPrices() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName('PriceFetcher');
  if (!sheet) return { success: false, error: 'PriceFetcher sheet not found' };
  
  const range = sheet.getRange(1, 11); // K1
  const currentValue = range.getValue();
  
  // Toggle giá trị
  range.setValue(!currentValue);
  
  // Flush để đảm bảo công thức chạy lại ngay
  SpreadsheetApp.flush();
  
  return { success: true, newValue: !currentValue };
}

function getProfile(email) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName('Users') || ss.insertSheet('Users');
  
  // Check if headers exist
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(['Email', 'Balance', 'CreatedAt', 'Password']);
  }
  
  const data = sheet.getDataRange().getValues();
  let user = data.find(row => row[0] === email);
  
  if (!user) {
    // We don't auto-create anymore for security. 
    // Registration must happen through the 'register' action.
    throw new Error('Người dùng không tồn tại. Vui lòng đăng ký.');
  }
  
  const holdings = getHoldings(email);
  const history = getHistory(email);
  
  // 1. Tính Tổng vốn đã nạp (100M + Deposits từ cả History và Deposits sheet)
  let totalInvestment = 100000000;
  const recordedDeposits = new Set(); // Dùng để tránh cộng trùng

  // Quét từ Deposits sheet (Nguồn chính mới)
  const depSheet = ss.getSheetByName('Deposits');
  if (depSheet) {
    const depData = depSheet.getDataRange().getValues();
    depData.forEach((row, idx) => {
      if (idx === 0) return;
      if (row[1] === email) {
        const amt = parseFloat(row[2].toString().replace(/\./g, '').replace(',', '.'));
        const key = `${row[0].toString()}_${amt}`; // Unique key by date and amount
        if (!recordedDeposits.has(key)) {
          totalInvestment += amt;
          recordedDeposits.add(key);
        }
      }
    });
  }

  // Quét từ History sheet (Nguồn cũ để đối soát)
  history.forEach(h => {
    if (h.symbol === 'DEPOSIT') {
      const key = `${h.date.toString()}_${h.total}`;
      if (!recordedDeposits.has(key)) {
        totalInvestment += h.total;
        recordedDeposits.add(key);
      }
    }
  });

  // 2. Tính Lợi nhuận đã chốt & Tổng phí
  let realizedPnL = 0;
  let totalFees = 0;
  history.forEach(h => {
    if (h.side === 'SELL') realizedPnL += h.pnl;
    totalFees += (h.fee || 0);
  });

  // 3. Lấy tất cả giá từ PriceFetcher một lần duy nhất để tối ưu tốc độ
  const priceSheet = ss.getSheetByName('PriceFetcher');
  const priceMap = {};
  if (priceSheet) {
    const pData = priceSheet.getDataRange().getValues();
    pData.forEach((row, idx) => {
      if (idx === 0) return;
      priceMap[row[0].toString().toUpperCase()] = parseFloat(row[2]);
    });
  }

  // 4. Tính Lợi nhuận tạm tính cho từng mã & Tổng giá trị
  let stockValue = 0;
  let unrealizedPnL = 0;
  
  const enrichedHoldings = holdings.map(h => {
    const currentPrice = priceMap[h.symbol] || h.avgPrice;
    const value = h.quantity * currentPrice;
    const cost = h.quantity * h.avgPrice;
    const pnl = value - cost;
    const pnlPct = h.avgPrice > 0 ? (pnl / cost) * 100 : 0;
    
    stockValue += value;
    unrealizedPnL += pnl;
    
    return {
      ...h,
      currentPrice: currentPrice,
      value: value,
      pnl: pnl,
      pnlPct: pnlPct
    };
  });

  const totalAssets = user[1] + stockValue;

  return {
    email: user[0],
    balance: user[1],
    holdings: enrichedHoldings,
    recentHistory: history.slice(0, 10),
    totalAssets: totalAssets,
    totalInvestment: totalInvestment,
    realizedPnL: realizedPnL,
    unrealizedPnL: unrealizedPnL,
    totalFees: totalFees,
    totalPnL: totalAssets - totalInvestment
  };
}

function getHoldings(email) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName('Holdings') || ss.insertSheet('Holdings');
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(['Email', 'Symbol', 'Quantity', 'AvgPrice']);
    return [];
  }
  
  const data = sheet.getDataRange().getValues();
  return data
    .filter(row => row[0] === email && row[2] > 0)
    .map(row => ({
      symbol: row[1],
      quantity: row[2],
      avgPrice: row[3]
    }));
}

const FEE_BUY = 0.0015; // 0.15%
const FEE_SELL = 0.002;  // 0.2% (Fee + Tax)

function placeOrder(params) {
  const { email, symbol, quantity, type, side, price } = params;
  
  // 1. Bảo mật: Xác thực người dùng (Chống giả danh email)
  const activeUserEmail = Session.getActiveUser().getEmail();
  if (activeUserEmail && activeUserEmail !== email) {
    throw new Error('Cảnh báo bảo mật: Phiên làm việc không hợp lệ');
  }

  // 2. Kiểm tra dữ liệu đầu vào nghiêm ngặt
  if (!symbol || symbol.length < 3) throw new Error('Mã chứng khoán không hợp lệ');
  if (!Number.isInteger(quantity) || quantity <= 0) throw new Error('Số lượng phải là số nguyên dương');
  if (price <= 0) throw new Error('Giá đặt phải lớn hơn 0');
  
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  
  // 3. Tự động ép làm mới giá trước khi đặt lệnh để đảm bảo giá chính xác nhất
  refreshStockPrices();
  Utilities.sleep(1500); // Đợi 1.5s để Google Sheets kịp cào lại giá mới

  const liveData = getStockData(symbol);
  if (liveData.error) throw new Error('Cổ phiếu không tồn tại');
  
  const targetPrice = parseFloat(price.toString().replace(/\./g, '').replace(',', '.'));
  const execPrice = (type === 'MP') ? liveData.price : targetPrice;
  const totalValue = execPrice * quantity;
  
  // Calculate Fee
  const fee = side === 'BUY' ? totalValue * FEE_BUY : totalValue * FEE_SELL;
  const grandTotal = side === 'BUY' ? totalValue + fee : totalValue - fee;
  
  const userSheet = ss.getSheetByName('Users');
  const userData = userSheet.getDataRange().getValues();
  const userRowIndex = userData.findIndex(row => row[0] === email);
  
  if (userRowIndex === -1) throw new Error('Người dùng không tồn tại');
  
  let balance = userData[userRowIndex][1];
  let realizedPnL = 0;

  if (side === 'BUY') {
    if (balance < grandTotal) throw new Error(`Số dư không đủ (Cần ${grandTotal.toLocaleString()}đ bao gồm phí)`);
    balance -= grandTotal;
    // AvgPrice includes buy fee: (Total Cost) / Quantity
    updateHolding(email, symbol, quantity, (totalValue + fee) / quantity, 'BUY');
  } else {
    // Sell
    const holdings = getHoldings(email);
    const pos = holdings.find(h => h.symbol === symbol.toUpperCase());
    if (!pos || pos.quantity < quantity) throw new Error('Không đủ cổ phiếu để bán');
    
    // Profit = (Net Proceeds) - (Total Cost of units sold)
    // grandTotal here is (ExecPrice * Qty - SellFee)
    realizedPnL = grandTotal - (pos.avgPrice * quantity);
    
    balance += grandTotal;
    updateHolding(email, symbol, quantity, execPrice, 'SELL');
  }
  
  // Update Balance
  userSheet.getRange(userRowIndex + 1, 2).setValue(balance);
  
  // Log History with Fee and PnL
  logTransaction(email, symbol, quantity, execPrice, side, type, fee, grandTotal, realizedPnL);
  
  // THÔNG BÁO
  const msg = side === 'BUY' 
    ? `Khớp lệnh MUA ${quantity} ${symbol} tại giá ${execPrice.toLocaleString('vi-VN')} đ`
    : `Khớp lệnh BÁN ${quantity} ${symbol} tại giá ${execPrice.toLocaleString('vi-VN')} đ. Lãi/lỗ: ${realizedPnL.toLocaleString('vi-VN')} đ`;
  addNotification(email, msg);

  return { success: true, balance: balance, realizedPnL: realizedPnL };
}

function addNotification(email, message) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = ss.getSheetByName('Notifications');
  if (!sheet) {
    sheet = ss.insertSheet('Notifications');
    sheet.appendRow(['Date', 'Email', 'Message', 'IsRead']);
  }
  sheet.appendRow([new Date(), email, message, false]);
}

function getNotifications(email) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName('Notifications');
  if (!sheet) return [];
  
  const data = sheet.getDataRange().getValues();
  return data
    .filter(row => row[1] === email)
    .map(row => ({
      date: row[0],
      message: row[2],
      isRead: row[3]
    }))
    .reverse()
    .slice(0, 20); // Lấy 20 thông báo mới nhất
}

function markNotificationsRead(email) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName('Notifications');
  if (!sheet) return { success: true };
  
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][1] === email && data[i][3] === false) {
      sheet.getRange(i + 1, 4).setValue(true);
    }
  }
  return { success: true };
}

function updateHolding(email, symbol, quantity, price, side) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = ss.getSheetByName('Holdings');
  if (!sheet) {
    sheet = ss.insertSheet('Holdings');
    sheet.appendRow(['Email', 'Symbol', 'Quantity', 'AvgPrice']);
  }
  const data = sheet.getDataRange().getValues();
  const rowIndex = data.findIndex(row => row[0] === email && row[1] === symbol.toUpperCase());
  
  if (rowIndex === -1 && side === 'BUY') {
    sheet.appendRow([email, symbol.toUpperCase(), quantity, price]);
  } else if (rowIndex !== -1) {
    let currentQty = data[rowIndex][2];
    let currentAvg = data[rowIndex][3];
    
    if (side === 'BUY') {
      const newQty = currentQty + quantity;
      // New average cost = (Total Previous Cost + Current Total Cost) / Total New Quantity
      const newAvg = ((currentQty * currentAvg) + (quantity * price)) / newQty;
      sheet.getRange(rowIndex + 1, 3).setValue(newQty);
      sheet.getRange(rowIndex + 1, 4).setValue(newAvg);
    } else {
      const newQty = currentQty - quantity;
      if (newQty <= 0) {
        sheet.deleteRow(rowIndex + 1);
      } else {
        sheet.getRange(rowIndex + 1, 3).setValue(newQty);
      }
    }
  }
}

/**
 * LƯU LỊCH SỬ GIAO DỊCH (BAO GỒM CẢ NẠP TIỀN)
 */
function logTransaction(email, symbol, quantity, price, side, type, fee, total, pnl = 0) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName('History') || ss.insertSheet('History');
  
  // Chuẩn hóa Header (9 cột)
  const headers = ['Date', 'Email', 'Symbol', 'Side', 'Type', 'Quantity', 'Price', 'Fee', 'Total', 'PnL'];
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(headers);
  } else {
    // Sync headers to ensure PnL column exists
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  }
  
  sheet.appendRow([new Date(), email, symbol.toUpperCase(), side, type, quantity, price, fee, total, pnl]);
}

function getHistory(email) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName('History');
  if (!sheet) return [];
  
  const data = sheet.getDataRange().getValues();
  return data
    .filter(row => row[1] === email)
    .map((row, idx) => {
      // Hàm fix lỗi số có dấu phẩy nếu Google Sheets dùng locale VN
      const parseNum = (val) => {
        if (typeof val === 'number') return val;
        if (!val) return 0;
        return parseFloat(val.toString().replace(/\./g, '').replace(',', '.'));
      };

      // Tạo ID duy nhất từ timestamp nếu chưa có (dùng để xóa/sửa)
      const id = row[10] || (row[0] instanceof Date ? row[0].getTime() : row[0]);

      return {
        id: id,
        date: row[0],
        symbol: row[2],
        side: row[3],
        type: row[4],
        quantity: row[5],
        price: parseNum(row[6]),
        fee: parseNum(row[7]),
        total: parseNum(row[8]),
        pnl: parseNum(row[9]) || 0
      };
    })
    .reverse();
}

/**
 * XÓA GIAO DỊCH VÀ HOÀN TÁC DỮ LIỆU TÀI CHÍNH
 */
function deleteTransaction(email, transId) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const historySheet = ss.getSheetByName('History');
  const userSheet = ss.getSheetByName('Users');
  const historyData = historySheet.getDataRange().getValues();
  
  // Tìm dòng giao dịch
  const rowIndex = historyData.findIndex(row => row[1] === email && (row[10] == transId || (row[0] instanceof Date ? row[0].getTime() == transId : false)));
  
  if (rowIndex === -1) throw new Error('Không tìm thấy giao dịch');
  const trans = historyData[rowIndex];
  const symbol = trans[2];
  const side = trans[3];
  const quantity = trans[5];
  const total = trans[8]; // Giá trị khớp sau phí
  
  // 1. Cập nhật lại Số dư (Balance)
  const userData = userSheet.getDataRange().getValues();
  const userRowIndex = userData.findIndex(row => row[0] === email);
  let balance = userData[userRowIndex][1];

  if (side === 'BUY' || side === 'IN') {
    balance += total; // Hoàn tiền mua hoặc xóa khoản nạp
  } else if (side === 'SELL') {
    balance -= total; // Thu hồi tiền bán
  }
  userSheet.getRange(userRowIndex + 1, 2).setValue(balance);

  // 2. Cập nhật lại Danh mục (Holdings) nếu là lệnh Mua/Bán
  if (symbol !== 'DEPOSIT' && symbol !== 'CASH') {
    const holdSheet = ss.getSheetByName('Holdings');
    const holdData = holdSheet.getDataRange().getValues();
    const holdRowIndex = holdData.findIndex(r => r[0] === email && r[1] === symbol);
    
    if (holdRowIndex !== -1) {
      let currentQty = holdData[holdRowIndex][2];
      if (side === 'BUY') {
        const newQty = Math.max(0, currentQty - quantity);
        holdSheet.getRange(holdRowIndex + 1, 3).setValue(newQty);
      } else if (side === 'SELL') {
        const newQty = currentQty + quantity;
        holdSheet.getRange(holdRowIndex + 1, 3).setValue(newQty);
      }
    }
  }

  // 3. Xóa dòng trong History
  historySheet.deleteRow(rowIndex + 1);
  
  // 4. Nếu là Deposit, xóa trong sheet Deposits
  if (symbol === 'DEPOSIT') {
    const depSheet = ss.getSheetByName('Deposits');
    if (depSheet) {
      const depData = depSheet.getDataRange().getValues();
      const dIdx = depData.findIndex(r => r[1] === email && r[2] == total); // So sánh tương đối
      if (dIdx !== -1) depSheet.deleteRow(dIdx + 1);
    }
  }

  return { success: true, balance: balance };
}

function getHoldings(email) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName('Holdings');
  if (!sheet) return [];

  const data = sheet.getDataRange().getValues();
  return data
    .filter(row => row[0] === email && row[2] > 0)
    .map(row => ({
      symbol: row[1],
      quantity: row[2],
      avgPrice: row[3]
    }));
}

function login(email, password) {
  if (!email || !password) throw new Error('Vui lòng điền đủ email và mật khẩu');
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName('Users');
  const data = sheet.getDataRange().getValues();
  const user = data.find(row => row[0] === email);
  
  if (!user) throw new Error('Người dùng không tồn tại. Vui lòng đăng ký.');
  if (!user[3]) throw new Error('Tài khoản này chưa thiết lập mật khẩu. Vui lòng sử dụng tính năng "Quên mật khẩu" để cấu hình.');
  if (user[3].toString() !== password.toString()) throw new Error('Mật khẩu không chính xác.');
  
  return { success: true };
}

function register(email, password, otp) {
  if (!email || !password || !otp) throw new Error('Vui lòng điền đủ thông tin');
  const v = verifyOTP(email, otp);
  if (!v.success) return v;
  
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName('Users');
  const data = sheet.getDataRange().getValues();
  if (data.some(row => row[0] === email)) throw new Error('Email đã được đăng ký.');
  
  // Khởi tạo tài khoản với 100tr VNĐ
  sheet.appendRow([email, 100000000, new Date(), password]);
  return { success: true };
}

function resetPassword(email, password, otp) {
  if (!email || !password || !otp) throw new Error('Vui lòng điền đủ thông tin');
  const v = verifyOTP(email, otp);
  if (!v.success) return v;
  
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName('Users');
  const data = sheet.getDataRange().getValues();
  const rowIndex = data.findIndex(row => row[0] === email);
  
  if (rowIndex === -1) throw new Error('Người dùng không tồn tại');
  
  sheet.getRange(rowIndex + 1, 4).setValue(password);
  return { success: true };
}

/**
 * HÀM TEST ĐỂ CẤP QUYỀN GỬI MAIL
 */
function testSendEmail() {
  const email = Session.getActiveUser().getEmail();
  MailApp.sendEmail(email, 'Test StockSim', 'Nếu bạn nhận được mail này, script đã được cấp quyền thành công!');
  Logger.log('Đã gửi mail check quyền tới: ' + email);
}
