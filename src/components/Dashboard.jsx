import React from 'react';
import { TrendingUp, TrendingDown, Wallet, PieChart, Activity, RefreshCw } from 'lucide-react';
import { api } from '../api';

const StatCard = ({ title, value, change, icon: Icon }) => (
	<div className="glass p-6 rounded-[32px] flex flex-col gap-4 border-white/5 shadow-xl">
		<div className="flex justify-between items-start">
			<div className="p-3 rounded-2xl bg-primary/10 text-primary">
				<Icon size={24} strokeWidth={2.5} />
			</div>
			<div className={`flex items-center gap-1 text-[11px] font-black px-2 py-1 rounded-lg ${parseFloat(change) >= 0 ? 'text-success bg-success/10' : 'text-danger bg-danger/10'}`}>
				{parseFloat(change) >= 0 ? <TrendingUp size={14} strokeWidth={3} /> : <TrendingDown size={14} strokeWidth={3} />}
				{Math.abs(change)}%
			</div>
		</div>
		<div>
			<p className="text-textSecondary text-[10px] font-black uppercase tracking-[0.15em] opacity-60">{title}</p>
			<h3 className="text-2xl font-black mt-1 tracking-tighter">{value}</h3>
		</div>
	</div>
);

const Dashboard = ({ profile, refreshProfile }) => {
	const [isRefreshing, setIsRefreshing] = React.useState(false);
	const formatVND = (val) => new Intl.NumberFormat('vi-VN').format(Math.round(val)) + ' đ';

	const handleRefresh = async () => {
		if (isRefreshing) return;
		setIsRefreshing(true);
		try {
			// 1. Gửi lệnh lên Backend để nó toggle cột K (phá cache)
			await api.call('refreshStockPrices', { apiKey: 'STOCKS_SIM_SECURE_V1_2024_@SEC' });
			// 2. Tải lại Profile để lấy giá mới về Web
			if (refreshProfile) await refreshProfile();
		} catch (error) {
			console.error("Lỗi làm mới giá:", error);
		} finally {
			setIsRefreshing(false);
		}
	};

	const realizedPnL = profile.realizedPnL || 0;
	const realizedPct = profile.totalInvestment > 0 ? ((realizedPnL / profile.totalInvestment) * 100).toFixed(2) : '0.00';

	const unrealizedPnL = profile.unrealizedPnL || 0;
	const totalPnL = profile.totalPnL || 0;
	const totalAssets = profile.totalAssets || 0;
	const totalInvestment = profile.totalInvestment || 0;
	const stockValue = totalAssets - (profile.balance || 0);
	const cashWeight = totalAssets > 0 ? ((profile.balance || 0) / totalAssets) * 100 : 100;

	return (
		<div className="space-y-6 lg:space-y-8 animate-in fade-in duration-500">
			<div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 px-2">
				<div>
					<h1 className="text-3xl lg:text-4xl font-black tracking-tighter">XIN CHÀO, {profile.email.split('@')[0].toUpperCase()}!</h1>
					<p className="text-textSecondary font-bold text-xs lg:text-sm mt-1 uppercase tracking-widest opacity-60 italic">Bách khoa toàn thư giao dịch của bạn</p>
				</div>
				<div className="w-full md:w-auto flex items-center gap-3">
					<button
						onClick={handleRefresh}
						disabled={isRefreshing}
						className={`flex items-center gap-2 p-3 rounded-2xl border border-white/10 transition-all ${isRefreshing ? 'bg-primary/20 text-primary animate-pulse' : 'glass hover:bg-white/5 text-textSecondary hover:text-white active:scale-95'}`}
						title="Làm mới giá từ thị trường"
					>
						<RefreshCw size={20} className={isRefreshing ? 'animate-spin' : ''} />
						<span className="text-[10px] font-black uppercase tracking-widest hidden sm:inline">Làm mới giá</span>
					</button>

					<div className="glass px-6 py-3 rounded-2xl border-white/5 bg-white/[0.02] text-left md:text-right flex-1 md:flex-none">
						<p className="text-textSecondary text-[9px] font-black uppercase tracking-[0.2em] mb-1">Cập nhật lần cuối</p>
						<p className="font-black text-primary text-lg lg:text-xl tracking-tighter">{new Date().toLocaleTimeString('vi-VN')}</p>
					</div>
				</div>
			</div>

			<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
				<StatCard
					title="Tổng giá trị cổ phiếu"
					value={formatVND(stockValue)}
					change={totalAssets > 0 ? ((stockValue / totalAssets) * 100).toFixed(1) : 0}
					icon={Activity}
				/>
				<StatCard
					title="Lợi nhuận mua bán cổ phiếu"
					value={(realizedPnL >= 0 ? '+' : '') + formatVND(realizedPnL)}
					change={realizedPct}
					icon={PieChart}
				/>
				<StatCard
					title="Tổng phí dịch vụ"
					value={formatVND(profile.totalFees || 0)}
					change={profile.totalInvestment > 0 ? ((profile.totalFees / profile.totalInvestment) * 100).toFixed(2) : 0}
					icon={TrendingUp}
				/>
				<StatCard
					title="Tổng vốn đã nạp"
					value={formatVND(totalInvestment)}
					change={0}
					icon={Wallet}
				/>
			</div>

			<div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
				<div className="lg:col-span-2 space-y-8">
					<div className="glass p-8 rounded-[40px] overflow-hidden flex flex-col gap-8 border-white/5 bg-gradient-to-br from-white/[0.03] to-transparent">
						<div className="flex justify-between items-center">
							<h2 className="text-xl font-black tracking-tight uppercase tracking-[0.1em]">PHÂN BỔ TÀI SẢN</h2>
							<div className="px-4 py-1.5 rounded-full bg-primary/10 text-primary text-[10px] font-black uppercase tracking-[0.2em] italic border border-primary/20 animate-pulse">Live Tracking</div>
						</div>

						<div className="space-y-10 py-4">
							<div className="relative h-4 w-full bg-white/5 rounded-full overflow-hidden flex border border-white/5 shadow-inner">
								<div
									className="h-full bg-primary transition-all duration-1000 ease-out relative"
									style={{ width: `${cashWeight}%` }}
								>
									<div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent"></div>
								</div>
								<div
									className="h-full bg-success transition-all duration-1000 ease-out shadow-[0_0_20px_rgba(34,197,94,0.3)]"
									style={{ width: `${100 - cashWeight}%` }}
								></div>
							</div>

							<div className="grid grid-cols-2 gap-12">
								<div className="flex items-center gap-5">
									<div className="w-2 h-12 bg-primary rounded-full shadow-[0_0_15px_rgba(59,130,246,0.5)]"></div>
									<div>
										<p className="text-[10px] font-black text-textSecondary uppercase tracking-[0.2em] mb-1">Tiền mặt</p>
										<p className="text-3xl font-black tracking-tighter">{cashWeight.toFixed(1)}%</p>
										<p className="text-xs font-bold text-textSecondary mt-0.5">{formatVND(profile.balance || 0)}</p>
									</div>
								</div>
								<div className="flex items-center gap-5">
									<div className="w-2 h-12 bg-success rounded-full shadow-[0_0_15px_rgba(34,197,94,0.5)]"></div>
									<div>
										<p className="text-[10px] font-black text-textSecondary uppercase tracking-[0.2em] mb-1">Cá phiếu</p>
										<p className="text-3xl font-black tracking-tighter">{(100 - cashWeight).toFixed(1)}%</p>
										<p className="text-xs font-bold text-textSecondary mt-0.5">{formatVND(stockValue)}</p>
									</div>
								</div>
							</div>
						</div>
					</div>

					<div className="glass p-8 rounded-[40px] overflow-hidden border-white/5">
						<div className="flex justify-between items-center mb-10 px-2">
							<h2 className="text-xl font-black tracking-tight uppercase tracking-[0.1em]">Lệnh mới nhất</h2>
							<button className="text-[9px] font-black text-primary uppercase tracking-[0.3em] bg-primary/5 px-5 py-2.5 rounded-2xl border border-primary/10 hover:bg-primary/10 transition-all active:scale-95">Xem chi tiết</button>
						</div>
						<div className="overflow-x-auto custom-scrollbar scroll-smooth-touch">
							<table className="w-full text-left min-w-[600px]">
								<thead>
									<tr className="text-[10px] font-black text-textSecondary uppercase tracking-[0.2em] border-b border-white/5">
										<th className="pb-6 pl-2">Mã cổ phiếu</th>
										<th className="pb-6">Phân loại</th>
										<th className="pb-6 text-right">Giá trị khớp</th>
										<th className="pb-6 text-right">Lãi / Lỗ ròng</th>
									</tr>
								</thead>
								<tbody className="divide-y divide-white/5">
									{profile.recentHistory?.slice(0, 5).map((item, i) => (
										<tr key={i} className="group hover:bg-white/[0.02] transition-colors">
											<td className="py-6 pl-2 font-black text-white text-lg tracking-tighter group-hover:text-primary transition-colors">{item.symbol}</td>
											<td className="py-6">
												{item.symbol === 'DEPOSIT' ? (
													<span className="text-[9px] font-black px-3 py-1.5 rounded-xl border-2 tracking-widest text-primary border-primary/10 bg-primary/5">
														NẠP VỐN
													</span>
												) : (
													<span className={`text-[9px] font-black px-3 py-1.5 rounded-xl border-2 tracking-widest ${item.side === 'BUY' ? 'text-success border-success/10 bg-success/5' : 'text-danger border-danger/10 bg-danger/5'}`}>
														{item.side === 'BUY' ? 'MUA VÀO' : 'BÁN RA'}
													</span>
												)}
											</td>
											<td className="py-6 text-right font-black text-white/90">{formatVND(item.total)}</td>
											<td className="py-6 text-right">
												{item.symbol === 'DEPOSIT' ? (
													<span className="opacity-10">————</span>
												) : (
													(() => {
														const isBuy = item.side === 'BUY';
														const holding = profile.holdings?.find(h => h.symbol === item.symbol);
														const currentPrice = holding?.currentPrice || item.price;

														// Nếu là lệnh BÁN: Lấy lãi lỗ thực tế đã chốt
														// Nếu là lệnh MUA: Tính lãi lỗ tạm tính dựa trên giá hiện tại
														const pnlValue = isBuy
															? (currentPrice - item.price) * item.quantity
															: item.pnl;

														const pnlPct = isBuy
															? ((currentPrice - item.price) / item.price) * 100
															: (item.pnl / (item.price * item.quantity)) * 100;

														const color = pnlValue > 0 ? 'text-success' : pnlValue < 0 ? 'text-danger' : 'text-textSecondary';

														return (
															<div className={`flex flex-col items-end ${color}`}>
																<p className="font-black text-lg tracking-tighter">
																	{(pnlValue >= 0 ? '+' : '') + formatVND(pnlValue)}
																</p>
																<p className="text-[10px] font-black underline decoration-1 underline-offset-4 tracking-widest opacity-80">
																	{(pnlPct >= 0 ? '+' : '') + pnlPct.toFixed(2)}%
																</p>
															</div>
														);
													})()
												)}
											</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>
					</div>
				</div>

				<div className="glass p-8 rounded-[40px] flex flex-col border-white/5">
					<h2 className="text-xl font-black tracking-tight mb-10 uppercase tracking-[0.1em]">HIỆU SUẤT DANH MỤC</h2>
					<div className="space-y-4 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
						{profile.holdings && profile.holdings.length > 0 ? (
							profile.holdings.map(item => (
								<div key={item.symbol} className="flex justify-between items-center p-6 rounded-[28px] bg-white/[0.02] border border-white/5 hover:border-primary/30 transition-all cursor-pointer group">
									<div>
										<p className="font-black text-white group-hover:text-primary transition-colors tracking-tight text-lg">{item.symbol}</p>
										<p className="text-[10px] text-textSecondary font-black uppercase tracking-widest mt-0.5 opacity-60">
											{item.quantity} CP · {formatVND(item.value)}
										</p>
									</div>
									<div className={`text-right ${item.pnl >= 0 ? 'text-success' : 'text-danger'}`}>
										<p className="font-black tracking-tighter text-lg">
											{(item.pnl >= 0 ? '+' : '') + formatVND(item.pnl)}
										</p>
										<p className="text-[10px] font-black underline decoration-2 underline-offset-4 tracking-widest">
											{(item.pnlPct >= 0 ? '+' : '') + item.pnlPct.toFixed(2)}%
										</p>
									</div>
								</div>
							))
						) : (
							<div className="flex flex-col items-center justify-center py-20 text-center opacity-30">
								<div className="w-16 h-16 rounded-full border-2 border-dashed border-white/20 mb-4"></div>
								<p className="text-[10px] font-black uppercase tracking-[0.2em]">Chưa có cổ phiếu</p>
							</div>
						)}
					</div>
				</div>
			</div>
		</div>
	);
};

export default Dashboard;
