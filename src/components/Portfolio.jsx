import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { TrendingUp, TrendingDown, Briefcase, Info } from 'lucide-react';

const Portfolio = ({ holdings, refreshProfile }) => {
	const [loading, setLoading] = useState(false);

	const handleRefresh = async () => {
		if (loading) return;
		setLoading(true);
		try {
			// 1. Ép Backend phá cache trong Google Sheets
			await api.call('refreshStockPrices', { apiKey: 'STOCKS_SIM_SECURE_V1_2024_@SEC' });
			// 2. Tải lại Profile
			if (refreshProfile) await refreshProfile();
		} catch (error) {
			console.error("Lỗi làm mới giá:", error);
		} finally {
			setLoading(false);
		}
	};

	const formatVND = (val) => new Intl.NumberFormat('vi-VN').format(Math.round(val));

	return (
		<div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
			<div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 px-2">
				<h2 className="text-xl lg:text-2xl font-black flex items-center gap-3 tracking-tight uppercase">
					<Briefcase className="text-primary" size={24} />
					DANH MỤC NẮM GIỮ
				</h2>
				<button
					onClick={handleRefresh}
					disabled={loading}
					className="w-full sm:w-auto text-[10px] font-bold bg-muted hover:bg-white/10 px-6 py-3 rounded-2xl transition-all uppercase tracking-widest border border-faint active:scale-95 disabled:opacity-50"
				>
					{loading ? 'Đang cập nhật...' : 'Làm mới giá'}
				</button>
			</div>

			{/* Moblie Card View (Visible on small screens) */}
			<div className="grid grid-cols-1 gap-4 lg:hidden px-1">
				{holdings && holdings.length > 0 ? holdings.map((item, index) => {
					const currentPrice = item.currentPrice || item.avgPrice;
					const totalCost = item.quantity * item.avgPrice;
					const currentValue = item.value || (item.quantity * currentPrice);
					const profit = item.pnl !== undefined ? item.pnl : (currentValue - totalCost);
					const profitPct = item.pnlPct !== undefined ? item.pnlPct : (((currentPrice - item.avgPrice) / item.avgPrice) * 100);
					const isProfit = profit >= 0;

					return (
						<div key={index} className="glass p-5 rounded-[32px] border-faint shadow-xl space-y-4">
							<div className="flex justify-between items-start">
								<div className="flex items-center gap-3">
									<div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center font-black text-primary text-sm">
										{item.symbol[0]}
									</div>
									<div>
										<h3 className="font-black text-textPrimary text-lg tracking-tight underline decoration-primary/20 underline-offset-4">{item.symbol}</h3>
										<p className="text-[9px] font-bold text-textSecondary uppercase tracking-widest opacity-50">Sàn HSX</p>
									</div>
								</div>
								<div className={`text-right ${isProfit ? 'text-success' : 'text-danger'}`}>
									<p className="text-sm font-black tracking-tight">{isProfit ? '+' : ''}{formatVND(profit)}</p>
									<span className={`text-[10px] font-black px-1.5 py-0.5 rounded-lg border ${isProfit ? 'bg-success/5 border-success/10' : 'bg-danger/5 border-danger/10'}`}>
										{isProfit ? '+' : ''}{profitPct.toFixed(2)}%
									</span>
								</div>
							</div>

							<div className="grid grid-cols-2 gap-4 pt-2">
								<div className="space-y-1">
									<p className="text-[9px] font-black text-textSecondary uppercase tracking-widest opacity-50">Số lượng</p>
									<p className="text-sm font-bold text-textPrimary/90">{item.quantity.toLocaleString()}</p>
								</div>
								<div className="space-y-1 text-right">
									<p className="text-[9px] font-black text-textSecondary uppercase tracking-widest opacity-50">Giá trị TT</p>
									<p className="text-sm font-black text-textPrimary">{formatVND(currentValue)}</p>
								</div>
								<div className="space-y-1">
									<p className="text-[9px] font-black text-textSecondary uppercase tracking-widest opacity-50">Giá vốn TB</p>
									<p className="text-xs font-bold text-textSecondary">{formatVND(item.avgPrice)}</p>
								</div>
								<div className="space-y-1 text-right">
									<p className="text-[9px] font-black text-textSecondary uppercase tracking-widest opacity-50">Giá hiện tại</p>
									<p className="text-xs font-black text-primary">{formatVND(currentPrice)}</p>
								</div>
							</div>
						</div>
					);
				}) : (
					<div className="glass p-12 rounded-[32px] flex flex-col items-center gap-4 opacity-20 border-faint">
						<Briefcase size={40} />
						<p className="text-xs font-black uppercase tracking-[0.2em]">Danh mục trống</p>
					</div>
				)}
			</div>

			{/* Desktop Table View (Hidden on small screens) */}
			<div className="hidden lg:block glass rounded-[32px] shadow-2xl border-faint">
				<div className="w-full overflow-x-auto custom-scrollbar scroll-smooth-touch rounded-[32px]">
					<table className="w-full text-left border-collapse min-w-[1000px]">
						<thead>
							<tr className="bg-muted text-[10px] font-black text-textSecondary uppercase tracking-[0.15em]">
								<th className="px-8 py-6">Mã CP</th>
								<th className="px-6 py-6 text-right">Số lượng</th>
								<th className="px-6 py-6 text-right">Giá vốn TB</th>
								<th className="px-6 py-6 text-right">Giá hiện tại</th>
								<th className="px-6 py-6 text-right">Giá trị TT</th>
								<th className="px-8 py-6 text-right">Lãi / Lỗ</th>
							</tr>
						</thead>
						<tbody className="divide-y divide-white/5 text-sm">
							{holdings && holdings.length > 0 ? holdings.map((item, index) => {
								const currentPrice = item.currentPrice || item.avgPrice;
								const totalCost = item.quantity * item.avgPrice;
								const currentValue = item.value || (item.quantity * currentPrice);
								const profit = item.pnl !== undefined ? item.pnl : (currentValue - totalCost);
								const profitPct = item.pnlPct !== undefined ? item.pnlPct : (((currentPrice - item.avgPrice) / item.avgPrice) * 100);
								const isProfit = profit >= 0;

								return (
									<tr key={index} className="group hover:bg-muted transition-colors">
										<td className="px-8 py-6">
											<div className="flex flex-col">
												<span className="text-lg font-black tracking-tighter text-textPrimary group-hover:text-primary transition-colors cursor-pointer">{item.symbol}</span>
												<span className="text-[9px] font-bold text-textSecondary uppercase tracking-widest mt-0.5 opacity-50">Vietstock Online</span>
											</div>
										</td>
										<td className="px-6 py-6 text-right font-black text-textPrimary/90">
											{item.quantity.toLocaleString()}
										</td>
										<td className="px-6 py-6 text-right font-bold text-textSecondary">
											{formatVND(item.avgPrice)}
										</td>
										<td className="px-6 py-6 text-right font-black text-primary">
											{formatVND(currentPrice)}
										</td>
										<td className="px-6 py-6 text-right font-black text-textPrimary">
											{formatVND(currentValue)}
										</td>
										<td className="px-8 py-6 text-right">
											<div className={`flex flex-col items-end gap-1 ${isProfit ? 'text-success' : 'text-danger'}`}>
												<div className="flex items-center gap-1.5 font-black text-lg tracking-tighter">
													{isProfit ? '+' : ''}{formatVND(profit)}
												</div>
												<span className={`text-[10px] font-black px-2 py-0.5 rounded-lg border ${isProfit ? 'bg-success/10 border-success/20' : 'bg-danger/10 border-danger/20'}`}>
													{isProfit ? '+' : ''}{profitPct.toFixed(2)}%
												</span>
											</div>
										</td>
									</tr>
								);
							}) : null}
						</tbody>
					</table>
				</div>
			</div>

			<div className="p-5 lg:p-6 bg-muted rounded-[32px] border border-faint flex items-start gap-4">
				<div className="p-2 rounded-xl bg-primary/10 text-primary shrink-0">
					<Info size={18} />
				</div>
				<div className="flex-1 space-y-2">
					<h4 className="text-[10px] lg:text-xs font-black uppercase tracking-[0.2em] text-textPrimary/80">Quy định về Phí và Thuế</h4>
					<p className="text-xs font-medium text-textSecondary leading-relaxed">
						Giá vốn trung bình đã bao gồm <span className="text-textPrimary font-bold">0.15% phí mua</span>.
						Khi bán, hệ thống sẽ tự động khấu trừ <span className="text-textPrimary font-bold">0.2% (Phí + Thuế TNCN)</span> trực tiếp vào số tiền thu về để tính toán Lãi/Lỗ ròng thực tế.
					</p>
				</div>
			</div>
		</div>
	);
};

export default Portfolio;
