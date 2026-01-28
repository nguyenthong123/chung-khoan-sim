const TRADING_GAS_URL = 'https://script.google.com/macros/s/AKfycbx9o6yLvNgHxWggQWaLLDYRRMXQRwROBqltr6fx4jgBzviByYGvaFHNOFKBgUfQMIV0cQ/exec';
const FINANCE_GAS_URL = 'https://script.google.com/macros/s/AKfycbzs0i9Xzj9pqOXghPxgAdVVLh3Yxfr0bH296T1Ph8TSamsTcROnom8joFcrgTQmkdbJ/exec';

const isMock = !TRADING_GAS_URL;
const API_SECRET_KEY = 'STOCKS_SIM_SECURE_V1_2024_@SEC';

export const api = {
	async call(action, data = {}, target = 'trading', options = { silent: false }) {
		if (isMock) return mockApi(action, data);

		const url = target === 'finance' ? FINANCE_GAS_URL : TRADING_GAS_URL;

		let retries = 3;
		let backoff = 1000;
		while (retries >= 0) {
			try {
				const response = await fetch(url, {
					method: 'POST',
					cache: 'no-cache',
					body: JSON.stringify({
						apiKey: API_SECRET_KEY,
						action,
						...data
					}),
				});
				return await response.json();
			} catch (error) {
				if (retries === 0) {
					if (!options.silent) {
						console.warn(`[API] ${action} failed after retries:`, error.message);
					}
					return { error: 'Connection failed', message: error.message };
				}
				retries--;
				await new Promise(r => setTimeout(r, backoff));
				backoff *= 2; // Tăng dần thời gian chờ: 1s -> 2s -> 4s
			}
		}
	}
};

const mockApi = async (action, data) => {
	await new Promise(r => setTimeout(r, 500));

	const mockStocks = {
		'HPG': { symbol: 'HPG', price: 28500, change: 450, pctChange: 1.6, high: 28700, low: 28100, volume: 15200000 },
		'TCB': { symbol: 'TCB', price: 35200, change: -200, pctChange: -0.57, high: 35500, low: 34900, volume: 8400000 },
		'VNM': { symbol: 'VNM', price: 68100, change: 100, pctChange: 0.15, high: 68500, low: 67900, volume: 3200000 },
		'FPT': { symbol: 'FPT', price: 115000, change: 2100, pctChange: 1.86, high: 116000, low: 113000, volume: 2100000 },
	};

	switch (action) {
		case 'getProfile':
			return { email: 'demo@example.com', balance: 125450000, totalAssets: 158220000 };
		case 'getHoldings':
			return [
				{ symbol: 'HPG', quantity: 1000, avgPrice: 27200 },
				{ symbol: 'VNM', quantity: 500, avgPrice: 69500 },
			];
		case 'getHistory':
			return [
				{ date: new Date().toISOString(), symbol: 'HPG', side: 'BUY', type: 'LO', quantity: 1000, price: 27200, total: 27200000 },
				{ date: new Date().toISOString(), symbol: 'VNM', side: 'BUY', type: 'MP', quantity: 500, price: 69500, total: 34750000 },
			];
		case 'getStockData':
			return mockStocks[data.symbol.toUpperCase()] || { error: 'Not found' };
		case 'placeOrder':
			return { success: true, balance: 120000000 };
		case 'deposit':
			return { success: true, newBalance: 150000000 };
		case 'getFinanceSummary':
			return {
				monthlyIncome: 5240,
				monthlyExpense: 2360,
				balance: 2880,
				categories: [
					{ name: 'Dining', amount: 458.20 },
					{ name: 'Shopping', amount: 1240.50 },
					{ name: 'Transport', amount: 215.00 },
					{ name: 'Fixed Bills', amount: 890.00 }
				]
			};
		case 'getFinanceTransactions':
			return [
				{ id: 'VCB-12773585043', date: new Date().toISOString(), amount: 35000, type: 'EXPENSE', category: 'Bank Transfer', description: 'NGUYEN BA THONG chuyen tien', source: 'Vietcombank' },
				{ id: 'MANUAL-1', date: new Date().toISOString(), amount: 150000, type: 'EXPENSE', category: 'Dining', description: 'Lunch at Kichi Kichi', source: 'Manual' },
				{ id: 'MANUAL-2', date: new Date().toISOString(), amount: 5000000, type: 'INCOME', category: 'Salary', description: 'January Salary', source: 'System' },
			];
		case 'syncGmailReceipts':
			return { success: true, syncCount: 1 };
		default:
			return { error: 'Unknown action' };
	}
};
