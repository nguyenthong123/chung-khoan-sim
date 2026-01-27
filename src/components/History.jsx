import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { History as HistoryIcon, Calendar, Tag, ExternalLink } from 'lucide-react';

const History = ({ profile, refreshProfile }) => {
	const [history, setHistory] = useState([]);
	const [loading, setLoading] = useState(true);

	const formatVND = (val) => new Intl.NumberFormat('vi-VN').format(val);
	const formatDate = (dateStr) => {
		const d = new Date(dateStr);
		return `${d.toLocaleDateString('vi-VN')} ${d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}`;
	};

	useEffect(() => {
		loadHistory();
	}, []);

	const loadHistory = async () => {
		const data = await api.call('getHistory', { email: profile.email });
		setHistory(data);
		setLoading(false);
	};

	const handleDelete = async (item) => {
		if (!window.confirm(`Bạn có chắc muốn xóa giao dịch ${item.symbol} (${item.side} ${item.quantity})? Điều này sẽ cập nhật lại số dư và cổ phiếu của bạn.`)) return;

		try {
			const res = await api.call('deleteTransaction', { email: profile.email, id: item.id });
			if (res.success) {
				alert('Đã xóa giao dịch thành công!');
				loadHistory();
				if (refreshProfile) refreshProfile();
			} else {
				alert('Lỗi: ' + res.message);
			}
		} catch (e) {
			alert('Lỗi kết nối: ' + e.message);
		}
	};

	return (
		<div className="space-y-6 animate-in fade-in duration-500">
			<div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 px-2">
				<h2 className="text-xl lg:text-2xl font-black flex items-center gap-3 tracking-tight uppercase">
					<HistoryIcon className="text-primary" size={24} />
					LỊCH SỬ GIAO DỊCH
				</h2>
			</div>

			{/* Moblie History List (Visible on small screens) */}
			<div className="lg:hidden space-y-4 px-1">
				{loading ? (
					<div className="p-20 text-center opacity-20">
						<Tag size={40} className="mx-auto mb-4 animate-pulse" />
						<p className="font-black uppercase tracking-widest text-xs">Đang tải...</p>
					</div>
				) : history.length === 0 ? (
					<div className="p-20 text-center opacity-20">
						<HistoryIcon size={40} className="mx-auto mb-4" />
						<p className="font-black uppercase tracking-widest text-xs">Chưa có giao dịch</p>
					</div>
				) : history.map((item, i) => (
					<div key={item.id || i} className="glass p-5 rounded-[32px] border-white/5 shadow-xl space-y-4 relative overflow-hidden">
						{/* Side Indicator */}
						<div className={`absolute top-0 left-0 bottom-0 w-1 ${item.side === 'BUY' ? 'bg-success' : item.side === 'SELL' ? 'bg-danger' : 'bg-primary'}`}></div>

						<div className="flex justify-between items-start pl-2">
							<div>
								<span className={`text-[8px] font-black px-2 py-0.5 rounded-full mb-2 inline-block border ${item.side === 'BUY' ? 'bg-success/10 text-success border-success/10' : item.side === 'SELL' ? 'bg-danger/10 text-danger border-danger/10' : 'bg-primary/10 text-primary border-primary/10'}`}>
									{item.side === 'BUY' ? 'MUA' : item.side === 'SELL' ? 'BÁN' : 'NẠP'} {item.type}
								</span>
								<h3 className="text-xl font-black text-white tracking-tighter uppercase">{item.symbol}</h3>
							</div>
							<div className="text-right">
								<p className="text-[9px] font-bold text-textSecondary uppercase tracking-widest opacity-50 mb-1">{formatDate(item.date)}</p>
								<button
									onClick={() => handleDelete(item)}
									className="p-2 bg-danger/10 text-danger rounded-xl border border-danger/10 active:scale-90 transition-all"
								>
									<svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
										<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
									</svg>
								</button>
							</div>
						</div>

						<div className="grid grid-cols-2 gap-4 pl-2 pt-2 border-t border-white/5">
							<div className="space-y-0.5">
								<p className="text-[10px] font-bold text-textSecondary uppercase tracking-widest opacity-50">Số lượng</p>
								<p className="text-sm font-black text-white/90">{item.quantity.toLocaleString()}</p>
							</div>
							<div className="space-y-0.5 text-right">
								<p className="text-[10px] font-bold text-textSecondary uppercase tracking-widest opacity-50">Tổng tiền</p>
								<p className="text-sm font-black text-white">{formatVND(item.total)}</p>
							</div>
							<div className="space-y-0.5">
								<p className="text-[10px] font-bold text-textSecondary uppercase tracking-widest opacity-50">Giá khớp</p>
								<p className="text-xs font-black text-primary">{item.symbol === 'DEPOSIT' ? '--' : formatVND(item.price)}</p>
							</div>
						</div>
					</div>
				))}
			</div>

			{/* Desktop Table View (Hidden on small screens) */}
			<div className="hidden lg:block glass rounded-[32px] shadow-2xl border-white/5">
				<div className="w-full overflow-x-auto custom-scrollbar scroll-smooth-touch rounded-[32px]">
					<table className="w-full text-left border-collapse min-w-[1050px]">
						<thead>
							<tr className="bg-white/5 text-[10px] font-black text-textSecondary uppercase tracking-[0.15em]">
								<th className="px-8 py-6">Thời gian</th>
								<th className="px-6 py-6 font-black">Mã CP</th>
								<th className="px-6 py-6">Phân loại</th>
								<th className="px-6 py-6 text-right">Số lượng</th>
								<th className="px-6 py-6 text-right">Tổng tiền</th>
								<th className="px-6 py-6 text-right font-black">Giá khớp</th>
								<th className="px-8 py-6 text-center">Hành động</th>
							</tr>
						</thead>
						<tbody className="divide-y divide-white/5 text-sm">
							{loading ? (
								<tr><td colSpan="7" className="text-center py-20 text-textSecondary font-black uppercase tracking-widest opacity-20">Đang tải dữ liệu...</td></tr>
							) : history.length === 0 ? (
								<tr><td colSpan="7" className="text-center py-20 text-textSecondary font-black uppercase tracking-widest opacity-20">Chưa có giao dịch nào</td></tr>
							) : history.map((item, i) => {
								return (
									<tr key={item.id || i} className="group hover:bg-white/[0.02] transition-colors">
										<td className="px-8 py-6 text-textSecondary font-medium whitespace-nowrap">{formatDate(item.date)}</td>
										<td className="px-6 py-6 font-black text-white text-lg tracking-tighter group-hover:text-primary transition-all underline decoration-primary/20 decoration-2 underline-offset-4">{item.symbol}</td>
										<td className="px-6 py-6">
											<span className={`px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest border-2 ${item.side === 'BUY' ? 'bg-success/5 text-success border-success/10' :
												item.side === 'SELL' ? 'bg-danger/5 text-danger border-danger/10' :
													'bg-primary/5 text-primary border-primary/10'
												}`}>
												{item.side === 'BUY' ? 'MUA' : item.side === 'SELL' ? 'BÁN' : 'NẠP'} {item.type}
											</span>
										</td>
										<td className="px-6 py-6 text-right font-black text-white/90">{item.quantity.toLocaleString()}</td>
										<td className="px-6 py-6 text-right font-black text-white">{formatVND(item.total)}</td>
										<td className="px-6 py-6 text-right font-black text-primary">
											{item.symbol === 'DEPOSIT' ? '--' : formatVND(item.price)}
										</td>
										<td className="px-8 py-6 text-center">
											<button
												onClick={() => handleDelete(item)}
												className="p-3 bg-white/5 hover:bg-danger/10 text-textSecondary hover:text-danger rounded-2xl transition-all border border-white/5 group/btn"
												title="Xóa giao dịch"
											>
												<svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 group-hover/btn:scale-110 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
													<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
												</svg>
											</button>
										</td>
									</tr>
								);
							})}
						</tbody>
					</table>
				</div>
			</div>
		</div>
	);
};

export default History;
