import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { Search, TrendingUp, TrendingDown, Clock, BarChart3, Database, RefreshCw } from 'lucide-react';
import LineChart from './LineChart';

const Trade = ({ balance, refreshProfile }) => {
	const [symbol, setSymbol] = useState('HPG');
	const [stock, setStock] = useState(null);
	const [history, setHistory] = useState([]);
	const [side, setSide] = useState('BUY');
	const [type, setType] = useState('LO');
	const [price, setPrice] = useState('');
	const [quantity, setQuantity] = useState('');
	const [loading, setLoading] = useState(false);
	const [fetching, setFetching] = useState(false);
	const [message, setMessage] = useState('');

	const formatVND = (val) => new Intl.NumberFormat('vi-VN').format(val);

	// fetchData trigger
	const handleSearch = () => {
		if (symbol && symbol.length >= 3) {
			fetchStock();
			fetchHistory();
		}
	};

	useEffect(() => {
		handleSearch();
	}, []); // Initial load only

	const fetchStock = async () => {
		setFetching(true);
		const data = await api.call('getStockData', { symbol });
		if (data && !data.error) {
			setStock(data);
			if (type === 'MP') setPrice(data.price);
			else if (!price || price === '0') setPrice(data.price);
		}
		setFetching(false);
	};

	const fetchHistory = async () => {
		const res = await api.call('getStockHistory', { symbol });
		if (res && res.history) {
			setHistory(res.history);
		}
	};

	const handleOrder = async (e) => {
		e.preventDefault();
		setLoading(true);
		setMessage('');

		const res = await api.call('placeOrder', {
			email: sessionStorage.getItem('userEmail'),
			symbol: symbol.trim().toUpperCase(),
			quantity: Number(quantity),
			type: type,
			side: side,
			price: Number(price)
		});

		if (res && res.success) {
			setMessage(`Đã đặt lệnh ${side === 'BUY' ? 'MUA' : 'BÁN'} ${quantity} ${symbol} thành công!`);
			refreshProfile();
			setQuantity('');
		} else {
			setMessage(`Lỗi: ${res?.error || 'Không rõ lỗi'}`);
		}
		setLoading(false);
	};

	const estimatedTotal = Number(quantity) * (type === 'MP' ? (stock?.price || 0) : Number(price));

	// Chuẩn bị dữ liệu cho biểu đồ
	const chartData = {
		labels: [...history].reverse().map(h => h.date),
		datasets: [{
			label: 'Giá đóng cửa',
			data: [...history].reverse().map(h => h.price),
			borderColor: '#00f2fe',
			backgroundColor: 'rgba(0, 242, 254, 0.1)',
			fill: true,
			tension: 0.4,
			pointRadius: 4,
			pointHoverRadius: 6,
			borderWidth: 3,
		}]
	};

	return (
		<div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
			<div className="lg:col-span-3 space-y-6">
				{/* Biểu đồ tự chế từ dữ liệu Vietstock */}
				<div className="glass rounded-3xl p-4 lg:p-6 h-[350px] lg:h-[450px] border-faint shadow-2xl flex flex-col">
					<div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-6">
						<h3 className="text-base lg:text-lg font-bold flex items-center gap-2">
							<BarChart3 className="text-primary" size={18} />
							Biểu đồ xu hướng {symbol}
						</h3>
						<span className="text-[9px] font-black text-textSecondary uppercase tracking-widest bg-muted px-3 py-1.5 rounded-lg border border-faint">
							Dữ liệu 5 ngày gần nhất
						</span>
					</div>
					<div className="flex-1 w-full relative min-h-0 bg-white/[0.01] rounded-2xl overflow-hidden">
						{fetching ? (
							<div className="absolute inset-0 flex flex-col items-center justify-center bg-black/20 backdrop-blur-sm z-10">
								<div className="relative">
									<div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
									<div className="absolute inset-0 flex items-center justify-center">
										<TrendingUp size={16} className="text-primary animate-pulse" />
									</div>
								</div>
								<p className="mt-4 text-[10px] font-black text-primary uppercase tracking-[0.2em] animate-pulse">Đang tải dữ liệu thị trường...</p>
							</div>
						) : null}
						{history.length > 0 ? (
							<LineChart data={chartData} />
						) : !fetching && (
							<div className="absolute inset-0 flex flex-col items-center justify-center space-y-4 opacity-40">
								<Database className="text-textPrimary/20" size={48} />
								<p className="text-xs font-bold text-textSecondary">Nhập mã chứng khoán và nhấn Tìm kiếm</p>
							</div>
						)}
					</div>
				</div>

				{/* Bảng thống kê giao dịch */}
				<div className="glass rounded-3xl p-4 lg:p-6 border-faint shadow-2xl overflow-hidden">
					<h3 className="text-base lg:text-lg font-bold flex items-center gap-2 mb-6">
						<Clock className="text-primary" size={18} />
						Thống kê giao dịch
					</h3>
					<div className="overflow-x-auto">
						<table className="w-full text-left">
							<thead>
								<tr className="text-[10px] font-black text-textSecondary uppercase tracking-widest border-b border-faint">
									<th className="pb-4">Ngày</th>
									<th className="pb-4">Giá đóng cửa</th>
									<th className="pb-4">Thay đổi</th>
									<th className="pb-4">Khối lượng</th>
								</tr>
							</thead>
							<tbody className="divide-y divide-white/5 relative">
								{fetching ? (
									[...Array(5)].map((_, i) => (
										<tr key={i} className="animate-pulse">
											<td className="py-4"><div className="h-4 w-12 bg-muted rounded"></div></td>
											<td className="py-4"><div className="h-4 w-20 bg-muted rounded"></div></td>
											<td className="py-4"><div className="h-4 w-16 bg-muted rounded"></div></td>
											<td className="py-4"><div className="h-4 w-24 bg-muted rounded"></div></td>
										</tr>
									))
								) : history.length > 0 ? history.map((h, i) => (
									<tr key={i} className="group hover:bg-muted transition-colors">
										<td className="py-4 text-sm font-bold">{h.date}</td>
										<td className="py-4 text-sm font-black text-primary">{formatVND(h.price)}</td>
										<td className={`py-4 text-sm font-bold ${h.change.includes('+') || (typeof h.change === 'number' && h.change > 0) ? 'text-success' : 'text-danger'}`}>
											{h.change}
										</td>
										<td className="py-4 text-sm text-textSecondary font-medium">{h.volume}</td>
									</tr>
								)) : (
									<tr>
										<td colSpan="4" className="py-10 text-center text-textSecondary text-xs">Nhấn tìm kiếm để lấy dữ liệu mới nhất</td>
									</tr>
								)}
							</tbody>
						</table>
					</div>
				</div>
			</div>

			<div className="space-y-6">
				<div className="glass p-6 rounded-3xl flex flex-col gap-6 shadow-2xl border-faint">
					<div className="flex gap-1 bg-muted p-1 rounded-2xl">
						<button onClick={() => setSide('BUY')} className={`flex-1 py-3 rounded-xl font-bold transition-all px-4 ${side === 'BUY' ? 'bg-success text-white' : 'text-textSecondary'}`}>MUA</button>
						<button onClick={() => setSide('SELL')} className={`flex-1 py-3 rounded-xl font-bold transition-all px-4 ${side === 'SELL' ? 'bg-danger text-white' : 'text-textSecondary'}`}>BÁN</button>
					</div>

					<div className="space-y-4">
						<div className="flex gap-2">
							<div className="relative flex-1 group">
								<Search className="absolute left-4 top-1/2 -translate-y-1/2 text-textSecondary" size={18} />
								<input
									type="text"
									value={symbol}
									onChange={(e) => setSymbol(e.target.value.toUpperCase())}
									onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
									className="w-full bg-muted border border-faint rounded-2xl py-4 pl-12 pr-4 focus:border-primary outline-none font-bold uppercase transition-all"
									placeholder="MÃ CK..."
								/>
							</div>
							<button
								onClick={handleSearch}
								disabled={fetching}
								className="bg-primary/10 border border-primary/20 text-primary px-6 rounded-2xl hover:bg-primary hover:text-white transition-all flex items-center justify-center disabled:opacity-50"
							>
								{fetching ? <RefreshCw className="animate-spin" size={18} /> : <Search size={18} />}
							</button>
						</div>

						{stock && (
							<div className="p-4 bg-primary/5 rounded-2xl border border-primary/10 space-y-3">
								<div className="flex justify-between items-center">
									<span className="text-[10px] font-black text-textSecondary uppercase">Giá khớp online</span>
									<div className={`text-right ${Number(stock.change) >= 0 ? 'text-success' : 'text-danger'} font-bold`}>
										<p className="text-2xl tracking-tighter">{formatVND(stock.price)}</p>
									</div>
								</div>
							</div>
						)}

						<div className="space-y-4">
							<div className="space-y-2 px-1">
								<label className="text-[10px] font-bold text-textSecondary uppercase">Loại lệnh</label>
								<select value={type} onChange={(e) => setType(e.target.value)} className="w-full bg-muted border border-faint rounded-2xl py-3.5 px-4 font-bold appearance-none">
									<option value="LO">LO (Lệnh giới hạn)</option>
									<option value="MP">MP (Lệnh thị trường)</option>
								</select>
							</div>
							<div className="space-y-2 px-1">
								<label className="text-[10px] font-bold text-textSecondary uppercase">Giá đặt</label>
								<input type="number" value={price} disabled={type === 'MP'} onChange={(e) => setPrice(e.target.value)} className="w-full bg-muted border border-faint rounded-2xl py-3.5 px-4 font-bold" />
							</div>
							<div className="space-y-2 px-1">
								<label className="text-[10px] font-bold text-textSecondary uppercase">Số lượng</label>
								<input type="number" value={quantity} onChange={(e) => setQuantity(e.target.value)} className="w-full bg-muted border border-faint rounded-2xl py-3.5 px-4 font-bold" />
							</div>
						</div>
					</div>

					<div className="bg-muted p-4 rounded-2xl space-y-2 border border-faint">
						<div className="flex justify-between text-[11px] font-bold uppercase">
							<span className="text-textSecondary">Số dư:</span>
							<span className="text-textPrimary">{formatVND(balance)}</span>
						</div>
						<div className="flex justify-between text-sm font-black pt-1 border-t border-faint uppercase">
							<span className="text-textSecondary">Tổng chi:</span>
							<span className="text-primary">{formatVND(estimatedTotal)}</span>
						</div>
					</div>

					<button onClick={handleOrder} disabled={loading || !quantity || !stock} className={`w-full py-5 rounded-2xl font-black text-lg text-white transition-all transform active:scale-95 ${side === 'BUY' ? 'bg-success shadow-lg shadow-success/20' : 'bg-danger shadow-lg shadow-danger/20'}`}>
						{loading ? 'XỬ LÝ...' : `XÁC NHẬN ${side}`}
					</button>

					{message && (
						<div className={`p-4 rounded-2xl text-center text-xs font-black uppercase ${message.startsWith('Lỗi') ? 'bg-danger/10 text-danger' : 'bg-success/10 text-success'}`}>
							{message}
						</div>
					)}
				</div>
			</div>
		</div>
	);
};

export default Trade;
