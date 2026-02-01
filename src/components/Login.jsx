import React, { useState } from 'react';
import { User, Lock, ArrowRight, ShieldCheck, KeyRound, ArrowLeft, Eye, EyeOff, RefreshCw } from 'lucide-react';
import { api } from '../api';

const Login = ({ onLogin }) => {
	const [mode, setMode] = useState('login'); // 'login', 'register', 'forgot'
	const [step, setStep] = useState('input'); // 'input', 'otp'
	const [email, setEmail] = useState('');
	const [password, setPassword] = useState('');
	const [showPassword, setShowPassword] = useState(false);
	const [otp, setOtp] = useState('');
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState('');

	const handleStartAuth = async (e) => {
		e.preventDefault();
		setLoading(true);
		setError('');

		if (mode === 'login') {
			const res = await api.call('login', { email, password });
			if (res.success) {
				onLogin(email);
			} else {
				setError(res.error || 'Sai thông tin đăng nhập');
			}
		} else {
			// mode 'register' or 'forgot' needs OTP
			const res = await api.call('sendOTP', { email, type: mode === 'forgot' ? 'reset' : 'register' });
			if (res.success) {
				setStep('otp');
			} else {
				setError(res.error || 'Không thể gửi mã OTP.');
			}
		}
		setLoading(false);
	};

	const handleVerifyOTP = async (e) => {
		e.preventDefault();
		setLoading(true);
		setError('');

		if (mode === 'register') {
			const res = await api.call('register', { email, password, otp });
			if (res.success) {
				onLogin(email);
			} else {
				setError(res.error || 'Lỗi đăng ký hoặc OTP không đúng');
			}
		} else if (mode === 'forgot') {
			const res = await api.call('resetPassword', { email, password, otp });
			if (res.success) {
				alert('Đổi mật khẩu thành công! Hãy đăng nhập với mật khẩu mới.');
				setMode('login');
				setStep('input');
				setPassword('');
				setOtp('');
			} else {
				setError(res.error || 'Lỗi đặt lại mật khẩu');
			}
		}
		setLoading(false);
	};

	return (
		<div className="min-h-screen bg-background flex items-center justify-center p-6">
			<div className="absolute inset-0 overflow-hidden pointer-events-none">
				<div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] bg-primary/10 rounded-full blur-[120px]"></div>
				<div className="absolute -bottom-[10%] -right-[10%] w-[40%] h-[40%] bg-success/10 rounded-full blur-[120px]"></div>
			</div>

			<div className="w-full max-w-md glass p-10 rounded-[40px] relative z-10 border-faint shadow-2xl transition-all duration-500">
				<div className="flex flex-col items-center mb-10">
					<div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center mb-6 shadow-2xl shadow-primary/30">
						{mode === 'forgot' ? <RefreshCw size={32} className="text-white" /> : <ShieldCheck size={32} className="text-white" />}
					</div>
					<h1 className="text-3xl font-black tracking-tight mb-2">StockSim</h1>
					<p className="text-textSecondary font-medium text-center text-sm">
						{step === 'otp'
							? 'Xác thực địa chỉ Email'
							: (mode === 'login'
								? 'Chào mừng bạn quay lại hệ thống'
								: mode === 'register'
									? 'Bắt đầu hành trình đầu tư ngay hôm nay'
									: 'Khôi phục quyền truy cập tài khoản')}
					</p>
				</div>

				{step === 'input' ? (
					<form onSubmit={handleStartAuth} className="space-y-6">
						<div className="space-y-2">
							<label className="text-xs font-bold uppercase tracking-widest text-textSecondary ml-1">Email</label>
							<div className="relative">
								<User className="absolute left-4 top-1/2 -translate-y-1/2 text-textSecondary" size={18} />
								<input
									type="email"
									required
									value={email}
									onChange={(e) => setEmail(e.target.value)}
									className="w-full bg-muted border border-faint rounded-2xl py-4 pl-12 pr-4 focus:border-primary outline-none transition-all placeholder:text-textSecondary"
									placeholder="email@example.com"
								/>
							</div>
						</div>

						<div className="space-y-2">
							<div className="flex justify-between items-center ml-1">
								<label className="text-xs font-bold uppercase tracking-widest text-textSecondary">
									{mode === 'forgot' ? 'Mật khẩu mới' : 'Mật khẩu'}
								</label>
								{mode === 'login' && (
									<button
										type="button"
										onClick={() => { setMode('forgot'); setError(''); }}
										className="text-[10px] font-black text-primary hover:text-textPrimary transition-colors uppercase tracking-widest"
									>
										Quên?
									</button>
								)}
							</div>
							<div className="relative">
								<Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-textSecondary" size={18} />
								<input
									type={showPassword ? 'text' : 'password'}
									required
									value={password}
									onChange={(e) => setPassword(e.target.value)}
									className="w-full bg-muted border border-faint rounded-2xl py-4 pl-12 pr-12 focus:border-primary outline-none transition-all placeholder:text-textSecondary"
									placeholder="••••••••"
								/>
								<button
									type="button"
									onClick={() => setShowPassword(!showPassword)}
									className="absolute right-4 top-1/2 -translate-y-1/2 text-textSecondary hover:text-textPrimary transition-colors"
								>
									{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
								</button>
							</div>
						</div>

						{error && <div className="p-3 rounded-xl bg-danger/10 text-danger text-[11px] font-bold text-center border border-danger/20">{error}</div>}

						<button
							type="submit"
							disabled={loading}
							className={`w-full py-5 rounded-2xl ${mode === 'forgot' ? 'bg-warning' : 'bg-primary'} text-white font-black text-sm uppercase tracking-[0.2em] shadow-xl shadow-primary/25 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3 disabled:opacity-50`}
						>
							{loading ? 'ĐANG XỬ LÝ...' : (mode === 'login' ? 'ĐĂNG NHẬP' : mode === 'register' ? 'TIẾP TỤC ĐĂNG KÝ' : 'GỬI MÃ KHÔI PHỤC')}
							<ArrowRight size={20} />
						</button>
					</form>
				) : (
					<form onSubmit={handleVerifyOTP} className="space-y-6 animate-in fade-in zoom-in-95 duration-300">
						<div className="space-y-2">
							<label className="text-xs font-bold uppercase tracking-widest text-textSecondary ml-1">Mã xác nhận (OTP)</label>
							<div className="relative">
								<KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 text-textSecondary" size={18} />
								<input
									type="text"
									required
									maxLength={6}
									value={otp}
									onChange={(e) => setOtp(e.target.value)}
									className="w-full bg-muted border border-faint rounded-2xl py-4 pl-12 pr-4 focus:border-primary outline-none font-mono text-xl tracking-[0.5em] text-center"
									placeholder="000000"
								/>
							</div>
							<p className="text-[10px] text-textSecondary text-center mt-2 font-medium tracking-wide">Mã OTP đã được gửi về: <span className="text-primary font-bold">{email}</span></p>
						</div>

						{error && <div className="p-3 rounded-xl bg-danger/10 text-danger text-[11px] font-bold text-center border border-danger/20">{error}</div>}

						<div className="flex gap-3">
							<button
								type="button"
								onClick={() => setStep('input')}
								className="flex-[0.5] py-4 rounded-2xl bg-muted border border-faint text-white font-black text-[10px] uppercase tracking-widest hover:bg-white/10 transition-all flex items-center justify-center gap-2"
							>
								<ArrowLeft size={16} />
								QUAY LẠI
							</button>
							<button
								type="submit"
								disabled={loading}
								className="flex-1 py-4 rounded-2xl bg-success text-white font-black text-sm uppercase tracking-widest shadow-xl shadow-success/25 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50"
							>
								{loading ? 'XỬ LÝ...' : (mode === 'forgot' ? 'ĐỔI MẬT KHẨU' : 'XÁC NHẬN')}
							</button>
						</div>

						<button
							type="button"
							onClick={handleStartAuth}
							className="w-full text-[10px] font-black text-textSecondary hover:text-textPrimary transition-colors uppercase tracking-[0.2em]"
						>
							Gửi lại mã OTP
						</button>
					</form>
				)}

				{step === 'input' && (
					<div className="mt-8 text-center flex flex-col gap-3">
						<button
							onClick={() => {
								setMode(mode === 'login' ? 'register' : 'login');
								setError('');
							}}
							className="text-sm font-bold text-textSecondary hover:text-textPrimary transition-colors"
						>
							{mode === 'login' ? 'Chưa có tài khoản? Đăng ký ngay' : 'Đã có tài khoản? Đăng nhập'}
						</button>
						{mode === 'forgot' && (
							<button
								onClick={() => { setMode('login'); setError(''); }}
								className="text-xs font-black text-primary uppercase tracking-widest"
							>
								Quay lại đăng nhập
							</button>
						)}
					</div>
				)}

				<div className="mt-10 flex items-center gap-4">
					<div className="h-px flex-1 bg-muted"></div>
					<span className="text-[9px] font-black text-textSecondary uppercase tracking-[0.3em]">Simulation v2 Secure</span>
					<div className="h-px flex-1 bg-muted"></div>
				</div>
			</div>
		</div>
	);
};

export default Login;
