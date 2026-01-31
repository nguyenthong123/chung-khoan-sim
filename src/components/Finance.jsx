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
	Trash2,
	Edit2
} from 'lucide-react';
import {
	Chart as ChartJS,
	CategoryScale,
	LinearScale,
	BarElement,
	Title,
	Tooltip,
	Legend,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';
import { api } from '../api';

ChartJS.register(
	CategoryScale,
	LinearScale,
	BarElement,
	Title,
	Tooltip,
	Legend
);

const Finance = ({ userEmail }) => {
	const [syncing, setSyncing] = useState(false);
	const [isSaving, setIsSaving] = useState(false);
	const [isEntryModalOpen, setIsEntryModalOpen] = useState(false);

	const [editingId, setEditingId] = useState(null);
	const initialFormState = {
		date: new Date().toISOString().split('T')[0],
		projected: '',
		actual: '',
		type: 'INCOME',
		category: 'Lương',
		description: '',
		source: 'Tiền mặt'
	};
	const [formData, setFormData] = useState(initialFormState);

	const [transactions, setTransactions] = useState([]);
	const [loading, setLoading] = useState(true);
	const [selectedTx, setSelectedTx] = useState(null);

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

	const [notification, setNotification] = useState(null);

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
			const res = await api.call('syncGmailReceipts', { email: userEmail }, 'finance');
			if (res && res.success) {
				if (res.syncCount > 0) {
					setNotification({ type: 'success', message: `Đồng bộ thành công ${res.syncCount} giao dịch!` });
					await fetchFinanceData();
				} else {
					setNotification({ type: 'info', message: 'Không tìm thấy giao dịch mới.' });
				}
			}
		} catch (error) {
			setNotification({ type: 'error', message: 'Lỗi kết nối máy chủ.' });
		} finally {
			setSyncing(false);
			setTimeout(() => setNotification(null), 3000);
		}
	};

	const handleAddTransaction = async (e) => {
		e.preventDefault();
		if (isSaving) return;
		setIsSaving(true);
		try {
			const action = editingId ? 'updateFinanceTransaction' : 'addManualTransaction';
			const result = await api.call(action, {
				...formData,
				id: editingId,
				email: userEmail
			}, 'finance');

			if (result.success) {
				setIsEntryModalOpen(false);
				setEditingId(null);
				setFormData(initialFormState);
				setNotification({ type: 'success', message: editingId ? 'Cập nhật thành công!' : 'Thêm bản ghi thành công!' });
				await fetchFinanceData();
			} else {
				setNotification({ type: 'error', message: result.error || 'Thao tác thất bại' });
			}
		} catch (error) {
			setNotification({ type: 'error', message: 'Lỗi kết nối máy chủ.' });
		} finally {
			setIsSaving(false);
			setTimeout(() => setNotification(null), 3000);
		}
	};

	const handleDeleteTransaction = async (id) => {
		if (!window.confirm('Bạn có chắc chắn muốn xóa giao dịch này?')) return;

		try {
			const res = await api.call('deleteFinanceTransaction', { email: userEmail, id }, 'finance');
			if (res && res.success) {
				setNotification({ type: 'success', message: 'Đã xóa giao dịch!' });
				await fetchFinanceData();
			} else {
				setNotification({ type: 'error', message: res.error || 'Không thể xóa giao dịch' });
			}
		} catch (error) {
			setNotification({ type: 'error', message: 'Lỗi kết nối máy chủ.' });
		} finally {
			setTimeout(() => setNotification(null), 3000);
		}
	};

	const handleOpenEdit = (t) => {
		setEditingId(t.id);
		setFormData({
			date: t.date ? new Date(t.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
			projected: t.projected,
			actual: t.actual,
			type: t.type,
			category: t.category,
			description: t.description,
			source: t.source
		});
		setIsEntryModalOpen(true);
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
	const totalInflowProjected = filteredTransactions.filter(t => String(t.type).toUpperCase() === 'INCOME').reduce((sum, t) => sum + (parseFloat(t.projected) || 0), 0);
	const totalOutflowProjected = filteredTransactions.filter(t => String(t.type).toUpperCase() === 'EXPENSE').reduce((sum, t) => sum + (parseFloat(t.projected) || 0), 0);
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
		<div className="flex-1 overflow-auto bg-[#0B0E14] text-white p-4 lg:p-10 font-sans selection:bg-blue-500/30 relative">
			{/* Toast Notification */}
			<AnimatePresence>
				{notification && (
					<motion.div
						initial={{ opacity: 0, y: -20, x: '-50%' }}
						animate={{ opacity: 1, y: 0, x: '-50%' }}
						exit={{ opacity: 0, y: -20, x: '-50%' }}
						className={`fixed top-6 left-1/2 z-[300] px-6 py-3 rounded-2xl border shadow-2xl backdrop-blur-xl flex items-center gap-3 text-[11px] font-black uppercase tracking-widest ${notification.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' :
							notification.type === 'info' ? 'bg-blue-500/10 border-blue-500/20 text-blue-400' :
								'bg-red-500/10 border-red-500/20 text-red-400'
							}`}
					>
						<div className={`w-2 h-2 rounded-full ${notification.type === 'success' ? 'bg-emerald-500 animate-pulse' :
							notification.type === 'info' ? 'bg-blue-500 animate-pulse' :
								'bg-red-500 animate-pulse'
							}`} />
						{notification.message}
					</motion.div>
				)}
			</AnimatePresence>

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
						onClick={() => {
							setEditingId(null);
							setFormData(initialFormState);
							setIsEntryModalOpen(true);
						}}
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
						<table className="w-full text-left border-collapse">
							<thead>
								<tr className="text-[8px] lg:text-[9px] font-black text-gray-500 uppercase tracking-widest border-b border-white/5">
									<th className="px-4 lg:px-6 py-4">Ngày / Mô tả</th>
									<th className="px-2 py-4">Kế hoạch</th>
									<th className="px-2 py-4">Thực tế</th>
									<th className="px-4 lg:px-6 py-4 text-right">Trạng thái</th>
									<th className="px-4 py-4 text-right">Hành động</th>
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
										<tr
											key={i}
											className="hover:bg-white/[0.04] transition-all group cursor-pointer"
										>
											<td className="px-4 lg:px-6 py-4" onClick={() => setSelectedTx(t)}>
												<div className="flex flex-col gap-1">
													<div className="flex items-center gap-2">
														<span className="text-gray-400 group-hover:text-white transition-colors">
															{!isNaN(dateObj.getTime()) ? dateObj.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' }) : 'N/A'}
														</span>
														{isManual ? null : <span className="text-[9px] text-gray-600 font-medium opacity-60">Synced</span>}
													</div>
													<span className="text-[10px] text-gray-500 group-hover:text-gray-400 font-medium truncate max-w-[100px] lg:max-w-[150px]" title={t.description}>
														{t.description || (isManual ? 'Nhập tay' : 'Giao dịch ngân hàng')}
													</span>
												</div>
											</td>
											<td className="px-2 py-4 text-gray-500 font-medium whitespace-nowrap">{formatVND(projected)}</td>
											<td className="px-2 py-4 text-white font-bold whitespace-nowrap">{formatVND(actual)}</td>
											<td className="px-4 lg:px-6 py-4 text-right">
												{variance === 0 ? (
													<span className="text-[8px] font-black text-gray-500 bg-white/5 px-2 py-1 rounded border border-white/5 uppercase tracking-widest">Đã khớp</span>
												) : (
													<span className={`text-[9px] font-black uppercase ${variance > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
														{variance > 0 ? 'Vượt thu' : 'Hụt thu'}
													</span>
												)}
											</td>
											<td className="px-4 py-4 text-right">
												<div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all">
													<button
														onClick={(e) => { e.stopPropagation(); handleOpenEdit(t); }}
														className="p-2 hover:bg-white/10 text-white rounded-lg transition-colors"
														title="Sửa"
													>
														<Edit2 size={14} />
													</button>
													<button
														onClick={(e) => { e.stopPropagation(); handleDeleteTransaction(t.id); }}
														className="p-2 hover:bg-white/10 text-white rounded-lg transition-colors"
														title="Xóa"
													>
														<Trash2 size={14} />
													</button>
												</div>
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
						<table className="w-full text-left border-collapse">
							<thead>
								<tr className="text-[8px] lg:text-[9px] font-black text-gray-500 uppercase tracking-widest border-b border-white/5">
									<th className="px-4 lg:px-6 py-4">Ngày / Mô tả</th>
									<th className="px-2 py-4">Kế hoạch</th>
									<th className="px-2 py-4">Thực tế</th>
									<th className="px-4 lg:px-6 py-4 text-right">Trạng thái</th>
									<th className="px-4 py-4 text-right">Hành động</th>
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
										<tr
											key={i}
											className="hover:bg-white/[0.04] transition-all group cursor-pointer"
										>
											<td className="px-4 lg:px-6 py-4" onClick={() => setSelectedTx(t)}>
												<div className="flex flex-col gap-1">
													<div className="flex items-center gap-2">
														<span className="text-gray-400 group-hover:text-white transition-colors">
															{!isNaN(dateObj.getTime()) ? dateObj.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' }) : 'N/A'}
														</span>
														{isManual ? null : <span className="text-[9px] text-gray-600 font-medium opacity-60">Synced</span>}
													</div>
													<span className="text-[10px] text-gray-500 group-hover:text-gray-400 font-medium truncate max-w-[100px] lg:max-w-[150px]" title={t.description}>
														{t.description || (isManual ? 'Nhập tay' : 'Hóa đơn Sync')}
													</span>
												</div>
											</td>
											<td className="px-2 py-4 text-gray-500 font-medium whitespace-nowrap">{formatVND(projected)}</td>
											<td className="px-2 py-4 text-white font-bold whitespace-nowrap">{formatVND(actual)}</td>
											<td className="px-4 lg:px-6 py-4 text-right">
												{variance === 0 ? (
													<span className="text-[8px] font-black text-gray-500 bg-white/5 px-2 py-1 rounded border border-white/5 uppercase tracking-widest">Đã khớp</span>
												) : (
													<span className={`text-[9px] font-black uppercase ${variance < 0 ? 'text-red-400' : 'text-emerald-400'}`}>
														{variance < 0 ? 'Vượt chi' : 'Tiết kiệm'}
													</span>
												)}
											</td>
											<td className="px-4 py-4 text-right">
												<div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all">
													<button
														onClick={(e) => { e.stopPropagation(); handleOpenEdit(t); }}
														className="p-2 hover:bg-white/10 text-white rounded-lg transition-colors"
														title="Sửa"
													>
														<Edit2 size={14} />
													</button>
													<button
														onClick={(e) => { e.stopPropagation(); handleDeleteTransaction(t.id); }}
														className="p-2 hover:bg-white/10 text-white rounded-lg transition-colors"
														title="Xóa"
													>
														<Trash2 size={14} />
													</button>
												</div>
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

			{/* Bottom Charts Row - Comparison Graphs */}
			<div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
				{/* Chart 1: Thu Nhập vs Chi Tiêu (Thực Tế) */}
				<div className="bg-white/[0.03] border border-white/5 rounded-[32px] p-6 lg:p-8 shadow-2xl">
					<div className="flex justify-between items-center mb-6">
						<div>
							<h4 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-1">Cân Đối</h4>
							<h3 className="text-lg font-black text-white uppercase tracking-tighter">Thu Nhập vs Chi Tiêu</h3>
						</div>
					</div>
					<div className="h-[250px] w-full">
						<Bar
							options={{
								responsive: true,
								maintainAspectRatio: false,
								plugins: {
									legend: { display: false },
									tooltip: {
										backgroundColor: 'rgba(0,0,0,0.8)',
										padding: 12,
										titleFont: { size: 10, weight: 'bold' },
										bodyFont: { size: 12 },
										callbacks: {
											label: (context) => ` ${context.dataset.label}: ${formatVND(context.raw)}`
										}
									}
								},
								scales: {
									y: {
										grid: { color: 'rgba(255,255,255,0.03)', drawBorder: false },
										ticks: {
											color: '#64748b',
											font: { size: 9 },
											callback: (val) => val >= 1000000 ? (val / 1000000).toFixed(1) + 'M' : (val / 1000).toFixed(0) + 'k'
										}
									},
									x: {
										grid: { display: false, drawBorder: false },
										ticks: { color: '#64748b', font: { size: 10, weight: 'bold' } }
									}
								}
							}}
							data={{
								labels: ['Tổng Thực Thu', 'Tổng Thực Chi'],
								datasets: [
									{
										label: 'Giá trị',
										data: [totalInflowActual, totalOutflowActual],
										backgroundColor: ['#10b981', '#ef4444'],
										borderRadius: 12,
										barThickness: 45,
									}
								]
							}}
						/>
					</div>
				</div>

				{/* Chart 2: Kế Hoạch vs Thực Tế */}
				<div className="bg-white/[0.03] border border-white/5 rounded-[32px] p-6 lg:p-8 shadow-2xl">
					<div className="flex justify-between items-center mb-6">
						<div>
							<h4 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-1">Hiệu Suất</h4>
							<h3 className="text-lg font-black text-white uppercase tracking-tighter">Kế Hoạch vs Thực Tế</h3>
						</div>
					</div>
					<div className="h-[250px] w-full">
						<Bar
							options={{
								responsive: true,
								maintainAspectRatio: false,
								plugins: {
									legend: {
										position: 'top',
										labels: { color: '#64748b', font: { size: 10, weight: 'bold' }, boxWidth: 12 }
									},
									tooltip: {
										backgroundColor: 'rgba(0,0,0,0.8)',
										padding: 12,
										callbacks: {
											label: (context) => ` ${context.dataset.label}: ${formatVND(context.raw)}`
										}
									}
								},
								scales: {
									y: {
										grid: { color: 'rgba(255,255,255,0.03)', drawBorder: false },
										ticks: {
											color: '#64748b',
											font: { size: 9 },
											callback: (val) => val >= 1000000 ? (val / 1000000).toFixed(1) + 'M' : (val / 1000).toFixed(0) + 'k'
										}
									},
									x: {
										grid: { display: false, drawBorder: false },
										ticks: { color: '#64748b', font: { size: 10, weight: 'bold' } }
									}
								}
							}}
							data={{
								labels: ['Thu Nhập', 'Chi Tiêu'],
								datasets: [
									{
										label: 'Kế Hoạch',
										data: [totalInflowProjected, totalOutflowProjected],
										backgroundColor: ['rgba(16, 185, 129, 0.2)', 'rgba(239, 68, 68, 0.2)'],
										borderColor: ['#10b981', '#ef4444'],
										borderWidth: 1,
										borderRadius: 8,
										barThickness: 30,
									},
									{
										label: 'Thực Tế',
										data: [totalInflowActual, totalOutflowActual],
										backgroundColor: ['#10b981', '#ef4444'],
										borderRadius: 8,
										barThickness: 30,
									}
								]
							}}
						/>
					</div>
				</div>
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
										<h3 className="text-2xl font-black tracking-tighter text-white">{editingId ? 'Sửa Bản Ghi' : 'Thêm Bản Ghi'}</h3>
										<p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">{editingId ? 'Cập Nhật Hồ Sơ Tài Chính' : 'Quản Lý Hồ Sơ Tài Chính'}</p>
									</div>
									<button type="button" onClick={() => { setIsEntryModalOpen(false); setEditingId(null); setFormData(initialFormState); }} className="w-10 h-10 bg-white/5 rounded-full flex items-center justify-center text-gray-500 hover:text-white transition-all">
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
									{isSaving ? 'Đang xử lý...' : (editingId ? 'Cập nhật bản ghi' : 'Xác nhận bản ghi')}
								</button>
							</form>
						</motion.div>
					</div>
				)}
			</AnimatePresence>

			{/* Modal for Transaction Detail */}
			<AnimatePresence>
				{selectedTx && (
					<div className="fixed inset-0 z-[250] flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl" onClick={() => setSelectedTx(null)}>
						<motion.div
							initial={{ opacity: 0, scale: 0.95, y: 30 }}
							animate={{ opacity: 1, scale: 1, y: 0 }}
							exit={{ opacity: 0, scale: 0.95, y: 30 }}
							onClick={e => e.stopPropagation()}
							className="bg-[#151921] border border-white/10 w-full max-w-lg rounded-[40px] overflow-hidden shadow-[0_30px_100px_rgba(0,0,0,0.8)]"
						>
							<div className="p-10">
								<div className="flex justify-between items-center mb-10">
									<div>
										<h3 className="text-2xl font-black tracking-tighter text-white">Chi Tiết Giao Dịch</h3>
										<p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">
											{selectedTx.type === 'INCOME' ? 'Khoản Thu' : 'Khoản Chi'} • {selectedTx.status === 'MANUAL' ? 'Bản ghi thủ công' : 'Đã đồng bộ ngân hàng'}
										</p>
									</div>
									<button onClick={() => setSelectedTx(null)} className="w-10 h-10 bg-white/5 rounded-full flex items-center justify-center text-gray-500 hover:text-white transition-all">
										<X size={20} />
									</button>
								</div>

								<div className="space-y-6">
									<div className="bg-black/40 p-6 rounded-3xl border border-white/5">
										<p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2">Mô tả / Nội dung</p>
										<p className="text-lg font-bold text-white leading-tight">{selectedTx.description || 'Không có mô tả'}</p>
									</div>

									<div className="grid grid-cols-2 gap-4">
										<div className="bg-black/40 p-5 rounded-3xl border border-white/5">
											<p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">Ngày tháng</p>
											<p className="text-sm font-bold text-white">{new Date(selectedTx.date).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })}</p>
										</div>
										<div className="bg-black/40 p-5 rounded-3xl border border-white/5">
											<p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">Danh mục</p>
											<p className="text-sm font-bold text-white">{selectedTx.category || 'Khác'}</p>
										</div>
									</div>

									<div className="grid grid-cols-2 gap-4">
										<div className="bg-[#151921] p-6 rounded-3xl border border-white/5 shadow-inner">
											<p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2">Kế hoạch</p>
											<p className="text-xl font-black text-blue-400">{formatVND(selectedTx.projected || 0)}</p>
										</div>
										<div className="bg-[#151921] p-6 rounded-3xl border border-white/5 shadow-inner">
											<p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2">Thực tế</p>
											<p className="text-xl font-black text-white">{formatVND(selectedTx.actual || 0)}</p>
										</div>
									</div>

									<div className="flex items-center justify-between p-6 bg-white/[0.02] rounded-3xl border border-white/5">
										<div>
											<p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">Chênh lệch</p>
											<p className={`text-sm font-black uppercase ${selectedTx.type === 'INCOME'
												? (selectedTx.actual - selectedTx.projected >= 0 ? 'text-emerald-400' : 'text-red-400')
												: (selectedTx.projected - selectedTx.actual < 0 ? 'text-red-400' : 'text-emerald-400')
												}`}>
												{formatVND(Math.abs(selectedTx.actual - selectedTx.projected))}
												<span className="ml-2 text-[8px]">
													({selectedTx.type === 'INCOME'
														? (selectedTx.actual >= selectedTx.projected ? 'Vượt thu' : 'Hụt thu')
														: (selectedTx.actual > selectedTx.projected ? 'Vượt chi' : 'Tiết kiệm')
													})
												</span>
											</p>
										</div>
										<div className="text-right">
											<p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">Nguồn</p>
											<p className="text-xs font-bold text-gray-300">{selectedTx.source || 'N/A'}</p>
										</div>
									</div>
								</div>

								<button
									onClick={() => setSelectedTx(null)}
									className="w-full mt-10 py-5 bg-white/5 text-white text-xs font-black uppercase tracking-widest rounded-3xl hover:bg-white/10 transition-all active:scale-95"
								>
									Đóng
								</button>
							</div>
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
