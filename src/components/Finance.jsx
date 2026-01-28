import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
	Plus,
	Search,
	TrendingUp,
	TrendingDown,
	DollarSign,
	CreditCard,
	PieChart,
	ShoppingBag,
	Utensils,
	Bus,
	FileText,
	Clock,
	MoreVertical,
	CheckCircle2,
	AlertCircle,
	RefreshCw,
	ChevronLeft,
	ChevronRight,
	X,
	Info
} from 'lucide-react';
import { api } from '../api';

const Finance = ({ userEmail }) => {
	const [activeTab, setActiveTab] = useState('dashboard');
	const [syncing, setSyncing] = useState(false);
	const [isSaving, setIsSaving] = useState(false);
	const [isEntryModalOpen, setIsEntryModalOpen] = useState(false);
	const [formData, setFormData] = useState({
		amount: '',
		type: 'INCOME',
		category: 'Lương',
		description: '',
		source: 'Tiền mặt'
	});
	const [transactions, setTransactions] = useState([]);
	const [startDate, setStartDate] = useState(() => {
		const d = new Date();
		return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split('T')[0];
	});
	const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);

	const [summary, setSummary] = useState({
		categories: [
			{ name: 'Dining', amount: 0, icon: Utensils, color: 'text-orange-400', bg: 'bg-orange-400/10' },
			{ name: 'Shopping', amount: 0, icon: ShoppingBag, color: 'text-blue-400', bg: 'bg-blue-400/10' },
			{ name: 'Transport', amount: 0, icon: Bus, color: 'text-purple-400', bg: 'bg-purple-400/10' },
			{ name: 'Fixed Bills', amount: 0, icon: CreditCard, color: 'text-emerald-400', bg: 'bg-emerald-400/10' }
		]
	});
	const [currentPage, setCurrentPage] = useState(1);
	const [selectedTransaction, setSelectedTransaction] = useState(null);
	const itemsPerPage = 30;

	const fetchFinanceData = async () => {
		const transData = await api.call('getFinanceTransactions', { email: userEmail }, 'finance');
		if (transData && !transData.error) {
			setTransactions(transData);
		}
	};

	// Filtered transactions based on date range
	const filteredTransactions = transactions.filter(t => {
		try {
			if (!t.date) return false;
			const d = new Date(t.date);
			if (isNaN(d.getTime())) return false; // Skip invalid dates
			const transDate = d.toISOString().split('T')[0];
			return transDate >= startDate && transDate <= endDate;
		} catch (e) {
			console.error('Date parsing error:', e, t);
			return false;
		}
	});

	// Dynamic summary based on filtered data
	const filteredSummary = filteredTransactions.reduce((acc, t) => {
		const amt = parseFloat(t.amount) || 0;
		if (t.type === 'INCOME') {
			acc.inflow += amt;
			if (t.category === 'Lương') acc.salary += amt;
			if (t.category === 'Kinh doanh') acc.business += amt;
		} else {
			acc.outflow += amt;
		}
		return acc;
	}, { inflow: 0, outflow: 0, salary: 0, business: 0 });

	const displaySummary = {
		inflow: filteredSummary.inflow,
		outflow: filteredSummary.outflow,
		salary: filteredSummary.salary,
		business: filteredSummary.business,
		balance: filteredSummary.inflow - filteredSummary.outflow
	};

	// Portfolio Stats (Connecting to stock data)
	const [portfolioStats, setPortfolioStats] = useState({ pnl: 0, pnlPct: 0 });

	useEffect(() => {
		const fetchPortfolio = async () => {
			const profile = await api.call('getProfile', { email: userEmail });
			if (profile && !profile.error) {
				setPortfolioStats({
					pnl: profile.realizedPnL || 0,
					pnlPct: profile.totalInvestment > 0 ? ((profile.realizedPnL / profile.totalInvestment) * 100) : 0
				});
			}
		};
		fetchPortfolio();
	}, [userEmail]);

	useEffect(() => {
		const init = async () => {
			await fetchFinanceData();
			handleSync();
		};
		init();
	}, [userEmail]);

	const handleSync = async () => {
		if (syncing) return;
		setSyncing(true);
		try {
			const result = await api.call('syncGmailReceipts', { email: userEmail }, 'finance');
			if (result.success) {
				await fetchFinanceData();
			}
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
				setFormData({ amount: '', type: 'INCOME', category: 'Lương', description: '', source: 'Tiền mặt' });
				await fetchFinanceData();
			}
		} catch (error) {
			console.error('Add transaction error:', error);
		} finally {
			setIsSaving(false);
		}
	};

	return (
		<div className="flex-1 overflow-auto p-4 lg:p-8 bg-[#0a0c10] text-gray-100 font-sans">
			{/* Header section */}
			<div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
				<div>
					<h1 className="text-3xl font-bold tracking-tight text-white mb-1">Personal Finance</h1>
					<p className="text-gray-400 text-sm">Unified cash flow interface for your ecosystem.</p>
				</div>

				<div className="flex items-center gap-3">
					<div className="hidden md:flex items-center bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-xs font-medium text-emerald-400 gap-2">
						<div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></div>
						SYNC ACTIVE: {transactions.length} RECEIPTS INDEXED FROM EMAIL, TERMINAL
					</div>
					<button
						onClick={handleSync}
						disabled={syncing}
						className="flex items-center gap-2 bg-primary hover:bg-primaryHover text-white px-5 py-2.5 rounded-xl font-bold transition-all shadow-lg shadow-primary/20 disabled:opacity-50"
					>
						{syncing ? <RefreshCw className="animate-spin" size={18} /> : <RefreshCw size={18} />}
						<span>Sync Receipts</span>
					</button>
				</div>
			</div>

			{/* Hero Stats */}
			<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
				{[
					{ name: 'Tổng Tiền Lương', amount: displaySummary.salary, icon: DollarSign, color: 'text-emerald-400', bg: 'bg-emerald-400/10' },
					{ name: 'Tổng Tiền Chi', amount: displaySummary.outflow, icon: TrendingDown, color: 'text-orange-400', bg: 'bg-orange-400/10' },
					{ name: 'Tổng Kinh Doanh', amount: displaySummary.business, icon: ShoppingBag, color: 'text-blue-400', bg: 'bg-blue-400/10' },
					{ name: 'Khác (Tiền Vào)', amount: displaySummary.inflow - displaySummary.salary - displaySummary.business, icon: PieChart, color: 'text-purple-400', bg: 'bg-purple-400/10' }
				].map((cat, idx) => (
					<motion.div
						initial={{ opacity: 0, y: 20 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ delay: idx * 0.1 }}
						key={cat.name}
						className="bg-surface border border-white/5 p-5 rounded-2xl group hover:border-primary/30 transition-all cursor-pointer relative overflow-hidden"
					>
						<div className={`absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity`}>
							<cat.icon size={48} />
						</div>
						<div className="flex items-center gap-3 mb-4">
							<div className={`w-10 h-10 ${cat.bg} ${cat.color} rounded-xl flex items-center justify-center`}>
								<cat.icon size={20} />
							</div>
							<span className="text-gray-400 text-[10px] font-black uppercase tracking-widest">{cat.name}</span>
						</div>
						<div className="text-2xl font-bold text-white">
							{cat.amount.toLocaleString('vi-VN')} đ
						</div>
					</motion.div>
				))}
			</div>

			<div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
				{/* Main Feed */}
				<div className="lg:col-span-2 space-y-8">
					{/* Main Ledger */}
					<section className="bg-surface border border-white/5 rounded-3xl overflow-hidden">
						<div className="p-6 border-b border-white/5 flex items-center justify-between">
							<div className="flex items-center gap-3">
								<h2 className="text-xl font-bold text-white uppercase tracking-wider text-sm">Ledger Feed</h2>
								<div className="flex items-center gap-2 bg-white/5 px-3 py-1.5 rounded-2xl border border-white/10">
									<input
										type="date"
										value={startDate}
										onChange={e => setStartDate(e.target.value)}
										className="bg-transparent text-[10px] font-bold text-gray-400 outline-none uppercase"
									/>
									<span className="text-gray-600 text-[10px]">TO</span>
									<input
										type="date"
										value={endDate}
										onChange={e => setEndDate(e.target.value)}
										className="bg-transparent text-[10px] font-bold text-gray-400 outline-none uppercase"
									/>
								</div>
								<span className="bg-white/5 px-2 py-0.5 rounded text-[10px] text-gray-500 font-mono">
									{filteredTransactions.length} Entries
								</span>
							</div>
							<div className="flex items-center gap-2">
								<div className="flex bg-white/5 rounded-lg p-0.5">
									<button
										onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
										disabled={currentPage === 1}
										className="p-1.5 hover:text-white text-gray-500 disabled:opacity-30 transition-colors"
									>
										<ChevronLeft size={16} />
									</button>
									<button
										onClick={() => setCurrentPage(p => Math.min(Math.ceil(transactions.length / itemsPerPage), p + 1))}
										disabled={currentPage >= Math.ceil(transactions.length / itemsPerPage)}
										className="p-1.5 hover:text-white text-gray-500 disabled:opacity-30 transition-colors"
									>
										<ChevronRight size={16} />
									</button>
								</div>
								<button className="text-gray-500 hover:text-white transition-colors ml-2">
									<Search size={18} />
								</button>
							</div>
						</div>

						<div className="overflow-x-auto overflow-y-hidden">
							<table className="w-full border-collapse">
								<tbody>
									{filteredTransactions.length > 0 ? (
										filteredTransactions
											.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
											.map((t, idx) => (
												<tr
													key={t.id}
													onClick={() => setSelectedTransaction(t)}
													className="border-b border-white/5 last:border-0 hover:bg-white/[0.04] transition-all group cursor-pointer active:bg-white/5"
												>
													<td className="py-4 px-6 md:w-3/4">
														<div className="flex items-center gap-4">
															<div className="w-9 h-9 bg-white/5 rounded-xl flex items-center justify-center text-gray-400 group-hover:bg-primary/20 group-hover:text-primary transition-all shrink-0">
																{t.type === 'INCOME' ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
															</div>
															<div className="min-w-0">
																<div className="text-white font-bold text-sm tracking-tight truncate group-hover:text-primary transition-colors">
																	{t.description || 'No Description'}
																</div>
																<div className="flex items-center gap-2 mt-0.5 text-gray-500 text-[10px] font-mono uppercase truncate opacity-70">
																	<span className="bg-white/10 px-1 rounded text-[9px]">{t.source}</span>
																	<span>• {t.id.toString().substring(0, 8)}</span>
																</div>
															</div>
														</div>
													</td>
													<td className="py-4 px-6 text-right whitespace-nowrap min-w-[120px]">
														<div className={`text-base font-black tracking-tight ${t.type === 'INCOME' ? 'text-emerald-400' : 'text-orange-400'}`}>
															{t.type === 'INCOME' ? '+' : '-'}{parseFloat(t.amount).toLocaleString('vi-VN')}
															<span className="text-[10px] ml-1 opacity-70">đ</span>
														</div>
														<div className="flex items-center justify-end gap-1.5 text-gray-500 text-[10px] font-bold mt-0.5">
															<Clock size={10} />
															{new Date(t.date).toLocaleDateString('vi-VN')}
														</div>
													</td>
												</tr>
											))
									) : (
										<tr>
											<td colSpan="2" className="py-12 text-center text-gray-500">
												<p className="mb-2">No transactions found</p>
												<button onClick={handleSync} className="text-primary hover:underline text-sm font-bold">Sync now</button>
											</td>
										</tr>
									)}
								</tbody>
							</table>
						</div>

						<div className="p-4 border-t border-white/5 flex items-center justify-center gap-2">
							{Array.from({ length: Math.min(5, Math.ceil(transactions.length / itemsPerPage)) }).map((_, i) => (
								<button
									key={i}
									onClick={() => setCurrentPage(i + 1)}
									className={`w-8 h-8 rounded-lg text-xs font-bold transition-all ${currentPage === i + 1
										? 'bg-primary text-white shadow-lg shadow-primary/20'
										: 'bg-white/5 text-gray-500 hover:bg-white/10'
										}`}
								>
									{i + 1}
								</button>
							))}
							{Math.ceil(transactions.length / itemsPerPage) > 5 && (
								<span className="text-gray-600 px-1">...</span>
							)}
						</div>
					</section>

					{/* Monthly Cash Inflow Chart area - Placeholder with stats */}
					<section className="grid grid-cols-1 md:grid-cols-2 gap-6">
						<div className="bg-primary border border-primary/20 p-8 rounded-3xl relative overflow-hidden group">
							<div className="absolute -bottom-8 -right-8 opacity-20 group-hover:scale-110 transition-transform duration-500">
								<TrendingUp size={160} />
							</div>
							<div className="relative z-10">
								<h3 className="text-white/70 text-xs font-black uppercase tracking-[2px] mb-4">Total Inflow (Period)</h3>
								<div className="text-4xl font-black text-white tracking-tighter mb-2">
									{displaySummary.inflow.toLocaleString('vi-VN')} đ
								</div>
								<div className="flex items-center gap-1.5 text-emerald-300 font-bold text-xs bg-black/20 w-fit px-2 py-1 rounded-lg">
									<TrendingUp size={14} />
									Live calculation
								</div>
							</div>
						</div>

						<div className="bg-surface border border-white/5 p-8 rounded-3xl flex flex-col justify-center">
							<h3 className="text-gray-500 text-xs font-black uppercase tracking-[2px] mb-4">Net Cashflow (Period)</h3>
							<div className="text-4xl font-black text-white tracking-tighter mb-2">
								{displaySummary.balance.toLocaleString('vi-VN')} đ
							</div>
							<p className="text-gray-500 text-sm font-medium italic">Difference between income and expenses.</p>
						</div>
					</section>
				</div>

				{/* Sidebar Column */}
				<div className="space-y-8">
					{/* OCR / Sync History */}
					<section className="bg-surface border border-white/5 rounded-3xl p-6">
						<div className="flex items-center justify-between mb-6">
							<h2 className="text-sm font-black uppercase tracking-widest text-white">OCR History</h2>
							<Clock size={16} className="text-gray-500" />
						</div>

						<div className="space-y-4">
							{[1, 2, 3].map(i => (
								<div key={i} className="flex items-center gap-3 p-3 bg-white/[0.03] rounded-2xl border border-white/5 hover:border-white/10 transition-all cursor-pointer">
									<div className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center text-gray-400">
										<FileText size={18} />
									</div>
									<div className="flex-1">
										<div className="text-[11px] font-black text-white truncate max-w-[120px]">
											{i === 1 ? 'VIETCOMBANK RECEIPT' : i === 2 ? 'APPLE STORE' : 'WHOLE FOODS'}
										</div>
										<div className="text-[9px] text-gray-500 font-black tracking-widest uppercase">Verified 14:30</div>
									</div>
									<CheckCircle2 size={16} className="text-emerald-500 shadow-sm shadow-emerald-500/20" />
								</div>
							))}
						</div>

						<button className="w-full py-4 mt-6 text-center text-xs font-bold text-gray-500 hover:text-white border-t border-white/5 hover:bg-white/5 transition-all">
							VIEW ARCHIVES
						</button>
					</section>

					{/* Quick Info / Portfolio Link */}
					<div className="bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-white/10 rounded-3xl p-6 text-center group">
						<div className={`w-12 h-12 ${portfolioStats.pnl >= 0 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'} rounded-full flex items-center justify-center mx-auto mb-4 transition-transform group-hover:scale-110`}>
							{portfolioStats.pnl >= 0 ? <TrendingUp size={24} /> : <TrendingDown size={24} />}
						</div>
						<h3 className="text-white font-black uppercase tracking-widest text-xs mb-2">Lãi lỗ chứng khoán</h3>
						<div className={`text-2xl font-black tracking-tighter mb-2 ${portfolioStats.pnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
							{(portfolioStats.pnl >= 0 ? '+' : '') + portfolioStats.pnl.toLocaleString('vi-VN')} đ
						</div>
						<p className="text-gray-400 text-[10px] font-bold uppercase tracking-widest mb-4">
							Hiệu suất: {(portfolioStats.pnlPct >= 0 ? '+' : '') + portfolioStats.pnlPct.toFixed(2)}%
						</p>
						<div className="bg-black/30 rounded-full p-2 flex items-center justify-between px-4">
							<span className="text-[10px] font-black text-white hover:text-primary cursor-pointer transition-colors" onClick={() => setActiveTab('portfolio')}>Stock Trader Pro</span>
							<div className={`w-2.5 h-2.5 rounded-full ${portfolioStats.pnl >= 0 ? 'bg-emerald-400' : 'bg-red-400'} animate-pulse`}></div>
						</div>
					</div>
				</div>
			</div>

			{/* Floating Action Button */}
			<button
				onClick={() => setIsEntryModalOpen(true)}
				className="fixed bottom-8 right-8 w-14 h-14 bg-emerald-500 hover:bg-emerald-400 text-black rounded-full shadow-2xl shadow-emerald-500/40 flex items-center justify-center transition-all hover:scale-110 active:scale-95 z-50"
			>
				<Plus size={28} />
			</button>

			{/* Add Transaction Modal */}
			<AnimatePresence>
				{isEntryModalOpen && (
					<div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
						<motion.div
							initial={{ opacity: 0, y: 50 }}
							animate={{ opacity: 1, y: 0 }}
							exit={{ opacity: 0, y: 50 }}
							className="bg-[#1a1d23] border border-white/10 w-full max-w-md rounded-[2.5rem] overflow-hidden shadow-2xl"
						>
							<form onSubmit={handleAddTransaction} className="p-8">
								<div className="flex justify-between items-center mb-8">
									<h3 className="text-xl font-black text-white uppercase tracking-wider">New Entry</h3>
									<button type="button" onClick={() => setIsEntryModalOpen(false)} className="text-gray-500 hover:text-white transition-colors">
										<X size={20} />
									</button>
								</div>

								<div className="space-y-6">
									{/* Amount Input */}
									<div>
										<label className="text-[10px] font-black text-gray-500 uppercase tracking-widest block mb-2">Amount (VND)</label>
										<input
											type="number"
											required
											value={formData.amount}
											onChange={e => setFormData({ ...formData, amount: e.target.value })}
											className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-6 text-2xl font-black text-white focus:border-emerald-500 transition-all outline-none"
											placeholder="0"
										/>
									</div>

									{/* Type Switch */}
									<div className="flex bg-white/5 p-1 rounded-2xl border border-white/10">
										<button
											type="button"
											onClick={() => setFormData({ ...formData, type: 'INCOME' })}
											className={`flex-1 py-3 px-4 rounded-xl text-xs font-black transition-all ${formData.type === 'INCOME' ? 'bg-emerald-500 text-black' : 'text-gray-500'}`}
										>
											INCOME
										</button>
										<button
											type="button"
											onClick={() => setFormData({ ...formData, type: 'EXPENSE' })}
											className={`flex-1 py-3 px-4 rounded-xl text-xs font-black transition-all ${formData.type === 'EXPENSE' ? 'bg-orange-500 text-black' : 'text-gray-500'}`}
										>
											EXPENSE
										</button>
									</div>

									{/* Category & Source */}
									<div className="grid grid-cols-2 gap-4">
										<div>
											<label className="text-[10px] font-black text-gray-500 uppercase tracking-widest block mb-2">Category</label>
											<select
												value={formData.category}
												onChange={e => setFormData({ ...formData, category: e.target.value })}
												className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-xs font-bold text-white outline-none"
											>
												<option value="Lương">Tiền lương</option>
												<option value="Thưởng/Bo">Thưởng / Tiền Bo</option>
												<option value="Kinh doanh">Kinh doanh</option>
												<option value="Quà tặng">Quà tặng</option>
												<option value="Thu nhập khác">Thu nhập khác</option>
											</select>
										</div>
										<div>
											<label className="text-[10px] font-black text-gray-500 uppercase tracking-widest block mb-2">Source</label>
											<input
												type="text"
												value={formData.source}
												onChange={e => setFormData({ ...formData, source: e.target.value })}
												className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-xs font-bold text-white outline-none"
												placeholder="Cash, Card..."
											/>
										</div>
									</div>

									{/* Description */}
									<div>
										<label className="text-[10px] font-black text-gray-500 uppercase tracking-widest block mb-2">Description</label>
										<textarea
											value={formData.description}
											onChange={e => setFormData({ ...formData, description: e.target.value })}
											className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 px-4 text-xs font-medium text-white outline-none h-24 resize-none"
											placeholder="Optional details..."
										/>
									</div>
								</div>

								<button
									type="submit"
									disabled={isSaving}
									className="w-full mt-8 py-5 bg-emerald-500 text-black font-black rounded-3xl hover:bg-emerald-400 transition-all active:scale-95 shadow-xl shadow-emerald-500/20 disabled:opacity-50"
								>
									{isSaving ? 'SAVING...' : 'SAVE RECORD'}
								</button>
							</form>
						</motion.div>
					</div>
				)}
			</AnimatePresence>

			{/* Transaction Detail Modal */}
			<AnimatePresence>
				{selectedTransaction && (
					<div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
						<motion.div
							initial={{ opacity: 0, scale: 0.95, y: 20 }}
							animate={{ opacity: 1, scale: 1, y: 0 }}
							exit={{ opacity: 0, scale: 0.95, y: 20 }}
							className="bg-[#1a1d23] border border-white/10 w-full max-w-lg rounded-[2.5rem] overflow-hidden shadow-2xl"
						>
							<div className="p-8">
								<div className="flex justify-between items-start mb-10">
									<div className="flex items-center gap-4">
										<div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl ${selectedTransaction.type === 'INCOME' ? 'bg-emerald-400/10 text-emerald-400' : 'bg-orange-400/10 text-orange-400'
											}`}>
											{selectedTransaction.type === 'INCOME' ? <TrendingUp /> : <TrendingDown />}
										</div>
										<div>
											<h3 className="text-2xl font-black text-white leading-none mb-2">Transaction Detail</h3>
											<span className="bg-white/5 px-3 py-1 rounded-full text-[10px] font-bold text-gray-400 border border-white/5">
												ID: {selectedTransaction.id}
											</span>
										</div>
									</div>
									<button
										onClick={() => setSelectedTransaction(null)}
										className="p-3 bg-white/5 rounded-2xl text-gray-400 hover:text-white hover:bg-white/10 transition-all"
									>
										<X size={24} />
									</button>
								</div>

								<div className="space-y-6">
									<div className="text-center py-6 bg-white/[0.02] rounded-3xl border border-white/5">
										<div className="text-gray-400 text-xs font-bold uppercase tracking-[2px] mb-2">Total Amount</div>
										<div className={`text-5xl font-black tracking-tighter ${selectedTransaction.type === 'INCOME' ? 'text-emerald-400' : 'text-orange-400'
											}`}>
											{selectedTransaction.type === 'INCOME' ? '+' : '-'}{parseFloat(selectedTransaction.amount).toLocaleString('vi-VN')}
											<span className="text-lg ml-1 opacity-70">VNĐ</span>
										</div>
									</div>

									<div className="grid grid-cols-2 gap-4">
										<div className="p-5 bg-white/[0.03] rounded-3xl border border-white/5">
											<div className="text-gray-500 text-[10px] font-black uppercase tracking-widest mb-2">Status</div>
											<div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
												<CheckCircle2 size={16} /> Verified
											</div>
										</div>
										<div className="p-5 bg-white/[0.03] rounded-3xl border border-white/5">
											<div className="text-gray-500 text-[10px] font-black uppercase tracking-widest mb-2">Source</div>
											<div className="text-white font-bold text-sm flex items-center gap-2">
												<Info size={16} className="text-primary" /> {selectedTransaction.source}
											</div>
										</div>
									</div>

									<div className="p-6 bg-white/[0.03] rounded-3xl border border-white/5">
										<div className="text-gray-500 text-[10px] font-black uppercase tracking-widest mb-3">Description & History</div>
										<p className="text-white text-sm leading-relaxed font-medium mb-4">
											{selectedTransaction.description || 'No detailed description available for this transaction.'}
										</p>
										<div className="flex items-center gap-2 text-[11px] text-gray-500 bg-white/5 w-fit px-3 py-1.5 rounded-xl font-mono">
											<Clock size={12} /> {new Date(selectedTransaction.date).toLocaleString('vi-VN')}
										</div>
									</div>
								</div>

								<button
									onClick={() => setSelectedTransaction(null)}
									className="w-full mt-8 py-5 bg-white text-black font-black rounded-3xl hover:bg-gray-200 transition-all active:scale-95 shadow-xl shadow-white/5"
								>
									CLOSE PREVIEW
								</button>
							</div>
						</motion.div>
					</div>
				)}
			</AnimatePresence>

			<style>
				{`
        .bg-surface {
          background-color: #11141a;
        }
        .text-primary {
          color: #3b82f6;
        }
        .bg-primary {
          background-color: #3b82f6;
        }
        .bg-primaryHover {
          background-color: #2563eb;
        }
      `}
			</style>
		</div>
	);
};

export default Finance;
