import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
	Plus,
	Search,
	TrendingUp,
	TrendingDown,
	DollarSign,
	TrendingUp as InflowIcon,
	TrendingDown as OutflowIcon,
	Clock,
	CheckCircle2,
	RefreshCw,
	ChevronLeft,
	ChevronRight,
	X,
	PieChart,
	Briefcase,
	Percent
} from 'lucide-react';
import { api } from '../api';

const Finance = ({ userEmail }) => {
	const [syncing, setSyncing] = useState(false);
	const [isSaving, setIsSaving] = useState(false);
	const [isEntryModalOpen, setIsEntryModalOpen] = useState(false);

	const [formData, setFormData] = useState({
		date: new Date().toISOString().split('T')[0],
		projected: '',
		actual: '',
		type: 'INCOME',
		category: 'Lương',
		description: '',
		source: 'Tiền mặt'
	});

	const [transactions, setTransactions] = useState([]);
	const [loading, setLoading] = useState(true);

	// Filtering and Pagination state
	const [startDate, setStartDate] = useState(() => {
		const d = new Date();
		d.setDate(1); // Default to start of current month
		return d.toISOString().split('T')[0];
	});
	const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
	const [incomePage, setIncomePage] = useState(1);
	const [expensePage, setExpensePage] = useState(1);
	const itemsPerPage = 5;

	const fetchFinanceData = async () => {
		setLoading(true);
		const transData = await api.call('getFinanceTransactions', { email: userEmail }, 'finance');
		if (transData && !transData.error) {
			setTransactions(transData);
		}
		setLoading(false);
	};

	useEffect(() => {
		fetchFinanceData();
	}, [userEmail]);

	const handleSync = async () => {
		if (syncing) return;
		setSyncing(true);
		try {
			await api.call('syncGmailReceipts', { email: userEmail }, 'finance');
			await fetchFinanceData();
		} catch (error) {
			console.error('Sync error:', error);
		} finally {
			setSyncing(false);
		}
	};

	const handleAddTransaction = async (e) => {
		e.preventDefault();
		if (isSaving) return;
		setIsSaving(true);
		try {
			const result = await api.call('addManualTransaction', {
				...formData,
				email: userEmail
			}, 'finance');

			if (result.success) {
				setIsEntryModalOpen(false);
				setFormData({
					date: new Date().toISOString().split('T')[0],
					projected: '',
					actual: '',
					type: 'INCOME',
					category: 'Lương',
					description: '',
					source: 'Tiền mặt'
				});
				await fetchFinanceData();
			}
		} catch (error) {
			console.error('Add transaction error:', error);
		} finally {
			setIsSaving(false);
		}
	};

	const formatVND = (val) => {
		const num = Math.round(parseFloat(val) || 0);
		return new Intl.NumberFormat('vi-VN', {
			style: 'currency',
			currency: 'VND',
			minimumFractionDigits: 0,
			maximumFractionDigits: 0,
		}).format(num);
	};

	// Derived Filtered Data
	const filteredTransactions = transactions.filter(t => {
		if (!t.date) return true;
		const tDate = new Date(t.date).toISOString().split('T')[0];
		if (startDate && tDate < startDate) return false;
		if (endDate && tDate > endDate) return false;
		return true;
	});

	// Statistics Calculations
	const totalInflowActual = filteredTransactions.filter(t => String(t.type).toUpperCase() === 'INCOME').reduce((sum, t) => sum + (parseFloat(t.actual) || 0), 0);
	const totalOutflowActual = filteredTransactions.filter(t => String(t.type).toUpperCase() === 'EXPENSE').reduce((sum, t) => sum + (parseFloat(t.actual) || 0), 0);
	const netLiquidity = totalInflowActual - totalOutflowActual;

	// Hiệu suất tiết kiệm: Tỷ lệ phần trăm số tiền còn lại sau khi chi tiêu so với tổng thu nhập
	const savingsRate = totalInflowActual > 0 ? (netLiquidity / totalInflowActual) * 100 : (netLiquidity < 0 ? -100 : 0);
	const expenseIncomeRatio = totalInflowActual > 0 ? (totalOutflowActual / totalInflowActual) * 100 : (totalOutflowActual > 0 ? 100 : 0);
	const burnRate = expenseIncomeRatio;

	// History Analysis for Charts & Growth
	const getMonthRangeProfit = (monthsAgo) => {
		const now = new Date();
		const start = new Date(now.getFullYear(), now.getMonth() - monthsAgo, 1);
		const end = new Date(now.getFullYear(), now.getMonth() - monthsAgo + 1, 0);

		const monthTx = transactions.filter(t => {
			if (!t.date) return false;
			const d = new Date(t.date);
			return d >= start && d <= end;
		});

		const inc = monthTx.filter(t => String(t.type).toUpperCase() === 'INCOME').reduce((sum, t) => sum + (parseFloat(t.actual) || 0), 0);
		const exp = monthTx.filter(t => String(t.type).toUpperCase() === 'EXPENSE').reduce((sum, t) => sum + (parseFloat(t.actual) || 0), 0);
		return inc - exp;
	};

	const currentMonthProfit = getMonthRangeProfit(0);
	const lastMonthProfit = getMonthRangeProfit(1);
	const profitGrowth = lastMonthProfit !== 0 ? ((currentMonthProfit - lastMonthProfit) / Math.abs(lastMonthProfit)) * 100 : (currentMonthProfit > 0 ? 100 : 0);

	// Trend data for last 4 months
	const profitTrend = [3, 2, 1, 0].map(m => {
		const p = getMonthRangeProfit(m);
		// Normalize to 0-100 for mini-chart height
		return p;
	});
	// Normalize trend values for chart display (0-100 range)
	const maxTrend = Math.max(...profitTrend.map(Math.abs), 1);
	const normalizedTrend = profitTrend.map(v => Math.max(10, (v / maxTrend) * 100));

	const incomes = filteredTransactions.filter(t => String(t.type).toUpperCase() === 'INCOME');
	const expenses = filteredTransactions.filter(t => String(t.type).toUpperCase() === 'EXPENSE');

	// Pagination slicing
	const currentIncomes = incomes.slice((incomePage - 1) * itemsPerPage, incomePage * itemsPerPage);
	const currentExpenses = expenses.slice((expensePage - 1) * itemsPerPage, expensePage * itemsPerPage);

	const totalIncomePages = Math.ceil(incomes.length / itemsPerPage);
	const totalExpensePages = Math.ceil(expenses.length / itemsPerPage);

	const formatDateShort = (dateStr) => {
		if (!dateStr) return '';
		const d = new Date(dateStr);
		return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
	};

	const Pagination = ({ current, total, onPageChange }) => {
		if (total === 0) return null;

		const pages = [];
		for (let i = 1; i <= total; i++) {
			if (i === 1 || i === total || (i >= current - 1 && i <= current + 1)) {
				pages.push(i);
			} else if (pages.length > 0 && pages[pages.length - 1] !== '...') {
				pages.push('...');
			}
		}

		return (
			<div className="p-4 border-t border-white/5 flex items-center justify-center gap-2 bg-black/40">
				<button
					onClick={() => onPageChange(Math.max(1, current - 1))}
					disabled={current === 1}
					className="p-2 hover:bg-white/10 rounded-lg transition-colors disabled:opacity-20"
				>
					<ChevronLeft size={16} />
				</button>

				<div className="flex items-center gap-1">
					{pages.map((p, idx) => (
						p === '...' ? (
							<span key={idx} className="px-2 text-gray-600 text-[10px] font-black">...</span>
						) : (
							<button
								key={idx}
								onClick={() => onPageChange(p)}
								className={`min-w-[32px] h-8 rounded-lg text-[10px] font-black transition-all ${current === p ? 'bg-blue-600 text-white' : 'text-gray-500 hover:bg-white/5'}`}
							>
								{p}
							</button>
						)
					))}
				</div>

				<button
					onClick={() => onPageChange(Math.min(total, current + 1))}
					disabled={current === total}
					className="p-2 hover:bg-white/10 rounded-lg transition-colors disabled:opacity-20"
				>
					<ChevronRight size={16} />
				</button>
			</div>
		);
	};

	return (
		<div className="flex-1 overflow-auto bg-[#0B0E14] text-white p-4 lg:p-10 font-sans selection:bg-blue-500/30">
			{/* Filter & Action Bar - Optimized for all screens */}
			<div className="flex flex-col xl:flex-row justify-between items-stretch xl:items-center gap-4 mb-8 bg-white/[0.03] p-4 lg:p-6 rounded-[24px] lg:rounded-[32px] border border-white/5 shadow-2xl">
				<div className="flex flex-col sm:flex-row items-end gap-4 w-full xl:w-auto">
					<div className="flex flex-col gap-1.5 w-full sm:w-auto">
						<label className="text-[8px] lg:text-[9px] font-black text-gray-500 uppercase tracking-widest ml-1">Từ</label>
						<div className="relative group">
							<Clock size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 group-hover:text-blue-400 transition-colors" />
							<input
								type="date"
								value={startDate}
								onChange={(e) => { setStartDate(e.target.value); setIncomePage(1); setExpensePage(1); }}
								className="bg-black/40 border border-white/10 rounded-xl pl-9 pr-3 py-2 text-[11px] font-bold focus:outline-none focus:border-blue-500/50 transition-all w-full sm:w-40"
							/>
						</div>
					</div>
					<div className="flex flex-col gap-1.5 w-full sm:w-auto">
						<label className="text-[8px] lg:text-[9px] font-black text-gray-500 uppercase tracking-widest ml-1">Đến</label>
						<div className="relative group">
							<Clock size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 group-hover:text-blue-400 transition-colors" />
							<input
								type="date"
								value={endDate}
								onChange={(e) => { setEndDate(e.target.value); setIncomePage(1); setExpensePage(1); }}
								className="bg-black/40 border border-white/10 rounded-xl pl-9 pr-3 py-2 text-[11px] font-bold focus:outline-none focus:border-blue-500/50 transition-all w-full sm:w-40"
							/>
						</div>
					</div>
					<button
						onClick={() => { setStartDate(''); setEndDate(''); }}
						className="bg-white/5 border border-white/10 rounded-xl px-6 py-2 text-[10px] font-black uppercase tracking-widest hover:bg-white/10 transition-all h-[38px] w-full sm:w-auto"
					>
						Tất cả
					</button>
				</div>

				<div className="flex items-center gap-3 w-full xl:w-auto">
					<button
						onClick={handleSync}
						disabled={syncing}
						className="flex-1 xl:flex-none glass border border-white/10 px-4 lg:px-6 py-3 rounded-xl lg:rounded-2xl text-[9px] lg:text-[10px] font-black uppercase tracking-widest hover:bg-white/5 transition-all flex items-center justify-center gap-2"
					>
						<RefreshCw size={14} className={syncing ? 'animate-spin text-blue-400' : ''} />
						<span className="hidden sm:inline">{syncing ? 'Đang đồng bộ...' : 'Cập nhật'}</span>
						<span className="sm:hidden">{syncing ? '...' : 'Sync'}</span>
					</button>
					<button
						onClick={() => setIsEntryModalOpen(true)}
						className="flex-1 xl:flex-none bg-blue-600 hover:bg-blue-500 text-white px-6 lg:px-8 py-3 rounded-xl lg:rounded-2xl text-[9px] lg:text-[10px] font-black uppercase tracking-widest shadow-xl shadow-blue-600/20 transition-all flex items-center justify-center gap-2"
					>
						<Plus size={16} />
						<span className="hidden sm:inline">Thêm Bản Ghi</span>
						<span className="sm:hidden">Thêm</span>
					</button>
				</div>
			</div>

			{/* High-level stats - Grid layout for better responsiveness */}
			<div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
				<div className="bg-white/5 p-6 rounded-[24px] border border-white/5">
					<p className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-3">Thực Thu</p>
					<div className="flex items-baseline gap-2">
						<span className="text-2xl lg:text-3xl font-black text-emerald-400 tracking-tighter">{formatVND(totalInflowActual)}</span>
					</div>
				</div>
				<div className="bg-white/5 p-6 rounded-[24px] border border-white/5">
					<p className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-3">Thực Chi</p>
					<div className="flex items-baseline gap-2">
						<span className="text-2xl lg:text-3xl font-black text-red-400 tracking-tighter">{formatVND(totalOutflowActual)}</span>
					</div>
				</div>
				<div className="bg-white/5 p-6 rounded-[24px] border border-white/5">
					<p className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-3">Lợi Nhuận Ròng</p>
					<div className="flex items-baseline gap-2">
						<span className="text-2xl lg:text-3xl font-black text-blue-400 tracking-tighter">{formatVND(netLiquidity)}</span>
					</div>
				</div>
				<div className="bg-white/10 p-6 rounded-[24px] border border-white/5 flex flex-col justify-between">
					<div className="flex justify-between items-center mb-3">
						<p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Burn Rate</p>
						<span className={`text-[11px] font-black ${burnRate >= 100 ? 'text-red-400' : 'text-emerald-400'}`}>{burnRate.toFixed(0)}%</span>
					</div>
					<div className="h-2 w-full bg-black/40 rounded-full overflow-hidden border border-white/5">
						<motion.div
							initial={{ width: 0 }}
							animate={{ width: `${Math.min(100, burnRate)}%` }}
							className={`h-full ${burnRate >= 100 ? 'bg-red-500' : burnRate > 80 ? 'bg-yellow-500' : 'bg-emerald-500'} shadow-[0_0_15px_rgba(16,185,129,0.3)]`}
						/>
					</div>
				</div>
			</div>

			{/* Main Grid: Revenue vs Expenses - Optimized layout */}
			<div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8 mb-8">
				{/* Revenue Table */}
				<section className="bg-white/[0.03] border border-white/5 rounded-[24px] lg:rounded-[32px] overflow-hidden shadow-2xl flex flex-col">
					<div className="p-5 lg:p-8 border-b border-white/5 flex justify-between items-center bg-white/[0.02]">
						<div className="flex items-center gap-3">
							<div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/10">
								<InflowIcon size={16} />
							</div>
							<h3 className="font-black text-xs lg:text-sm uppercase tracking-widest">Thu Nhập</h3>
						</div>
						<div className="px-3 py-1 bg-emerald-500/10 rounded-full border border-emerald-500/10">
							<span className="text-[9px] font-black text-emerald-400 uppercase tracking-widest">{formatVND(totalInflowActual)}</span>
						</div>
					</div>
					<div className="flex-1 overflow-x-auto scrollbar-hide">
						<table className="w-full text-left border-collapse min-w-[500px]">
							<thead>
								<tr className="text-[8px] lg:text-[9px] font-black text-gray-500 uppercase tracking-widest border-b border-white/5">
									<th className="px-6 lg:px-8 py-4">Ngày / Mô tả</th>
									<th className="px-4 py-4">Kế hoạch</th>
									<th className="px-4 py-4">Thực tế</th>
									<th className="px-6 lg:px-8 py-4 text-right">Trạng thái</th>
								</tr>
							</thead>
							<tbody className="text-[11px] lg:text-xs font-bold divide-y divide-white/5">
								{currentIncomes.map((t, i) => {
									const actual = parseFloat(t.actual) || 0;
									const projected = parseFloat(t.projected) || 0;
									const variance = actual - projected;
									const dateObj = new Date(t.date);
									const isManual = t.status === 'MANUAL';
									return (
										<tr key={i} className="hover:bg-white/[0.04] transition-all group cursor-default">
											<td className="px-6 lg:px-8 py-4">
												<div className="flex flex-col gap-1">
													<div className="flex items-center gap-2">
														<span className="text-gray-400 group-hover:text-white transition-colors">
															{!isNaN(dateObj.getTime()) ? dateObj.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' }) : 'N/A'}
														</span>
														{isManual ? null : <span className="text-[9px] text-gray-600 font-medium opacity-60">Synced</span>}
													</div>
													<span className="text-[10px] text-gray-500 group-hover:text-gray-400 font-medium truncate max-w-[120px] lg:max-w-[200px]" title={t.description}>
														{t.description || (isManual ? 'Nhập tay' : 'Giao dịch ngân hàng')}
													</span>
												</div>
											</td>
											<td className="px-4 py-4 text-gray-500 font-medium">{formatVND(projected)}</td>
											<td className="px-4 py-4 text-white font-bold">{formatVND(actual)}</td>
											<td className="px-6 lg:px-8 py-4 text-right">
												{variance === 0 ? (
													<span className="text-[8px] font-black text-gray-500 bg-white/5 px-2 py-1 rounded border border-white/5 uppercase tracking-widest">Đã khớp</span>
												) : (
													<span className={`text-[9px] font-black uppercase ${variance > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
														{variance > 0 ? 'Vượt thu' : 'Hụt thu'}
													</span>
												)}
											</td>
										</tr>
									);
								})}
							</tbody>
						</table>
					</div>
					<Pagination
						current={incomePage}
						total={totalIncomePages}
						onPageChange={setIncomePage}
					/>
				</section>

				{/* Expense Table */}
				<section className="bg-white/[0.03] border border-white/5 rounded-[24px] lg:rounded-[32px] overflow-hidden shadow-2xl flex flex-col">
					<div className="p-5 lg:p-8 border-b border-white/5 flex justify-between items-center bg-white/[0.02]">
						<div className="flex items-center gap-3">
							<div className="w-8 h-8 rounded-xl bg-red-500/10 text-red-400 flex items-center justify-center border border-red-500/10">
								<OutflowIcon size={16} />
							</div>
							<h3 className="font-black text-xs lg:text-sm uppercase tracking-widest">Chi Tiêu</h3>
						</div>
						<div className="px-3 py-1 bg-red-500/10 rounded-full border border-red-500/10">
							<span className="text-[9px] font-black text-red-400 uppercase tracking-widest">{formatVND(totalOutflowActual)}</span>
						</div>
					</div>
					<div className="flex-1 overflow-x-auto scrollbar-hide">
						<table className="w-full text-left border-collapse min-w-[500px]">
							<thead>
								<tr className="text-[8px] lg:text-[9px] font-black text-gray-500 uppercase tracking-widest border-b border-white/5">
									<th className="px-6 lg:px-8 py-4">Ngày / Mô tả</th>
									<th className="px-4 py-4">Kế hoạch</th>
									<th className="px-4 py-4">Thực tế</th>
									<th className="px-6 lg:px-8 py-4 text-right">Trạng thái</th>
								</tr>
							</thead>
							<tbody className="text-[11px] lg:text-xs font-bold divide-y divide-white/5">
								{currentExpenses.map((t, i) => {
									const actual = parseFloat(t.actual) || 0;
									const projected = parseFloat(t.projected) || 0;
									const variance = projected - actual;
									const dateObj = new Date(t.date);
									const isManual = t.status === 'MANUAL';
									return (
										<tr key={i} className="hover:bg-white/[0.04] transition-all group cursor-default">
											<td className="px-6 lg:px-8 py-4">
												<div className="flex flex-col gap-1">
													<div className="flex items-center gap-2">
														<span className="text-gray-400 group-hover:text-white transition-colors">
															{!isNaN(dateObj.getTime()) ? dateObj.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' }) : 'N/A'}
														</span>
														{isManual ? null : <span className="text-[9px] text-gray-600 font-medium opacity-60">Synced</span>}
													</div>
													<span className="text-[10px] text-gray-500 group-hover:text-gray-400 font-medium truncate max-w-[120px] lg:max-w-[200px]" title={t.description}>
														{t.description || (isManual ? 'Nhập tay' : 'Hóa đơn Sync')}
													</span>
												</div>
											</td>
											<td className="px-4 py-4 text-gray-500 font-medium">{formatVND(projected)}</td>
											<td className="px-4 py-4 text-white font-bold">{formatVND(actual)}</td>
											<td className="px-6 lg:px-8 py-4 text-right">
												{variance === 0 ? (
													<span className="text-[8px] font-black text-gray-500 bg-white/5 px-2 py-1 rounded border border-white/5 uppercase tracking-widest">Đã khớp</span>
												) : (
													<span className={`text-[9px] font-black uppercase ${variance < 0 ? 'text-red-400' : 'text-emerald-400'}`}>
														{variance < 0 ? 'Vượt chi' : 'Tiết kiệm'}
													</span>
												)}
											</td>
										</tr>
									);
								})}
							</tbody>
						</table>
					</div>
					<Pagination
						current={expensePage}
						total={totalExpensePages}
						onPageChange={setExpensePage}
					/>
				</section>
			</div>

			{/* Bottom Metrics Row */}
			<div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
				{[
					{
						label: 'Hiệu Suất Tiết Kiệm',
						value: `${savingsRate.toFixed(1)}%`,
						icon: PieChart,
						color: savingsRate >= 0 ? 'text-blue-400' : 'text-red-400',
						chart: normalizedTrend
					},
					{
						label: 'Tỷ Lệ Chi Tiêu / Thu Nhập',
						value: `${expenseIncomeRatio.toFixed(1)}%`,
						icon: Percent,
						color: expenseIncomeRatio > 100 ? 'text-red-400' : 'text-gray-400',
						chart: [40, 60, 80, expenseIncomeRatio > 100 ? 100 : expenseIncomeRatio]
					},
					{
						label: 'Lợi Nhuận So Tháng Trước',
						value: (profitGrowth >= 0 ? '+' : '') + profitGrowth.toFixed(1) + '%',
						icon: TrendingUp,
						color: profitGrowth >= 0 ? 'text-emerald-400' : 'text-red-400',
						chart: normalizedTrend
					}
				].map((m, i) => (
					<div key={i} className="bg-[#151921] p-8 rounded-[32px] border border-white/5 flex items-center justify-between group hover:border-white/10 transition-all">
						<div>
							<p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-3">{m.label}</p>
							<p className={`text-3xl font-black tracking-tighter ${m.color.includes('text-red-400') || m.color.includes('text-emerald-400') ? m.color : ''}`}>{m.value}</p>
						</div>
						<div className="flex items-end gap-1 h-12">
							{m.chart.map((h, idx) => (
								<div key={idx} className={`w-1.5 rounded-full ${m.color} bg-current opacity-${20 + (idx * 20)}`} style={{ height: `${Math.min(100, Math.max(10, h))}%` }}></div>
							))}
						</div>
					</div>
				))}
			</div>

			{/* Modal for Log Entry */}
			<AnimatePresence>
				{isEntryModalOpen && (
					<div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl">
						<motion.div
							initial={{ opacity: 0, scale: 0.95, y: 30 }}
							animate={{ opacity: 1, scale: 1, y: 0 }}
							exit={{ opacity: 0, scale: 0.95, y: 30 }}
							className="bg-[#151921] border border-white/10 w-full max-w-lg rounded-[40px] overflow-hidden shadow-[0_30px_100px_rgba(0,0,0,0.8)]"
						>
							<form onSubmit={handleAddTransaction} className="p-10">
								<div className="flex justify-between items-center mb-10">
									<div>
										<h3 className="text-2xl font-black tracking-tighter text-white">Thêm Bản Ghi</h3>
										<p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Quản Lý Hồ Sơ Tài Chính</p>
									</div>
									<button type="button" onClick={() => setIsEntryModalOpen(false)} className="w-10 h-10 bg-white/5 rounded-full flex items-center justify-center text-gray-500 hover:text-white transition-all">
										<X size={20} />
									</button>
								</div>

								<div className="space-y-8">
									{/* Type Toggle */}
									<div className="flex bg-black/40 p-1.5 rounded-[20px] border border-white/5">
										<button
											type="button"
											onClick={() => setFormData({ ...formData, type: 'INCOME' })}
											className={`flex-1 py-4 rounded-[14px] text-[10px] font-black transition-all tracking-widest uppercase ${formData.type === 'INCOME' ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-500 hover:text-gray-300'}`}
										>
											Khoản Thu
										</button>
										<button
											type="button"
											onClick={() => setFormData({ ...formData, type: 'EXPENSE' })}
											className={`flex-1 py-4 rounded-[14px] text-[10px] font-black transition-all tracking-widest uppercase ${formData.type === 'EXPENSE' ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-500 hover:text-gray-300'}`}
										>
											Khoản Chi
										</button>
									</div>

									{/* Date Field */}
									<div>
										<label className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] block mb-3">Ngày giao dịch</label>
										<input
											type="date"
											required
											value={formData.date}
											onChange={e => setFormData({ ...formData, date: e.target.value })}
											className="w-full bg-black/40 border border-white/10 rounded-2xl py-4 px-6 text-xs font-black text-white focus:border-blue-500 outline-none transition-all"
										/>
									</div>

									{/* Comparison Fields */}
									<div className="grid grid-cols-2 gap-6">
										<div>
											<label className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] block mb-3">Số tiền Dự kiến</label>
											<input
												type="number"
												value={formData.projected}
												onChange={e => setFormData({ ...formData, projected: e.target.value })}
												className="w-full bg-black/40 border border-white/10 rounded-2xl py-4 px-6 text-xl font-black text-white focus:border-blue-500 outline-none transition-all"
												placeholder="0"
											/>
										</div>
										<div>
											<label className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] block mb-3">Số tiền Thực tế</label>
											<input
												type="number"
												value={formData.actual}
												onChange={e => setFormData({ ...formData, actual: e.target.value })}
												className="w-full bg-black/40 border border-white/10 rounded-2xl py-4 px-6 text-xl font-black text-white focus:border-blue-500 outline-none transition-all"
												placeholder="0"
											/>
										</div>
									</div>

									<div className="grid grid-cols-2 gap-6">
										<div>
											<label className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] block mb-3">Danh mục</label>
											<select
												value={formData.category}
												onChange={e => setFormData({ ...formData, category: e.target.value })}
												className="w-full bg-black/40 border border-white/10 rounded-2xl py-4 px-6 text-xs font-black text-white outline-none appearance-none"
											>
												<option value="Lương">Lương/Thu nhập</option>
												<option value="Kinh doanh">Kinh doanh</option>
												<option value="Sinh hoạt">Sinh hoạt</option>
												<option value="Đầu tư">Đầu tư</option>
												<option value="Khác">Khác</option>
											</select>
										</div>
										<div>
											<label className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] block mb-3">Nguồn</label>
											<input
												type="text"
												value={formData.source}
												onChange={e => setFormData({ ...formData, source: e.target.value })}
												className="w-full bg-black/40 border border-white/10 rounded-2xl py-4 px-6 text-xs font-black text-white outline-none"
												placeholder="Ngân hàng, Tiền mặt..."
											/>
										</div>
									</div>

									<div>
										<label className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] block mb-3">Ghi chú</label>
										<textarea
											value={formData.description}
											onChange={e => setFormData({ ...formData, description: e.target.value })}
											className="w-full bg-black/40 border border-white/10 rounded-2xl py-4 px-6 text-xs font-bold text-white outline-none h-24 resize-none"
											placeholder="Chi tiết giao dịch nội bộ..."
										/>
									</div>
								</div>

								<button
									type="submit"
									disabled={isSaving}
									className="w-full mt-10 py-5 bg-blue-600 text-white text-xs font-black uppercase tracking-widest rounded-3xl hover:bg-blue-500 transition-all shadow-xl shadow-blue-600/20 active:scale-95 disabled:opacity-50"
								>
									{isSaving ? 'Đang xử lý...' : 'Xác nhận bản ghi'}
								</button>
							</form>
						</motion.div>
					</div>
				)}
			</AnimatePresence>

			<style>{`
				.glass {
					background: rgba(255, 255, 255, 0.03);
					backdrop-filter: blur(20px);
				}
				.scrollbar-hide::-webkit-scrollbar {
					display: none;
				}
				.scrollbar-hide {
					-ms-overflow-style: none;
					scrollbar-width: none;
				}
				@media (max-width: 640px) {
					.text-responsive-base { font-size: 10px; }
					.p-responsive { padding: 1rem; }
				}
			`}</style>
		</div>
	);
};

export default Finance;
