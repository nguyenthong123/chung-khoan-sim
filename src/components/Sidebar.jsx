import React from 'react';
import { LayoutDashboard, ArrowLeftRight, Briefcase, History, Wallet, Settings, LogOut, DollarSign } from 'lucide-react';

const Sidebar = ({ activeTab, setActiveTab, onLogout }) => {
	const menuItems = [
		{ id: 'dashboard', label: 'Tổng quan', icon: LayoutDashboard },
		{ id: 'trade', label: 'Giao dịch', icon: ArrowLeftRight },
		{ id: 'portfolio', label: 'Danh mục', icon: Briefcase },
		{ id: 'history', label: 'Lịch sử', icon: History },
		{ id: 'wallet', label: 'Ví tiền', icon: Wallet },
		{ id: 'finance', label: 'Thu chi', icon: DollarSign },
	];

	return (
		<div className="w-64 h-full bg-surface border-r border-white/5 flex flex-col p-6">
			<div className="flex items-center gap-3 mb-10 px-2 lg:px-4">
				<div className="w-10 h-10 bg-gradient-to-br from-primary to-primaryHover rounded-xl flex items-center justify-center font-black text-white shadow-lg shadow-primary/20">S</div>
				<span className="text-2xl font-black tracking-tighter">StockSim</span>
			</div>

			<nav className="flex-1 space-y-2">
				{menuItems.map((item) => (
					<button
						key={item.id}
						onClick={() => setActiveTab(item.id)}
						className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl transition-all duration-300 ${activeTab === item.id
							? 'bg-primary text-white shadow-lg shadow-primary/20'
							: 'text-textSecondary hover:bg-white/5 hover:text-white'
							}`}
					>
						<item.icon size={22} strokeWidth={activeTab === item.id ? 2.5 : 2} />
						<span className="font-bold tracking-tight">{item.label}</span>
					</button>
				))}
			</nav>

			<div className="pt-6 border-t border-white/5 space-y-2">
				<button className="w-full flex items-center gap-4 px-5 py-4 rounded-2xl text-textSecondary hover:bg-white/5 hover:text-white transition-all">
					<Settings size={22} />
					<span className="font-bold tracking-tight">Cài đặt</span>
				</button>
				<button
					onClick={onLogout}
					className="w-full flex items-center gap-4 px-5 py-4 rounded-2xl text-danger hover:bg-danger/10 transition-all"
				>
					<LogOut size={22} />
					<span className="font-bold tracking-tight">Đăng xuất</span>
				</button>
			</div>
		</div>
	);
};

export default Sidebar;
