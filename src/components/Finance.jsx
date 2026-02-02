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
	Edit2,
	ShieldCheck,
	Zap,
	Lock,
	Mail,
	CheckSquare,
	Sparkles
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

const Finance = ({ userEmail, isPro, subStart, subEnd, setActiveTab }) => {
	const [syncing, setSyncing] = useState(false);
	const [isSaving, setIsSaving] = useState(false);
	const [isEntryModalOpen, setIsEntryModalOpen] = useState(false);
	const [showBankingFields, setShowBankingFields] = useState(false);

	const [editingId, setEditingId] = useState(null);
	const initialFormState = {
		date: new Date().toISOString().split('T')[0],
		projected: '',
		actual: '',
		type: 'INCOME',
		category: 'Lương',
		description: '',
		source: 'Tiền mặt',
		orderNo: '',
		sourceAcc: '',
		remitter: '',
		targetAcc: '',
		targetName: ''
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
	const [isPremiumModalOpen, setIsPremiumModalOpen] = useState(false);
	const [isPremiumSubscribed, setIsPremiumSubscribed] = useState(isPro);

	const fetchFinanceData = async () => {
		setLoading(true);
		try {
			const [transData, connStatus] = await Promise.all([
				api.call('getFinanceTransactions', { email: userEmail }, 'finance'),
				api.call('checkGmailConnection', { email: userEmail }, 'finance')
			]);

			if (transData && !transData.error) {
				setTransactions(transData);
			}

			if (isPro || (connStatus && connStatus.connected)) {
				setIsPremiumSubscribed(true);
			}
		} catch (e) {
			console.error("Error fetching finance data", e);
		}
		setLoading(false);
	};

	useEffect(() => {
		fetchFinanceData();
	}, [userEmail, isPro]);

	const handleSync = async () => {
		if (!isPro) {
			setNotification({ type: 'info', message: 'Vui lòng nâng cấp gói Pro để dùng tính năng này!' });
			return;
		}

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

	const handleActivatePremium = async () => {
		setLoading(true);
		try {
			const res = await api.call('getGoogleAuthUrl', { email: userEmail }, 'finance');
			if (res.url) {
				// Mở cửa sổ xác thực Google
				const authWindow = window.open(res.url, 'GoogleAuth', 'width=600,height=600');

				// Theo dõi xem cửa sổ đã đóng chưa
				const checkWindow = setInterval(() => {
					if (authWindow.closed) {
						clearInterval(checkWindow);
						setIsPremiumSubscribed(true); // Giả định thành công sau khi đóng
						setIsPremiumModalOpen(false);
						setNotification({ type: 'success', message: 'Hệ thống đang kiểm tra kết nối Gmail của bạn...' });
						setLoading(false);
						fetchFinanceData();
					}
				}, 1000);
			} else {
				setNotification({ type: 'error', message: res.error || 'Không thể khởi tạo xác thực.' });
				setLoading(false);
			}
		} catch (error) {
			setNotification({ type: 'error', message: 'Lỗi khởi tạo luồng xác thực.' });
			setLoading(false);
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
			source: t.source,
			orderNo: t.orderNo || '',
			sourceAcc: t.sourceAcc || '',
			remitter: t.remitter || '',
			targetAcc: t.targetAcc || '',
			targetName: t.targetName || ''
		});
		setIsEntryModalOpen(true);
		setShowBankingFields(!!(t.orderNo || t.sourceAcc || t.remitter || t.targetAcc || t.targetName));
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
		if (!t.date) return false; // Skip if no date
		try {
			const d = new Date(t.date);
			if (isNaN(d.getTime())) return false; // Skip invalid dates
			const tDate = d.toISOString().split('T')[0];
			if (startDate && tDate < startDate) return false;
			if (endDate && tDate > endDate) return false;
			return true;
		} catch (e) {
			return false;
		}
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

	// Monthly Aggregation for trend (Always 6 months)
	const getMonthlyData = () => {
		const months = [];
		const now = new Date();

		for (let i = 5; i >= 0; i--) {
			const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
			const monthStart = new Date(d.getFullYear(), d.getMonth(), 1);
			const monthEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0);
			const monthLabel = d.toLocaleDateString('vi-VN', { month: 'short', year: '2-digit' });

			const monthTx = transactions.filter(t => {
				if (!t.date) return false;
				const txDate = new Date(t.date);
				return txDate >= monthStart && txDate <= monthEnd;
			});

			const inc = monthTx.filter(t => String(t.type).toUpperCase() === 'INCOME').reduce((sum, t) => sum + (parseFloat(t.actual) || 0), 0);
			const exp = monthTx.filter(t => String(t.type).toUpperCase() === 'EXPENSE').reduce((sum, t) => sum + (parseFloat(t.actual) || 0), 0);

			months.push({ label: monthLabel, income: inc, expense: exp });
		}
		return months;
	};

	const monthlyHistory = getMonthlyData();

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
			<div className="p-4 border-t border-faint flex items-center justify-center gap-2 bg-muted">
				<button
					onClick={() => onPageChange(Math.max(1, current - 1))}
					disabled={current === 1}
					className="p-2 hover:bg-muted rounded-lg transition-colors disabled:opacity-20"
				>
					<ChevronLeft size={16} />
				</button>

				<div className="flex items-center gap-1">
					{pages.map((p, idx) => (
						p === '...' ? (
							<span key={idx} className="px-2 text-textSecondary text-[10px] font-black">...</span>
						) : (
							<button
								key={idx}
								onClick={() => onPageChange(p)}
								className={`min-w-[32px] h-8 rounded-lg text-[10px] font-black transition-all ${current === p ? 'bg-blue-600 text-textPrimary' : 'text-textSecondary hover:bg-muted'}`}
							>
								{p}
							</button>
						)
					))}
				</div>

				<button
					onClick={() => onPageChange(Math.min(total, current + 1))}
					disabled={current === total}
					className="p-2 hover:bg-muted rounded-lg transition-colors disabled:opacity-20"
				>
					<ChevronRight size={16} />
				</button>
			</div>
		);
	};

	return (
		<div className="flex-1 overflow-auto bg-background text-textPrimary p-3 md:p-6 lg:p-10 font-sans selection:bg-blue-500/30 relative">
			{/* Toast Notification */}
			<AnimatePresence>
				{notification && (
					<motion.div
						initial={{ opacity: 0, y: -20, x: '-50%' }}
						animate={{ opacity: 1, y: 0, x: '-50%' }}
						exit={{ opacity: 0, y: -20, x: '-50%' }}
						className={`fixed top-6 left-1/2 z-[300] px-6 py-3 rounded-2xl border shadow-2xl backdrop-blur-xl flex items-center gap-3 text-[11px] font-black uppercase tracking-widest ${notification.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/20 text-success' :
							notification.type === 'info' ? 'bg-blue-500/10 border-blue-500/20 text-primary' :
								'bg-red-500/10 border-red-500/20 text-danger'
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
			<div className="flex flex-col xl:flex-row justify-between items-stretch xl:items-center gap-4 mb-6 bg-muted p-4 lg:p-6 rounded-[24px] lg:rounded-[32px] border border-faint shadow-2xl">
				<div className="flex flex-wrap items-end gap-3 lg:gap-4 w-full xl:w-auto">
					<div className="flex flex-col gap-1.5 flex-1 min-w-[140px] sm:flex-none">
						<label className="text-[8px] lg:text-[9px] font-black text-textSecondary uppercase tracking-widest ml-1">Từ</label>
						<div className="relative group">
							<Clock size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-textSecondary group-hover:text-primary transition-colors" />
							<input
								type="date"
								value={startDate}
								onChange={(e) => { setStartDate(e.target.value); setIncomePage(1); setExpensePage(1); }}
								className="bg-muted border border-faint rounded-xl pl-9 pr-3 py-2 text-[10px] lg:text-[11px] font-bold focus:outline-none focus:border-primary/50 transition-all w-full sm:w-40 h-[38px]"
							/>
						</div>
					</div>
					<div className="flex flex-col gap-1.5 flex-1 min-w-[140px] sm:flex-none">
						<label className="text-[8px] lg:text-[9px] font-black text-textSecondary uppercase tracking-widest ml-1">Đến</label>
						<div className="relative group">
							<Clock size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-textSecondary group-hover:text-primary transition-colors" />
							<input
								type="date"
								value={endDate}
								onChange={(e) => { setEndDate(e.target.value); setIncomePage(1); setExpensePage(1); }}
								className="bg-muted border border-faint rounded-xl pl-9 pr-3 py-2 text-[10px] lg:text-[11px] font-bold focus:outline-none focus:border-primary/50 transition-all w-full sm:w-40 h-[38px]"
							/>
						</div>
					</div>
					<button
						onClick={() => { setStartDate(''); setEndDate(''); }}
						className="hidden sm:block bg-muted border border-faint rounded-xl px-6 py-2 text-[10px] font-black uppercase tracking-widest hover:bg-muted transition-all h-[38px] w-auto active:scale-95"
					>
						Tất cả
					</button>
				</div>

				<div className="flex items-center gap-2 lg:gap-3 w-full xl:w-auto">
					<button
						onClick={() => { setStartDate(''); setEndDate(''); }}
						className="sm:hidden flex-1 bg-muted border border-faint rounded-xl py-3 text-[10px] font-black uppercase tracking-widest hover:bg-muted transition-all h-[44px] active:scale-95"
					>
						Tất cả
					</button>
					{isPro && (
						<button
							onClick={handleSync}
							disabled={syncing}
							className={`flex-1 xl:flex-none glass border border-faint px-4 lg:px-6 py-3 rounded-xl lg:rounded-2xl text-[9px] lg:text-[10px] font-black uppercase tracking-widest hover:bg-muted transition-all flex items-center justify-center gap-2 h-[44px] ${!isPremiumSubscribed ? 'text-amber-500' : ''}`}
						>
							{isPremiumSubscribed ? (
								<RefreshCw size={14} className={syncing ? 'animate-spin text-primary' : ''} />
							) : (
								<Zap size={14} fill="currentColor" />
							)}
							<span className="inline">{syncing ? '...' : (isPremiumSubscribed ? 'Cập nhật' : 'Deep Sync')}</span>
						</button>
					)}
					<button
						onClick={() => {
							setEditingId(null);
							setFormData(initialFormState);
							setIsEntryModalOpen(true);
							setShowBankingFields(false);
						}}
						className="flex-1 xl:flex-none bg-primary hover:bg-primary/90 text-white px-4 lg:px-8 py-3 rounded-xl lg:rounded-2xl text-[9px] lg:text-[10px] font-black uppercase tracking-widest shadow-xl shadow-primary/20 transition-all flex items-center justify-center gap-2 h-[44px]"
					>
						<Plus size={16} />
						<span className="inline">Thêm</span>
					</button>
				</div>
			</div>

			{isPro && subStart && subEnd && (
				<div className="mb-8 glass p-6 rounded-[32px] border-emerald-500/20 flex flex-col md:flex-row items-center justify-between gap-6 overflow-hidden relative group bg-emerald-500/5">
					<div className="absolute -right-10 -top-10 w-40 h-40 bg-emerald-500/10 rounded-full blur-3xl group-hover:bg-emerald-500/20 transition-all"></div>
					<div className="relative z-10 flex items-center gap-6">
						<div className="p-4 bg-emerald-500/10 rounded-2xl text-emerald-500 animate-pulse">
							<ShieldCheck size={24} />
						</div>
						<div>
							<h3 className="text-lg font-black uppercase tracking-tight text-emerald-500">Tài khoản đã nâng cấp tính năng</h3>
							<div className="flex flex-wrap gap-4 mt-2">
								<p className="text-textSecondary font-bold text-xs flex items-center gap-1.5">
									<CheckCircle2 size={14} className="text-emerald-500" />
									Ngày kích hoạt: <span className="text-textPrimary">{new Date(subStart).toLocaleDateString('vi-VN')}</span>
								</p>
								<div className="w-px h-4 bg-faint hidden md:block"></div>
								<p className="text-textSecondary font-bold text-xs flex items-center gap-1.5">
									<Clock size={14} className="text-emerald-500" />
									Ngày kết thúc: <span className="text-textPrimary">{new Date(subEnd).toLocaleDateString('vi-VN')}</span>
								</p>
							</div>
						</div>
					</div>
					<div className="relative z-10 px-6 py-2 bg-emerald-500/10 text-emerald-600 rounded-xl font-black text-[10px] uppercase tracking-widest border border-emerald-500/20 shadow-lg shadow-emerald-500/10">
						Vifun Pro
					</div>
				</div>
			)}

			{!isPro && (
				<div className="mb-8 glass p-6 rounded-[32px] border-primary/30 flex flex-col md:flex-row items-center justify-between gap-6 overflow-hidden relative group">
					<div className="absolute -right-10 -top-10 w-40 h-40 bg-primary/10 rounded-full blur-3xl group-hover:bg-primary/20 transition-all"></div>
					<div className="relative z-10 flex items-center gap-6">
						<div className="p-4 bg-primary/10 rounded-2xl text-primary animate-bounce">
							<Sparkles size={24} />
						</div>
						<div>
							<h3 className="text-lg font-black uppercase tracking-tight">Tự động hóa Thu Chi ngay hôm nay!</h3>
							<p className="text-textSecondary font-bold text-xs">Nâng cấp gói Pro (300k/năm) để tự động hóa việc nhập liệu từ email ngân hàng.</p>
						</div>
					</div>
					<button
						onClick={() => setActiveTab('upgrade')}
						className="relative z-10 px-8 py-3 bg-primary text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-primary/20 hover:bg-primaryHover transition-all"
					>
						Khám phá gói Pro
					</button>
				</div>
			)}

			{/* High-level stats - Grid layout for better responsiveness */}
			<div className="grid grid-cols-2 xl:grid-cols-4 gap-2 md:gap-3 lg:gap-4 mb-6 md:mb-8">
				<div className="bg-muted p-3 md:p-4 lg:p-6 rounded-[20px] lg:rounded-[24px] border border-faint flex flex-col justify-between shadow-sm min-h-[80px]">
					<div className="flex justify-between items-start">
						<div>
							<p className="text-[8px] font-black text-textSecondary uppercase tracking-widest mb-1 md:mb-2 lg:mb-3">Thu Nhập</p>
							<div className="flex flex-col gap-0.5">
								<span className="text-sm md:text-lg lg:text-3xl font-black text-success tracking-tighter truncate">{formatVND(totalInflowActual)}</span>
								<p className="text-[8px] lg:text-[10px] font-bold text-textSecondary uppercase tracking-wider opacity-60 truncate">KH: {formatVND(totalInflowProjected)}</p>
							</div>
						</div>
						{isPro && subEnd && (
							<div className="px-2 py-1 bg-primary/10 rounded-lg border border-primary/10">
								<p className="text-[7px] font-black text-primary uppercase">Pro: {new Date(subEnd).toLocaleDateString('vi-VN')}</p>
							</div>
						)}
					</div>
				</div>
				<div className="bg-muted p-3 md:p-4 lg:p-6 rounded-[20px] lg:rounded-[24px] border border-faint flex flex-col justify-between shadow-sm min-h-[80px]">
					<div>
						<p className="text-[8px] font-black text-textSecondary uppercase tracking-widest mb-1 md:mb-2 lg:mb-3">Chi Tiêu</p>
						<div className="flex flex-col gap-0.5">
							<span className="text-sm md:text-lg lg:text-3xl font-black text-danger tracking-tighter truncate">{formatVND(totalOutflowActual)}</span>
							<p className="text-[8px] lg:text-[10px] font-bold text-textSecondary uppercase tracking-wider opacity-60 truncate">KH: {formatVND(totalOutflowProjected)}</p>
						</div>
					</div>
				</div>
				<div className="bg-muted p-3 md:p-4 lg:p-6 rounded-[20px] lg:rounded-[24px] border border-faint flex flex-col justify-between shadow-sm min-h-[80px]">
					<p className="text-[8px] font-black text-textSecondary uppercase tracking-widest mb-1 md:mb-2 lg:mb-3">LN Ròng</p>
					<div className="flex items-baseline gap-2">
						<span className={`text-sm md:text-lg lg:text-3xl font-black tracking-tighter truncate ${netLiquidity >= 0 ? 'text-primary' : 'text-danger'}`}>{formatVND(netLiquidity)}</span>
					</div>
				</div>
				<div className="bg-muted p-3 md:p-4 lg:p-6 rounded-[20px] lg:rounded-[24px] border border-faint flex flex-col justify-between shadow-sm min-h-[80px]">
					<div className="flex justify-between items-center mb-1 md:mb-2 lg:mb-3">
						<p className="text-[8px] font-black text-textSecondary uppercase tracking-widest">Burn Rate</p>
						<span className={`text-[9px] md:text-[10px] lg:text-[11px] font-black ${burnRate >= 100 ? 'text-danger' : 'text-success'}`}>{burnRate.toFixed(0)}%</span>
					</div>
					<div className="h-1.5 lg:h-2 w-full bg-background rounded-full overflow-hidden border border-faint">
						<motion.div
							initial={{ width: 0 }}
							animate={{ width: `${Math.min(100, burnRate)}%` }}
							className={`h-full ${burnRate >= 100 ? 'bg-danger' : burnRate > 80 ? 'bg-warning' : 'bg-success'} shadow-[0_0_10px_var(--color-success)]`}
						/>
					</div>
				</div>
			</div>

			{/* Main Grid: Revenue vs Expenses - Optimized layout */}
			<div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8 mb-8">
				{/* Revenue Table */}
				<section className="bg-muted border border-faint rounded-[24px] lg:rounded-[32px] overflow-hidden shadow-2xl flex flex-col">
					<div className="p-5 lg:p-8 border-b border-faint flex justify-between items-center bg-muted">
						<div className="flex items-center gap-3">
							<div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-success flex items-center justify-center border border-emerald-500/10">
								<InflowIcon size={16} />
							</div>
							<h3 className="font-black text-xs lg:text-sm uppercase tracking-widest">Thu Nhập</h3>
						</div>
						<div className="flex items-center gap-2">
							<div className="px-2 py-1 bg-muted rounded-lg border border-faint">
								<span className="text-[8px] font-black text-textSecondary uppercase tracking-wider">Kế hoạch: {formatVND(totalInflowProjected)}</span>
							</div>
							<div className="px-2 py-1 bg-emerald-500/10 rounded-lg border border-emerald-500/10">
								<span className="text-[8px] font-black text-success uppercase tracking-wider">Thực tế: {formatVND(totalInflowActual)}</span>
							</div>
						</div>
					</div>
					{/* Tablet & Desktop Table View */}
					<div className="hidden sm:block flex-1 overflow-x-auto scrollbar-hide">
						<table className="w-full text-left border-collapse">
							<thead>
								<tr className="text-[8px] lg:text-[9px] font-black text-textSecondary uppercase tracking-widest border-b border-faint">
									<th className="px-3 md:px-4 lg:px-6 py-4">Ngày / Mô tả</th>
									<th className="px-2 py-4">Kế hoạch</th>
									<th className="px-2 py-4">Thực tế</th>
									<th className="px-2 md:px-4 lg:px-6 py-4 text-right">Tình trạng</th>
									<th className="px-3 py-4 text-right">Sửa/Xóa</th>
								</tr>
							</thead>
							<tbody className="text-[11px] lg:text-xs font-bold divide-y divide-faint">
								{currentIncomes.map((t, i) => {
									const actual = parseFloat(t.actual) || 0;
									const projected = parseFloat(t.projected) || 0;
									const variance = actual - projected;
									const dateObj = new Date(t.date);
									const isManual = t.status === 'MANUAL';
									return (
										<tr
											key={i}
											className="hover:bg-muted transition-all group cursor-pointer"
										>
											<td className="px-3 md:px-4 lg:px-6 py-4" onClick={() => setSelectedTx(t)}>
												<div className="flex flex-col gap-1">
													<div className="flex items-center gap-2">
														<span className="text-textSecondary group-hover:text-textPrimary transition-colors">
															{!isNaN(dateObj.getTime()) ? dateObj.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' }) : 'N/A'}
														</span>
														{isManual ? null : <span className="text-[9px] text-textSecondary font-medium opacity-60">Synced</span>}
													</div>
													<span className="text-[10px] text-textSecondary group-hover:text-textSecondary font-medium truncate max-w-[80px] md:max-w-[150px]" title={t.description}>
														{t.description || (isManual ? 'Nhập tay' : 'Ngân hàng')}
													</span>
												</div>
											</td>
											<td className="px-2 py-4 text-textSecondary font-medium whitespace-nowrap">{formatVND(projected)}</td>
											<td className="px-2 py-4 text-textPrimary font-bold whitespace-nowrap">{formatVND(actual)}</td>
											<td className="px-2 md:px-4 lg:px-6 py-4 text-right">
												{variance === 0 ? (
													<span className="text-[8px] font-black text-textSecondary bg-muted px-2 py-1 rounded border border-faint uppercase tracking-widest">Đã khớp</span>
												) : (
													<span className={`text-[9px] font-black uppercase ${variance > 0 ? 'text-success' : 'text-danger'}`}>
														{variance > 0 ? 'Vượt thu' : 'Hụt thu'}
													</span>
												)}
											</td>
											<td className="px-2 py-4 text-right">
												<div className="flex items-center justify-end gap-1 md:gap-2 opacity-0 group-hover:opacity-100 transition-all">
													<button
														onClick={(e) => { e.stopPropagation(); handleOpenEdit(t); }}
														className="p-1.5 md:p-2 hover:bg-muted text-textPrimary rounded-lg transition-colors"
														title="Sửa"
													>
														<Edit2 size={12} className="md:w-[14px] md:h-[14px]" />
													</button>
													<button
														onClick={(e) => { e.stopPropagation(); handleDeleteTransaction(t.id); }}
														className="p-1.5 md:p-2 hover:bg-muted text-textPrimary rounded-lg transition-colors"
														title="Xóa"
													>
														<Trash2 size={12} className="md:w-[14px] md:h-[14px]" />
													</button>
												</div>
											</td>
										</tr>
									);
								})}
							</tbody>
						</table>
					</div>

					{/* Mobile Card-based View */}
					<div className="sm:hidden flex-1 overflow-y-auto max-h-[400px] border-t border-faint">
						{currentIncomes.length > 0 ? currentIncomes.map((t, i) => (
							<div
								key={i}
								onClick={() => setSelectedTx(t)}
								className="p-4 border-b border-faint active:bg-muted transition-all"
							>
								<div className="flex justify-between items-start mb-2">
									<div className="flex flex-col gap-1">
										<div className="flex items-center gap-2">
											<span className="text-[10px] font-black text-textSecondary uppercase">
												{new Date(t.date).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: '2-digit' })}
											</span>
											{t.status !== 'MANUAL' && <span className="text-[8px] bg-primary/10 text-primary px-1.5 py-0.5 rounded uppercase font-black">Synced</span>}
										</div>
										<h4 className="text-xs font-black text-textPrimary leading-tight max-w-[180px] truncate">{t.description || 'Thu nhập mới'}</h4>
									</div>
									<div className="flex items-center gap-2">
										<button onClick={(e) => { e.stopPropagation(); handleOpenEdit(t); }} className="p-2 bg-muted rounded-lg text-textSecondary"><Edit2 size={14} /></button>
										<button onClick={(e) => { e.stopPropagation(); handleDeleteTransaction(t.id); }} className="p-2 bg-danger/10 text-danger rounded-lg"><Trash2 size={14} /></button>
									</div>
								</div>
								<div className="grid grid-cols-2 gap-4">
									<div>
										<p className="text-[8px] font-black text-textSecondary uppercase tracking-widest mb-0.5 opacity-50">Thực thu</p>
										<p className="text-sm font-black text-success">{formatVND(t.actual)}</p>
									</div>
									<div className="text-right">
										<p className="text-[8px] font-black text-textSecondary uppercase tracking-widest mb-0.5 opacity-50">Kế hoạch / Tình trạng</p>
										<div className="flex flex-col items-end">
											<p className="text-[10px] font-bold text-textSecondary">{formatVND(t.projected)}</p>
											<span className={`text-[9px] font-black mt-1 ${parseFloat(t.actual) >= parseFloat(t.projected) ? 'text-success' : 'text-danger'}`}>
												{parseFloat(t.actual) >= parseFloat(t.projected) ? 'Khớp/Vượt' : 'Hụt thu'}
											</span>
										</div>
									</div>
								</div>
							</div>
						)) : (
							<div className="p-10 text-center opacity-30 text-[10px] font-black uppercase">Không có dữ liệu</div>
						)}
					</div>

					<Pagination
						current={incomePage}
						total={totalIncomePages}
						onPageChange={setIncomePage}
					/>
				</section>

				{/* Expense Table */}
				<section className="bg-muted border border-faint rounded-[24px] lg:rounded-[32px] overflow-hidden shadow-2xl flex flex-col">
					<div className="p-5 lg:p-8 border-b border-faint flex justify-between items-center bg-muted">
						<div className="flex items-center gap-3">
							<div className="w-8 h-8 rounded-xl bg-red-500/10 text-danger flex items-center justify-center border border-red-500/10">
								<OutflowIcon size={16} />
							</div>
							<h3 className="font-black text-xs lg:text-sm uppercase tracking-widest">Chi Tiêu</h3>
						</div>
						<div className="flex items-center gap-2">
							<div className="px-2 py-1 bg-muted rounded-lg border border-faint">
								<span className="text-[8px] font-black text-textSecondary uppercase tracking-wider">Kế hoạch: {formatVND(totalOutflowProjected)}</span>
							</div>
							<div className="px-2 py-1 bg-red-500/10 rounded-lg border border-red-500/10">
								<span className="text-[8px] font-black text-danger uppercase tracking-wider">Thực tế: {formatVND(totalOutflowActual)}</span>
							</div>
						</div>
					</div>
					{/* Tablet & Desktop Table View */}
					<div className="hidden sm:block flex-1 overflow-x-auto scrollbar-hide">
						<table className="w-full text-left border-collapse">
							<thead>
								<tr className="text-[8px] lg:text-[9px] font-black text-textSecondary uppercase tracking-widest border-b border-faint">
									<th className="px-3 md:px-4 lg:px-6 py-4">Ngày / Mô tả</th>
									<th className="px-2 py-4">Kế hoạch</th>
									<th className="px-2 py-4">Thực tế</th>
									<th className="px-2 md:px-4 lg:px-6 py-4 text-right">Tình trạng</th>
									<th className="px-3 py-4 text-right">Sửa/Xóa</th>
								</tr>
							</thead>
							<tbody className="text-[11px] lg:text-xs font-bold divide-y divide-faint">
								{currentExpenses.map((t, i) => {
									const actual = parseFloat(t.actual) || 0;
									const projected = parseFloat(t.projected) || 0;
									const variance = projected - actual;
									const dateObj = new Date(t.date);
									const isManual = t.status === 'MANUAL';
									return (
										<tr
											key={i}
											className="hover:bg-muted transition-all group cursor-pointer"
										>
											<td className="px-3 md:px-4 lg:px-6 py-4" onClick={() => setSelectedTx(t)}>
												<div className="flex flex-col gap-1">
													<div className="flex items-center gap-2">
														<span className="text-textSecondary group-hover:text-textPrimary transition-colors">
															{!isNaN(dateObj.getTime()) ? dateObj.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' }) : 'N/A'}
														</span>
														{isManual ? null : <span className="text-[9px] text-textSecondary font-medium opacity-60">Synced</span>}
													</div>
													<span className="text-[10px] text-textSecondary group-hover:text-textSecondary font-medium truncate max-w-[80px] md:max-w-[150px]" title={t.description}>
														{t.description || (isManual ? 'Nhập tay' : 'Hóa đơn')}
													</span>
												</div>
											</td>
											<td className="px-2 py-4 text-textSecondary font-medium whitespace-nowrap">{formatVND(projected)}</td>
											<td className="px-2 py-4 text-textPrimary font-bold whitespace-nowrap">{formatVND(actual)}</td>
											<td className="px-2 md:px-4 lg:px-6 py-4 text-right">
												{variance === 0 ? (
													<span className="text-[8px] font-black text-textSecondary bg-muted px-2 py-1 rounded border border-faint uppercase tracking-widest">Đã khớp</span>
												) : (
													<span className={`text-[9px] font-black uppercase ${variance < 0 ? 'text-danger' : 'text-success'}`}>
														{variance < 0 ? 'Vượt chi' : 'Tiết kiệm'}
													</span>
												)}
											</td>
											<td className="px-2 py-4 text-right">
												<div className="flex items-center justify-end gap-1 md:gap-2 opacity-0 group-hover:opacity-100 transition-all">
													<button
														onClick={(e) => { e.stopPropagation(); handleOpenEdit(t); }}
														className="p-1.5 md:p-2 hover:bg-muted text-textPrimary rounded-lg transition-colors"
														title="Sửa"
													>
														<Edit2 size={12} className="md:w-[14px] md:h-[14px]" />
													</button>
													<button
														onClick={(e) => { e.stopPropagation(); handleDeleteTransaction(t.id); }}
														className="p-1.5 md:p-2 hover:bg-muted text-textPrimary rounded-lg transition-colors"
														title="Xóa"
													>
														<Trash2 size={12} className="md:w-[14px] md:h-[14px]" />
													</button>
												</div>
											</td>
										</tr>
									);
								})}
							</tbody>
						</table>
					</div>

					{/* Mobile Card-based View */}
					<div className="sm:hidden flex-1 overflow-y-auto max-h-[400px] border-t border-faint">
						{currentExpenses.length > 0 ? currentExpenses.map((t, i) => (
							<div
								key={i}
								onClick={() => setSelectedTx(t)}
								className="p-4 border-b border-faint active:bg-muted transition-all"
							>
								<div className="flex justify-between items-start mb-2">
									<div className="flex flex-col gap-1">
										<div className="flex items-center gap-2">
											<span className="text-[10px] font-black text-textSecondary uppercase">
												{new Date(t.date).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: '2-digit' })}
											</span>
											{t.status !== 'MANUAL' && <span className="text-[8px] bg-primary/10 text-primary px-1.5 py-0.5 rounded uppercase font-black">Synced</span>}
										</div>
										<h4 className="text-xs font-black text-textPrimary leading-tight max-w-[180px] truncate">{t.description || 'Chi tiêu mới'}</h4>
									</div>
									<div className="flex items-center gap-2">
										<button onClick={(e) => { e.stopPropagation(); handleOpenEdit(t); }} className="p-2 bg-muted rounded-lg text-textSecondary"><Edit2 size={14} /></button>
										<button onClick={(e) => { e.stopPropagation(); handleDeleteTransaction(t.id); }} className="p-2 bg-danger/10 text-danger rounded-lg"><Trash2 size={14} /></button>
									</div>
								</div>
								<div className="grid grid-cols-2 gap-4">
									<div>
										<p className="text-[8px] font-black text-textSecondary uppercase tracking-widest mb-0.5 opacity-50">Thực chi</p>
										<p className="text-sm font-black text-danger">{formatVND(t.actual)}</p>
									</div>
									<div className="text-right">
										<p className="text-[8px] font-black text-textSecondary uppercase tracking-widest mb-0.5 opacity-50">Kế hoạch / Tình trạng</p>
										<div className="flex flex-col items-end">
											<p className="text-[10px] font-bold text-textSecondary">{formatVND(t.projected)}</p>
											<span className={`text-[9px] font-black mt-1 ${parseFloat(t.actual) <= parseFloat(t.projected) ? 'text-success' : 'text-danger'}`}>
												{parseFloat(t.actual) <= parseFloat(t.projected) ? 'Tiết kiệm' : 'Vượt chi'}
											</span>
										</div>
									</div>
								</div>
							</div>
						)) : (
							<div className="p-10 text-center opacity-30 text-[10px] font-black uppercase">Không có dữ liệu</div>
						)}
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
				<div className="bg-muted border border-faint rounded-[24px] lg:rounded-[32px] p-3 md:p-6 lg:p-8 shadow-2xl">
					<div className="flex justify-between items-center mb-4 md:mb-6">
						<div className="max-w-[80%]">
							<h4 className="text-[8px] md:text-[10px] font-black text-textSecondary uppercase tracking-[0.2em] mb-1">Cân Đối</h4>
							<h3 className="text-sm md:text-lg font-black text-textPrimary uppercase tracking-tighter leading-tight">Thu Nhập vs Chi Tiêu</h3>
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
								labels: ['Tổng Thực Thu', 'Tổng Thực Chi', 'Thanh Khoản Ròng'],
								datasets: [
									{
										label: 'Dòng Tiền',
										data: [totalInflowActual, totalOutflowActual, netLiquidity],
										backgroundColor: ['#10b981', '#ef4444', '#3b82f6'],
										borderRadius: 8,
										maxBarThickness: 45,
									}
								]
							}}
						/>
					</div>
				</div>

				{/* Chart 2: Kế Hoạch vs Thực Tế */}
				<div className="bg-muted border border-faint rounded-[24px] lg:rounded-[32px] p-3 md:p-6 lg:p-8 shadow-2xl">
					<div className="flex justify-between items-center mb-4 md:mb-6">
						<div className="max-w-[80%]">
							<h4 className="text-[8px] md:text-[10px] font-black text-textSecondary uppercase tracking-[0.2em] mb-1">Hiệu Suất</h4>
							<h3 className="text-sm md:text-lg font-black text-textPrimary uppercase tracking-tighter leading-tight">Kế Hoạch vs Thực Tế</h3>
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
										maxBarThickness: 40,
									},
									{
										label: 'Thực Tế',
										data: [totalInflowActual, totalOutflowActual],
										backgroundColor: ['#10b981', '#ef4444'],
										borderRadius: 8,
										maxBarThickness: 40,
									}
								]
							}}
						/>
					</div>
				</div>
			</div>

			{/* Chart 3: Tổng Hợp Theo Tháng (Full Width) */}
			<div className="bg-muted border border-faint rounded-[24px] lg:rounded-[32px] p-3 md:p-6 lg:p-8 shadow-2xl mb-12">
				<div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 md:mb-8">
					<div className="max-w-full">
						<h4 className="text-[8px] md:text-[10px] font-black text-textSecondary uppercase tracking-[0.2em] mb-1">Xu Thế</h4>
						<h3 className="text-sm md:text-xl font-black text-textPrimary uppercase tracking-tighter leading-tight">Tổng Hợp Thu Nhập & Chi Tiêu Hàng Tháng</h3>
					</div>
					<div className="flex gap-4">
						<div className="flex items-center gap-2">
							<div className="w-2 md:w-3 h-2 md:h-3 rounded-full bg-emerald-500"></div>
							<span className="text-[8px] md:text-[10px] font-bold text-textSecondary uppercase">Thu Nhập</span>
						</div>
						<div className="flex items-center gap-2">
							<div className="w-2 md:w-3 h-2 md:h-3 rounded-full bg-red-500"></div>
							<span className="text-[8px] md:text-[10px] font-bold text-textSecondary uppercase">Chi Tiêu</span>
						</div>
					</div>
				</div>
				<div className="h-[250px] md:h-[350px] w-full">
					<Bar
						options={{
							responsive: true,
							maintainAspectRatio: false,
							plugins: {
								legend: { display: false },
								tooltip: {
									backgroundColor: 'rgba(0,0,0,0.9)',
									padding: 16,
									titleFont: { size: 12, weight: 'bold' },
									bodyFont: { size: 13 },
									cornerRadius: 12,
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
										font: { size: 8 },
										callback: (val) => val >= 1000000 ? (val / 1000000).toFixed(1) + 'M' : (val / 1000).toFixed(0) + 'k'
									}
								},
								x: {
									grid: { display: false, drawBorder: false },
									ticks: { color: '#94a3b8', font: { size: 9, weight: 'bold' } }
								}
							}
						}}
						data={{
							labels: monthlyHistory.map(m => m.label),
							datasets: [
								{
									label: 'Thu Nhập',
									data: monthlyHistory.map(m => m.income),
									backgroundColor: '#10b981',
									borderRadius: 6,
									maxBarThickness: 30,
								},
								{
									label: 'Chi Tiêu',
									data: monthlyHistory.map(m => m.expense),
									backgroundColor: '#ef4444',
									borderRadius: 6,
									maxBarThickness: 30,
								}
							]
						}}
					/>
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
							className="bg-surface border border-faint w-full max-w-lg rounded-[24px] md:rounded-[40px] overflow-hidden shadow-[0_30px_100px_rgba(0,0,0,0.2)] max-h-[92vh] flex flex-col"
						>
							<form onSubmit={handleAddTransaction} className="flex flex-col h-full overflow-hidden">
								<div className="p-5 md:p-10 pb-0 md:pb-0">
									<div className="flex justify-between items-center mb-4 md:mb-8">
										<div>
											<h3 className="text-lg md:text-2xl font-black tracking-tighter text-textPrimary">{editingId ? 'Sửa Bản Ghi' : 'Thêm Bản Ghi'}</h3>
											<p className="text-[8px] md:text-[10px] font-black text-textSecondary uppercase tracking-widest">{editingId ? 'Cập Nhật Hồ Sơ' : 'Quản Lý Hồ Sơ'}</p>
										</div>
										<button type="button" onClick={() => { setIsEntryModalOpen(false); setEditingId(null); setFormData(initialFormState); setShowBankingFields(false); }} className="w-8 h-8 md:w-10 md:h-10 bg-muted rounded-full flex items-center justify-center text-textSecondary hover:text-textPrimary transition-all">
											<X size={18} />
										</button>
									</div>
								</div>

								<div className="flex-1 overflow-y-auto p-5 md:p-10 pt-0 md:pt-0 scrollbar-hide">
									<div className="space-y-5 md:space-y-8">
										{/* Type Toggle */}
										<div className="flex bg-muted p-1 rounded-[16px] md:rounded-[20px] border border-faint">
											<button
												type="button"
												onClick={() => setFormData({ ...formData, type: 'INCOME' })}
												className={`flex-1 py-3 md:py-4 rounded-[12px] md:rounded-[14px] text-[9px] md:text-[10px] font-black transition-all tracking-widest uppercase ${formData.type === 'INCOME' ? 'bg-blue-600 text-textPrimary shadow-lg' : 'text-textSecondary hover:text-textPrimary'}`}
											>
												Khoản Thu
											</button>
											<button
												type="button"
												onClick={() => setFormData({ ...formData, type: 'EXPENSE' })}
												className={`flex-1 py-3 md:py-4 rounded-[12px] md:rounded-[14px] text-[9px] md:text-[10px] font-black transition-all tracking-widest uppercase ${formData.type === 'EXPENSE' ? 'bg-blue-600 text-textPrimary shadow-lg' : 'text-textSecondary hover:text-textPrimary'}`}
											>
												Khoản Chi
											</button>
										</div>

										{/* Date Field */}
										<div>
											<label className="text-[9px] md:text-[10px] font-black text-textSecondary uppercase tracking-[0.2em] block mb-2 md:mb-3">Ngày giao dịch</label>
											<input
												type="date"
												required
												value={formData.date}
												onChange={e => setFormData({ ...formData, date: e.target.value })}
												className="w-full bg-muted border border-faint rounded-xl md:rounded-2xl py-3 md:py-4 px-4 md:px-6 text-[11px] md:text-xs font-black text-textPrimary focus:border-blue-500 outline-none transition-all"
											/>
										</div>

										{/* Comparison Fields */}
										<div className="grid grid-cols-2 gap-4 md:gap-6">
											<div>
												<label className="text-[9px] md:text-[10px] font-black text-textSecondary uppercase tracking-[0.2em] block mb-2 md:mb-3">Số tiền Dự kiến</label>
												<input
													type="number"
													value={formData.projected}
													onChange={e => setFormData({ ...formData, projected: e.target.value })}
													className="w-full bg-muted border border-faint rounded-xl md:rounded-2xl py-3 md:py-4 px-4 md:px-6 text-base md:text-xl font-black text-textPrimary focus:border-blue-500 outline-none transition-all"
													placeholder="0"
												/>
											</div>
											<div>
												<label className="text-[9px] md:text-[10px] font-black text-textSecondary uppercase tracking-[0.2em] block mb-2 md:mb-3">Số tiền Thực tế</label>
												<input
													type="number"
													value={formData.actual}
													onChange={e => setFormData({ ...formData, actual: e.target.value })}
													className="w-full bg-muted border border-faint rounded-xl md:rounded-2xl py-3 md:py-4 px-4 md:px-6 text-base md:text-xl font-black text-textPrimary focus:border-blue-500 outline-none transition-all"
													placeholder="0"
												/>
											</div>
										</div>

										<div className="grid grid-cols-2 gap-4 md:gap-6">
											<div>
												<label className="text-[9px] md:text-[10px] font-black text-textSecondary uppercase tracking-[0.2em] block mb-2 md:mb-3">Danh mục</label>
												<select
													value={formData.category}
													onChange={e => setFormData({ ...formData, category: e.target.value })}
													className="w-full bg-muted border border-faint rounded-xl md:rounded-2xl py-3 md:py-4 px-4 md:px-6 text-[11px] md:text-xs font-black text-textPrimary outline-none appearance-none"
												>
													<option value="Lương">Lương/Thu nhập</option>
													<option value="Kinh doanh">Kinh doanh</option>
													<option value="Sinh hoạt">Sinh hoạt</option>
													<option value="Đầu tư">Đầu tư</option>
													<option value="Khác">Khác</option>
												</select>
											</div>
											<div>
												<label className="text-[9px] md:text-[10px] font-black text-textSecondary uppercase tracking-[0.2em] block mb-2 md:mb-3">Nguồn</label>
												<input
													type="text"
													value={formData.source}
													onChange={e => setFormData({ ...formData, source: e.target.value })}
													className="w-full bg-muted border border-faint rounded-xl md:rounded-2xl py-3 md:py-4 px-4 md:px-6 text-[11px] md:text-xs font-black text-textPrimary outline-none"
													placeholder="Ngân hàng, Tiền mặt..."
												/>
											</div>
										</div>

										<div>
											<label className="text-[9px] md:text-[10px] font-black text-textSecondary uppercase tracking-[0.2em] block mb-2 md:mb-3">Ghi chú</label>
											<textarea
												value={formData.description}
												onChange={e => setFormData({ ...formData, description: e.target.value })}
												className="w-full bg-muted border border-faint rounded-xl md:rounded-2xl py-3 md:py-4 px-4 md:px-6 text-[11px] md:text-xs font-bold text-textPrimary outline-none h-16 md:h-20 resize-none"
												placeholder="Chi tiết giao dịch nội bộ..."
											/>
										</div>

										{/* Advanced Banking Fields */}
										<div className="pt-6 border-t border-faint">
											<button
												type="button"
												onClick={() => setShowBankingFields(!showBankingFields)}
												className="w-full py-3 bg-muted border border-faint rounded-xl text-[10px] font-black text-blue-500 uppercase tracking-widest hover:bg-muted/50 transition-all flex items-center justify-center gap-2 mb-5"
											>
												{showBankingFields ? <ChevronRight size={14} className="rotate-90" /> : <Plus size={14} />}
												{showBankingFields ? 'Ẩn thông tin ngân hàng' : 'Thông tin ngân hàng (Tùy chọn)'}
											</button>

											<AnimatePresence>
												{showBankingFields && (
													<motion.div
														initial={{ opacity: 0, height: 0 }}
														animate={{ opacity: 1, height: 'auto' }}
														exit={{ opacity: 0, height: 0 }}
														className="space-y-5 overflow-hidden"
													>
														<div className="grid grid-cols-2 gap-4">
															<div>
																<label className="text-[9px] font-black text-textSecondary uppercase block mb-2">Mã giao dịch</label>
																<input
																	type="text"
																	value={formData.orderNo}
																	onChange={e => setFormData({ ...formData, orderNo: e.target.value })}
																	className="w-full bg-muted border border-faint rounded-xl py-3 px-4 text-[11px] font-bold text-textPrimary focus:border-blue-500 outline-none transition-all"
																	placeholder="Ví d: 12845..."
																/>
															</div>
															<div>
																<label className="text-[9px] font-black text-textSecondary uppercase block mb-2">Người gửi</label>
																<input
																	type="text"
																	value={formData.remitter}
																	onChange={e => setFormData({ ...formData, remitter: e.target.value })}
																	className="w-full bg-muted border border-faint rounded-xl py-3 px-4 text-[11px] font-bold text-textPrimary focus:border-blue-500 outline-none transition-all"
																	placeholder="Tên người gửi..."
																/>
															</div>
														</div>

														<div className="grid grid-cols-2 gap-4">
															<div>
																<label className="text-[9px] font-black text-textSecondary uppercase block mb-2">Số TK Nguồn</label>
																<input
																	type="text"
																	value={formData.sourceAcc}
																	onChange={e => setFormData({ ...formData, sourceAcc: e.target.value })}
																	className="w-full bg-muted border border-faint rounded-xl py-3 px-4 text-[11px] font-bold text-textPrimary focus:border-blue-500 outline-none transition-all"
																	placeholder="046100..."
																/>
															</div>
															<div>
																<label className="text-[9px] font-black text-textSecondary uppercase block mb-2">Số TK Nhận</label>
																<input
																	type="text"
																	value={formData.targetAcc}
																	onChange={e => setFormData({ ...formData, targetAcc: e.target.value })}
																	className="w-full bg-muted border border-faint rounded-xl py-3 px-4 text-[11px] font-bold text-textPrimary focus:border-blue-500 outline-none transition-all"
																	placeholder="Số tài khoản..."
																/>
															</div>
														</div>

														<div>
															<label className="text-[9px] font-black text-textSecondary uppercase block mb-2">Tên người hưởng</label>
															<input
																type="text"
																value={formData.targetName}
																onChange={e => setFormData({ ...formData, targetName: e.target.value })}
																className="w-full bg-muted border border-faint rounded-xl py-3 px-4 text-[11px] font-bold text-textPrimary focus:border-blue-500 outline-none transition-all"
																placeholder="Họ và tên người nhận..."
															/>
														</div>
													</motion.div>
												)}
											</AnimatePresence>
										</div>
									</div>
								</div>

								<div className="p-5 md:p-10 pt-0">
									<button
										type="submit"
										disabled={isSaving}
										className="w-full py-4 md:py-5 bg-blue-600 text-textPrimary text-[10px] md:text-xs font-black uppercase tracking-widest rounded-2xl md:rounded-3xl hover:bg-blue-500 transition-all shadow-xl shadow-blue-600/20 active:scale-95 disabled:opacity-50"
									>
										{isSaving ? 'Đang xử lý...' : (editingId ? 'Cập nhật bản ghi' : 'Xác nhận bản ghi')}
									</button>
								</div>
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
							className="bg-surface border border-faint w-full max-w-lg rounded-[40px] overflow-hidden shadow-[0_30px_100px_rgba(0,0,0,0.3)]"
						>
							<div className="p-6 md:p-10">
								<div className="flex justify-between items-center mb-6 md:mb-10">
									<div>
										<h3 className="text-xl md:text-2xl font-black tracking-tighter text-textPrimary">Chi Tiết Giao Dịch</h3>
										<p className="text-[9px] md:text-[10px] font-black text-textSecondary uppercase tracking-widest">
											{selectedTx.type === 'INCOME' ? 'Khoản Thu' : 'Khoản Chi'} • {selectedTx.status === 'MANUAL' ? 'Bản ghi thủ công' : 'Đã đồng bộ ngân hàng'}
										</p>
									</div>
									<button onClick={() => setSelectedTx(null)} className="w-10 h-10 bg-muted rounded-full flex items-center justify-center text-textSecondary hover:text-textPrimary transition-all">
										<X size={20} />
									</button>
								</div>

								<div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2 scrollbar-hide">
									<div className="bg-muted p-5 rounded-3xl border border-faint">
										<p className="text-[10px] font-black text-textSecondary uppercase tracking-widest mb-1">Mô tả / Nội dung</p>
										<p className="text-base font-bold text-textPrimary leading-tight">{selectedTx.description || 'Không có mô tả'}</p>
									</div>

									<div className="grid grid-cols-2 gap-3">
										<div className="bg-muted p-4 rounded-3xl border border-faint">
											<p className="text-[9px] font-black text-textSecondary uppercase tracking-widest mb-1">Ngày tháng</p>
											<p className="text-xs font-bold text-textPrimary">{new Date(selectedTx.date).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })}</p>
										</div>
										<div className="bg-muted p-4 rounded-3xl border border-faint">
											<p className="text-[9px] font-black text-textSecondary uppercase tracking-widest mb-1">Danh mục</p>
											<p className="text-xs font-bold text-textPrimary">{selectedTx.category || 'Khác'}</p>
										</div>
									</div>

									{/* Banking Info Section - Highlighted Recipients */}
									<div className="bg-blue-500/5 p-5 rounded-[32px] border border-dashed border-blue-500/20 space-y-4">
										<div className="flex justify-between items-center">
											<p className="text-[9px] font-black text-blue-500 uppercase tracking-widest">Chi tiết giao dịch</p>
											<span className="px-2 py-1 bg-blue-500/10 text-blue-500 text-[8px] font-bold rounded-lg uppercase">{selectedTx.source || 'Ngân hàng'}</span>
										</div>

										<div className="grid grid-cols-2 gap-4">
											<div className="p-3 bg-surface rounded-2xl border border-faint">
												<p className="text-[8px] font-black text-textSecondary uppercase mb-1">Người gửi</p>
												<p className="text-[10px] font-black text-textPrimary truncate">{selectedTx.remitter || 'N/A'}</p>
												<p className="text-[8px] text-textSecondary font-mono mt-0.5">{selectedTx.sourceAcc || ''}</p>
											</div>
											<div className="p-3 bg-surface rounded-2xl border border-faint text-right">
												<p className="text-[8px] font-black text-textSecondary uppercase mb-1">Người hưởng</p>
												<p className="text-[10px] font-black text-textPrimary truncate">{selectedTx.targetName || 'N/A'}</p>
												<p className="text-[8px] text-textSecondary font-mono mt-0.5">{selectedTx.targetAcc || ''}</p>
											</div>
										</div>

										<div className="flex justify-between items-center px-1">
											<div>
												<p className="text-[8px] font-black text-textSecondary uppercase">Mã giao dịch</p>
												<p className="text-[10px] font-bold text-textPrimary">{selectedTx.orderNo || 'N/A'}</p>
											</div>
											{selectedTx.transDate && (
												<div className="text-right">
													<p className="text-[8px] font-black text-textSecondary uppercase">Thời gian thực tế</p>
													<p className="text-[10px] font-bold text-textPrimary">{selectedTx.transDate}</p>
												</div>
											)}
										</div>
									</div>

									<div className="grid grid-cols-2 gap-3">
										<div className="bg-surface p-5 rounded-[24px] border border-faint shadow-sm">
											<p className="text-[9px] font-black text-textSecondary uppercase tracking-widest mb-1">Kế hoạch</p>
											<p className="text-lg font-black text-primary">{formatVND(selectedTx.projected || 0)}</p>
										</div>
										<div className="bg-surface p-5 rounded-[24px] border border-faint shadow-sm">
											<p className="text-[9px] font-black text-textSecondary uppercase tracking-widest mb-1">Thực tế</p>
											<p className="text-lg font-black text-textPrimary">{formatVND(selectedTx.actual || 0)}</p>
										</div>
									</div>

									<div className="p-4 bg-muted/30 rounded-2xl border border-faint flex justify-between items-center">
										<p className="text-[9px] font-black text-textSecondary uppercase">Chênh lệch</p>
										<p className={`text-xs font-black uppercase ${selectedTx.type === 'INCOME'
											? (selectedTx.actual - selectedTx.projected >= 0 ? 'text-success' : 'text-danger')
											: (selectedTx.projected - selectedTx.actual < 0 ? 'text-danger' : 'text-success')
											}`}>
											{formatVND(Math.abs(selectedTx.actual - selectedTx.projected))}
											<span className="ml-2 text-[8px] opacity-70">
												({selectedTx.type === 'INCOME'
													? (selectedTx.actual >= selectedTx.projected ? 'Vượt thu' : 'Hụt thu')
													: (selectedTx.actual > selectedTx.projected ? 'Vượt chi' : 'Tiết kiệm')
												})
											</span>
										</p>
									</div>
								</div>

								<button
									onClick={() => setSelectedTx(null)}
									className="w-full mt-10 py-5 bg-muted text-textPrimary text-xs font-black uppercase tracking-widest rounded-3xl hover:bg-muted transition-all active:scale-95"
								>
									Đóng
								</button>
							</div>
						</motion.div>
					</div>
				)}
			</AnimatePresence >

			{/* Premium Agreement Modal */}
			< AnimatePresence >
				{isPremiumModalOpen && (
					<div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
						<motion.div
							initial={{ opacity: 0 }}
							animate={{ opacity: 1 }}
							exit={{ opacity: 0 }}
							className="absolute inset-0 bg-black/80 backdrop-blur-md"
							onClick={() => setIsPremiumModalOpen(false)}
						/>
						<motion.div
							initial={{ scale: 0.9, opacity: 0, y: 20 }}
							animate={{ scale: 1, opacity: 1, y: 0 }}
							exit={{ scale: 0.9, opacity: 0, y: 20 }}
							className="relative bg-surface w-full max-w-xl rounded-[40px] shadow-2xl border border-primary/20 overflow-hidden"
						>
							<div className="relative h-32 bg-gradient-to-br from-primary to-blue-700 p-8 flex items-center justify-between">
								<div className="z-10">
									<h2 className="text-2xl font-black text-white uppercase tracking-tighter">Deep Sync Premium</h2>
									<p className="text-white/80 text-[10px] font-bold uppercase tracking-widest mt-1">Hợp đồng điện tử & Cam kết bảo mật</p>
								</div>
								<Zap className="text-white/20 absolute right-8 top-1/2 -translate-y-1/2" size={80} fill="currentColor" />
							</div>

							<div className="p-8 space-y-6">
								<div className="space-y-4 max-h-[300px] overflow-y-auto pr-2 scrollbar-hide text-textSecondary text-[11px] leading-relaxed">
									<div className="flex gap-4 p-4 bg-muted rounded-2xl border border-faint">
										<ShieldCheck className="text-success shrink-0" size={20} />
										<p><span className="text-textPrimary font-bold">Cam kết Quyền riêng tư:</span> Chúng tôi chỉ quét các email liên quan đến biên lai ngân hàng. Tuyệt đối không đọc, lưu trữ hoặc chia sẻ các email cá nhân khác.</p>
									</div>
									<div className="flex gap-4 p-4 bg-muted rounded-2xl border border-faint">
										<Lock className="text-primary shrink-0" size={20} />
										<p><span className="text-textPrimary font-bold">Bảo mật Dữ liệu:</span> Toàn bộ quyền truy cập được mã hóa. Bạn có thể thu hồi quyền bất kỳ lúc nào trực tiếp trong cài đặt Google.</p>
									</div>
									<div className="flex gap-4 p-4 bg-muted rounded-2xl border border-faint">
										<Zap className="text-amber-500 shrink-0" size={20} />
										<p><span className="text-textPrimary font-bold">Tự động 100%:</span> Sau khi đồng ý, hệ thống sẽ tự động đồng bộ giao dịch từ 20+ ngân hàng phổ biến (VCB, TCB, MB, MoMo...)</p>
									</div>
									<div className="p-4 border border-faint rounded-2xl italic opacity-60">
										Bằng cách nhấn "Tôi đồng ý", bạn xác nhận đã đọc và chấp thuận các điều khoản dịch vụ và chính sách bảo mật của Vifun.
									</div>
								</div>

								<div className="flex flex-col gap-3">
									<button
										onClick={handleActivatePremium}
										className="w-full py-4 bg-primary text-white font-black uppercase tracking-widest rounded-2xl shadow-xl shadow-primary/20 hover:brightness-110 active:scale-95 transition-all flex items-center justify-center gap-3"
									>
										<CheckSquare size={18} />
										Tôi đồng ý và kích hoạt
									</button>
									<button
										onClick={() => setIsPremiumModalOpen(false)}
										className="w-full py-4 text-textSecondary font-bold text-[10px] uppercase tracking-widest hover:text-textPrimary transition-all"
									>
										Để sau
									</button>
								</div>
							</div>
						</motion.div>
					</div>
				)}
			</AnimatePresence >

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
		</div >
	);
};

export default Finance;
