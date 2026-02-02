import React, { useState } from 'react';
import { ShieldCheck, Mail, Zap, CheckCircle2, CreditCard, ChevronRight, Sparkles, Smartphone, Landmark, Upload, Image as ImageIcon, Loader2, Check } from 'lucide-react';
import { api } from '../api';

const UpgradePro = ({ userEmail }) => {
	const [step, setStep] = useState(1); // 1: Info, 2: Payment Select, 3: UNC Upload, 4: Success
	const [paymentMethod, setPaymentMethod] = useState('');
	const [isSubmitting, setIsSubmitting] = useState(false);

	const benefits = [
		{
			title: 'Đọc phiếu chi tự động',
			desc: 'Hệ thống tự động quét mail ngân hàng và nhập liệu thu chi ngay lập tức.',
			icon: ShieldCheck,
			color: 'text-blue-500',
			bg: 'bg-blue-500/10'
		},
		{
			title: 'Đồng bộ đa ngân hàng',
			desc: 'Hỗ trợ Vietcombank, Techcombank, MB Bank và nhiều ngân hàng khác qua Gmail.',
			icon: Mail,
			color: 'text-purple-500',
			bg: 'bg-purple-500/10'
		},
		{
			title: 'Báo cáo thông minh',
			desc: 'Phân tích dòng tiền, biểu đồ tăng trưởng và cảnh báo chi tiêu vượt mức.',
			icon: Zap,
			color: 'text-amber-500',
			bg: 'bg-amber-500/10'
		}
	];

	// Removed unused file state and handlers

	const handleSubmit = async () => {
		setIsSubmitting(true);
		try {
			const res = await api.call('submitUpgradeRequest', {
				email: userEmail,
				method: paymentMethod === 'momo' ? 'Ví Momo' : 'Chuyển khoản Ngân hàng',
				file: null // Không gửi file nữa
			});

			if (res && res.success) {
				setStep(4);
			} else {
				alert('Có lỗi xảy ra: ' + (res.error || 'Vui lòng thử lại sau.'));
			}
			setIsSubmitting(false);
		} catch (error) {
			console.error("Lỗi gửi yêu cầu:", error);
			alert('Lỗi kết nối server.');
			setIsSubmitting(false);
		}
	};

	return (
		<div className="max-w-4xl mx-auto space-y-8 animate-in side-in-from-right-5 duration-500 pb-20">
			{step === 1 && (
				<>
					{/* Hero Section */}
					<div className="glass p-8 lg:p-12 rounded-[40px] border-faint overflow-hidden relative group">
						<div className="absolute -right-20 -top-20 w-80 h-80 bg-primary/20 rounded-full blur-[100px] group-hover:bg-primary/30 transition-all duration-1000"></div>
						<div className="absolute -left-20 -bottom-20 w-80 h-80 bg-purple-500/10 rounded-full blur-[100px] group-hover:bg-purple-500/20 transition-all duration-1000"></div>

						<div className="relative z-10 flex flex-col lg:flex-row items-center gap-10">
							<div className="flex-1 space-y-6 text-center lg:text-left">
								<div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary animate-pulse">
									<Sparkles size={16} />
									<span className="text-[10px] font-black uppercase tracking-widest">Tính năng cao cấp</span>
								</div>

								<h1 className="text-3xl lg:text-5xl font-black tracking-tight leading-tight">
									NÂNG CẤP <br />
									<span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-purple-500">TỰ ĐỘNG HÓA</span> <br />
									THU CHI NGÂN HÀNG
								</h1>

								<p className="text-textSecondary font-bold text-sm lg:text-base leading-relaxed max-w-lg">
									Giải phóng thời gian của bạn. Không còn phải nhập tay từng giao dịch.
									Ứng dụng sẽ tự động lấy thông tin từ email biến động số dư và ghi chép vào sổ thu chi của bạn.
								</p>

								<div className="flex flex-wrap items-center gap-4 justify-center lg:justify-start pt-4">
									<div className="flex items-center gap-2 text-success">
										<CheckCircle2 size={18} />
										<span className="text-xs font-black uppercase tracking-widest">An toàn tuyệt đối</span>
									</div>
									<div className="flex items-center gap-2 text-success">
										<CheckCircle2 size={18} />
										<span className="text-xs font-black uppercase tracking-widest">Cài đặt 1 lần</span>
									</div>
								</div>
							</div>

							<div className="w-full lg:w-80 glass p-8 rounded-[32px] border-primary/30 shadow-2xl shadow-primary/20 relative">
								<div className="absolute inset-0 bg-primary/5 rounded-[32px]"></div>
								<div className="relative z-10 space-y-6 text-center">
									<div className="space-y-1">
										<p className="text-xs font-black text-textSecondary uppercase tracking-widest">Gói Pro 1 Năm</p>
										<h2 className="text-4xl font-black text-textPrimary tracking-tighter">300.000đ</h2>
										<p className="text-[10px] text-textSecondary font-bold">Chỉ ~800đ / ngày</p>
									</div>

									<div className="h-px bg-faint w-full"></div>

									<ul className="space-y-3 text-left">
										{['Tự động quét Gmail', 'Không giới hạn giao dịch', 'Xuất báo cáo Excel/PDF', 'Hỗ trợ ưu tiên 24/7'].map((item, idx) => (
											<li key={idx} className="flex items-center gap-3">
												<CheckCircle2 size={14} className="text-primary" />
												<span className="text-[10px] font-bold text-textPrimary/80 uppercase">{item}</span>
											</li>
										))}
									</ul>

									<button
										onClick={() => setStep(2)}
										className="w-full py-4 bg-primary hover:bg-primaryHover text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-lg shadow-primary/20 transition-all active:scale-95 flex items-center justify-center gap-2"
									>
										Nâng cấp ngay <ChevronRight size={18} />
									</button>
								</div>
							</div>
						</div>
					</div>

					{/* Benefits Grid */}
					<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
						{benefits.map((b, i) => (
							<div key={i} className="glass p-8 rounded-[32px] border-faint hover:border-primary/30 transition-all group">
								<div className={`p-4 ${b.bg} ${b.color} rounded-2xl w-fit mb-6 group-hover:scale-110 transition-transform`}>
									<b.icon size={24} />
								</div>
								<h3 className="text-lg font-black uppercase tracking-tight mb-3 group-hover:text-primary transition-colors">{b.title}</h3>
								<p className="text-textSecondary font-bold text-xs leading-relaxed">{b.desc}</p>
							</div>
						))}
					</div>
				</>
			)}

			{step === 2 && (
				<div className="max-w-2xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-5">
					<div className="text-center space-y-4">
						<h2 className="text-3xl font-black uppercase tracking-tight">Chọn phương thức thanh toán</h2>
						<p className="text-textSecondary font-bold text-sm uppercase tracking-widest opacity-60">Gói Pro - 300.000đ / năm</p>
					</div>

					<div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
						<button
							onClick={() => { setPaymentMethod('bank'); setStep(3); }}
							className="glass p-8 rounded-[32px] border-faint hover:border-primary/50 transition-all group text-center space-y-4 group"
						>
							<div className="w-16 h-16 bg-muted rounded-2xl flex items-center justify-center mx-auto text-textSecondary group-hover:text-primary group-hover:bg-primary/10 transition-all">
								<Landmark size={32} />
							</div>
							<h3 className="font-black uppercase tracking-widest text-sm">Chuyển khoản NH</h3>
							<p className="text-[10px] text-textSecondary font-bold uppercase tracking-wider">Vietcombank / Techcombank</p>
						</button>

						<button
							onClick={() => { setPaymentMethod('momo'); setStep(3); }}
							className="glass p-8 rounded-[32px] border-faint hover:border-pink-500/50 transition-all group text-center space-y-4 group"
						>
							<div className="w-16 h-16 bg-muted rounded-2xl flex items-center justify-center mx-auto text-textSecondary group-hover:text-pink-500 group-hover:bg-pink-500/10 transition-all">
								<Smartphone size={32} />
							</div>
							<h3 className="font-black uppercase tracking-widest text-sm">Ví Momo</h3>
							<p className="text-[10px] text-textSecondary font-bold uppercase tracking-wider">Nhanh chóng & Tiện lợi</p>
						</button>
					</div>

					<button
						onClick={() => setStep(1)}
						className="w-full py-4 text-textSecondary font-black text-[10px] uppercase tracking-widest hover:text-textPrimary transition-all"
					>
						Quay lại
					</button>
				</div>
			)}

			{step === 3 && (
				<div className="max-w-2xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-5">
					<div className="text-center space-y-4">
						<h2 className="text-3xl font-black uppercase tracking-tight">Thực hiện thanh toán</h2>
						<p className="text-textSecondary font-bold text-sm">Vui lòng chuyển khoản đúng nội dung để hệ thống tự động kích hoạt</p>
					</div>

					<div className="glass p-8 rounded-[40px] border-faint space-y-8 relative overflow-hidden">
						<div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
							<div className="space-y-6">
								<div className="p-4 bg-muted rounded-2xl border border-faint space-y-1">
									<p className="text-[9px] font-black text-textSecondary uppercase tracking-widest">Số tiền cần thanh toán</p>
									<p className="text-2xl font-black text-primary">300.000đ</p>
								</div>

								{paymentMethod === 'bank' ? (
									<div className="space-y-4">
										<div className="flex justify-between items-center text-xs">
											<span className="font-bold text-textSecondary uppercase tracking-widest">Chủ tài khoản:</span>
											<span className="font-black text-textPrimary uppercase">{import.meta.env.VITE_BANK_ACCOUNT_NAME}</span>
										</div>
										<div className="flex justify-between items-center text-xs">
											<span className="font-bold text-textSecondary uppercase tracking-widest">Số tài khoản:</span>
											<span className="font-black text-textPrimary tracking-widest">{import.meta.env.VITE_BANK_ACCOUNT_NUMBER}</span>
										</div>
										<div className="flex justify-between items-center text-xs">
											<span className="font-bold text-textSecondary uppercase tracking-widest">Ngân hàng:</span>
											<span className="font-black text-textPrimary uppercase">{import.meta.env.VITE_BANK_NAME}</span>
										</div>
									</div>
								) : (
									<div className="space-y-4">
										<div className="flex justify-between items-center text-xs">
											<span className="font-bold text-textSecondary uppercase tracking-widest">Chủ ví:</span>
											<span className="font-black text-textPrimary uppercase">{import.meta.env.VITE_BANK_ACCOUNT_NAME}</span>
										</div>
										<div className="flex justify-between items-center text-xs">
											<span className="font-bold text-textSecondary uppercase tracking-widest">Số điện thoại ví:</span>
											<span className="font-black text-textPrimary tracking-widest">{import.meta.env.VITE_MOMO_PHONE}</span>
										</div>
										<div className="flex justify-between items-center text-xs">
											<span className="font-bold text-textSecondary uppercase tracking-widest">Ví điện tử:</span>
											<span className="font-black text-pink-500 uppercase">Momo</span>
										</div>
									</div>
								)}

								<div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl animate-pulse">
									<p className="text-[9px] font-black text-amber-500 uppercase tracking-widest leading-relaxed mb-1">
										Nội dung chuyển khoản (Bắt buộc):
									</p>
									<p className="text-sm font-black text-amber-600">
										UPGRADE PRO {userEmail.split('@')[0].toUpperCase()}
									</p>
								</div>
							</div>

							<div className="relative aspect-square bg-white rounded-3xl p-4 flex items-center justify-center shadow-inner">
								{/* Logic chọn QR Code: Ngân hàng dùng VietQR, Momo dùng định dạng riêng */}
								<img
									src={(() => {
										const content = `UPGRADE PRO ${userEmail.split('@')[0].toUpperCase()}`;
										if (paymentMethod === 'bank') {
											// VietQR chuẩn cho App Ngân hàng
											return `https://img.vietqr.io/image/VCB-${import.meta.env.VITE_BANK_ACCOUNT_NUMBER}-compact.png?amount=300000&addInfo=${encodeURIComponent(content)}&accountName=${encodeURIComponent(import.meta.env.VITE_BANK_ACCOUNT_NAME)}`;
										} else {
											// Momo Format (Giữ nguyên cho ví Momo)
											const momoLink = `https://me.momo.vn/${import.meta.env.VITE_MOMO_PHONE}?amount=300000&message=${encodeURIComponent(content)}`;
											return `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(momoLink)}`;
										}
									})()}
									alt="QR Payment"
									className="w-full h-full"
								/>
								<div className="absolute inset-0 border-[10px] border-white/50 pointer-events-none rounded-3xl"></div>
							</div>
						</div>
					</div>

					<div className="space-y-6">
						<div className="text-center p-6 bg-muted rounded-3xl border border-faint">
							<ShieldCheck size={40} className="mx-auto text-primary mb-3" />
							<p className="text-xs font-bold text-textPrimary mb-1">
								Hệ thống sẽ tự động kiểm tra giao dịch dựa trên nội dung chuyển khoản.
							</p>
							<p className="text-[10px] text-textSecondary">
								Sau khi chuyển khoản xong, hãy nhấn nút xác nhận bên dưới.
							</p>
						</div>

						<button
							onClick={handleSubmit}
							disabled={isSubmitting}
							className={`w-full py-5 rounded-[24px] font-black text-xs uppercase tracking-[0.3em] shadow-2xl transition-all flex items-center justify-center gap-3 ${isSubmitting ? 'bg-muted text-textSecondary opacity-50 cursor-not-allowed' : 'bg-primary text-white hover:bg-primaryHover shadow-primary/30 active:scale-[0.98]'}`}
						>
							{isSubmitting ? (
								<>
									<Loader2 size={18} className="animate-spin" />
									Đang xử lý kích hoạt...
								</>
							) : (
								<>
									<Check size={18} />
									Tôi đã chuyển khoản xong
								</>
							)}
						</button>

						<button
							onClick={() => setStep(2)}
							disabled={isSubmitting}
							className="w-full py-4 text-textSecondary font-black text-[10px] uppercase tracking-widest hover:text-textPrimary transition-all"
						>
							Hủy và quay lại
						</button>
					</div>
				</div>
			)}

			{step === 4 && (
				<div className="max-w-xl mx-auto py-20 text-center space-y-8 animate-in zoom-in duration-700">
					<div className="relative mx-auto w-32 h-32">
						<div className="absolute inset-0 bg-success/20 rounded-full animate-ping"></div>
						<div className="relative z-10 w-full h-full bg-success text-white rounded-full flex items-center justify-center shadow-2xl shadow-success/40">
							<CheckCircle2 size={60} strokeWidth={3} />
						</div>
					</div>

					<div className="space-y-4">
						<h2 className="text-4xl font-black uppercase tracking-tight">Gửi yêu cầu thành công!</h2>
						<p className="text-textSecondary font-bold leading-relaxed">
							Hệ thống đã nhận được thông tin thanh toán của bạn.<br />
							Admin sẽ kiểm tra và kích hoạt gói Pro trong vòng **24h**.<br />
							Thông báo sẽ được gửi tới Email của bạn ngay khi hoàn tất.
						</p>
					</div>

					<div className="pt-8">
						<button
							onClick={() => window.location.href = '/'}
							className="px-10 py-4 glass border border-faint rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-muted transition-all"
						>
							Quay lại Dashboard
						</button>
					</div>
				</div>
			)}

			{/* Integration Guide (Only on first step) */}
			{step === 1 && (
				<div className="glass p-8 rounded-[40px] border-faint space-y-10 relative overflow-hidden">
					<div className="absolute top-0 right-0 p-4 opacity-5">
						<Mail size={200} />
					</div>

					<div>
						<h3 className="text-xl font-black uppercase tracking-tight">Quy trình tích hợp</h3>
						<p className="text-textSecondary font-bold text-sm">Đơn giản - Bảo mật - Hiệu quả</p>
					</div>

					<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 relative z-10">
						{[
							{ step: '01', title: 'Thanh toán', desc: 'Đăng ký gói Pro 300k/năm qua chuyển khoản.' },
							{ step: '02', title: 'Kết nối', desc: 'Ủy quyền đọc Email chứa thông báo từ ngân hàng.' },
							{ step: '03', title: 'Cấu hình', desc: 'Hệ thống tự nhận diện mẫu mail của ngân hàng bạn dùng.' },
							{ step: '04', title: 'Hoàn tất', desc: 'Từ nay, mỗi khi chuyển tiền, dữ liệu sẽ tự nhảy vào web.' }
						].map((s, i) => (
							<div key={i} className="space-y-4">
								<span className="text-4xl font-black text-primary/10 tracking-tighter">{s.step}</span>
								<h4 className="text-xs font-black uppercase tracking-widest text-textPrimary">{s.title}</h4>
								<p className="text-[10px] text-textSecondary font-bold leading-relaxed">{s.desc}</p>
							</div>
						))}
					</div>
				</div>
			)}
		</div>
	);
};

export default UpgradePro;
