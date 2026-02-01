import React from 'react';
import { LayoutDashboard, ArrowLeftRight, Briefcase, History, Wallet, Settings, LogOut, DollarSign, X } from 'lucide-react';

const Sidebar = ({ activeTab, setActiveTab, onLogout, setSidebarOpen }) => {
	const menuItems = [
		{ id: 'dashboard', label: 'Tổng quan', icon: LayoutDashboard },
		{ id: 'trade', label: 'Giao dịch', icon: ArrowLeftRight },
		{ id: 'portfolio', label: 'Danh mục', icon: Briefcase },
		{ id: 'history', label: 'Lịch sử', icon: History },
		{ id: 'wallet', label: 'Ví tiền', icon: Wallet },
		{ id: 'finance', label: 'Thu chi', icon: DollarSign },
		{ id: 'settings', label: 'Cài đặt', icon: Settings },
	];

	return (
		<div className="w-72 lg:w-64 h-full bg-surface border-r border-faint flex flex-col p-6 shadow-2xl lg:shadow-[4px_0_24px_-12px_rgba(0,0,0,0.1)] relative z-20">
			{/* Close Button - Mobile Only */}
			<button
				onClick={() => setSidebarOpen(false)}
				className="lg:hidden absolute top-6 right-6 p-2 text-textSecondary hover:text-textPrimary bg-muted rounded-xl transition-all"
			>
				<X size={20} />
			</button>

			<div className="flex items-center gap-3 mb-10 px-2 lg:px-4">
				<div className="w-10 h-10 bg-gradient-to-br from-primary to-primaryHover rounded-xl flex items-center justify-center font-black text-white shadow-lg shadow-primary/20">S</div>
				<span className="text-2xl font-black tracking-tighter text-textPrimary">StockSim</span>
			</div>

			<nav className="flex-1 space-y-1.5 overflow-y-auto pr-1 custom-scrollbar">
				{menuItems.map((item) => (
					<button
						key={item.id}
						onClick={() => setActiveTab(item.id)}
						className={`w-full flex items-center gap-4 px-5 py-3.5 rounded-2xl transition-all duration-300 ${activeTab === item.id
							? 'bg-primary text-white shadow-lg shadow-primary/20'
							: 'text-textSecondary hover:bg-muted hover:text-textPrimary'
							}`}
					>
						<item.icon size={20} strokeWidth={activeTab === item.id ? 2.5 : 2} />
						<span className="font-bold tracking-tight text-sm">{item.label}</span>
					</button>
				))}
			</nav>

			<div className="pt-6 mt-6 border-t border-faint space-y-2">
				<button
					onClick={onLogout}
					className="w-full flex items-center gap-4 px-5 py-3.5 rounded-2xl text-danger hover:bg-danger/10 transition-all group"
				>
					<div className="p-1 rounded-lg group-hover:bg-danger/20 transition-all">
						<LogOut size={20} />
					</div>
					<span className="font-bold tracking-tight text-sm">Đăng xuất</span>
				</button>
			</div>
		</div>
	);
};

export default Sidebar;
