// AuthPage.jsx
import { useState, useEffect, useRef } from "react";
import { gsap } from "gsap";
import {
	Mail,
	Lock,
	User,
	Building2,
	ArrowRight,
	ShieldCheck,
	TrendingUp,
	IndianRupee,
	MapPin,
	Globe,
} from "lucide-react";

const AuthPage = () => {
	const [activeTab, setActiveTab] = useState("login"); // "login" | "signup"
	const containerRef = useRef(null);
	const loginFormRef = useRef(null);
	const signupFormRef = useRef(null);

	// GSAP entrance animation
	useEffect(() => {
		const ctx = gsap.context(() => {
			// Fade in the entire card
			gsap.fromTo(
				".auth-card",
				{ opacity: 0, y: 30, scale: 0.96 },
				{
					opacity: 1,
					y: 0,
					scale: 1,
					duration: 0.7,
					ease: "power3.out",
					clearProps: "transform",
				},
			);

			// Brand panel elements stagger
			gsap.fromTo(
				".brand-item",
				{ opacity: 0, y: 18 },
				{
					opacity: 1,
					y: 0,
					duration: 0.5,
					stagger: 0.06,
					ease: "power2.out",
					delay: 0.1,
					clearProps: "transform",
				},
			);

			// Form header
			gsap.fromTo(
				".form-header",
				{ opacity: 0, y: 12 },
				{
					opacity: 1,
					y: 0,
					duration: 0.45,
					ease: "power2.out",
					delay: 0.2,
					clearProps: "transform",
				},
			);

			// Animate initial form (login)
			animateFormFields("login");
		}, containerRef);

		return () => ctx.revert();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	// Animate fields of the active form when tab changes
	useEffect(() => {
		animateFormFields(activeTab);
	}, [activeTab]);

	const animateFormFields = (tab) => {
		const formRef = tab === "login" ? loginFormRef : signupFormRef;
		if (!formRef.current) return;

		const items = formRef.current.querySelectorAll(".form-field");
		// Reset
		gsap.set(items, { opacity: 0, y: 16 });
		// Stagger in
		gsap.to(items, {
			opacity: 1,
			y: 0,
			duration: 0.5,
			stagger: 0.05,
			ease: "power3.out",
			delay: 0.08,
			clearProps: "transform",
		});
	};

	const handleTabSwitch = (tab) => {
		setActiveTab(tab);
	};

	const handleLogin = (e) => {
		e.preventDefault();
		const email = e.target.email.value;
		console.log(`🔐 Login attempt: ${email}`);
		// Simulate API call
		const btn = e.target.querySelector(".btn-primary");
		btn.disabled = true;
		btn.innerHTML = "Signing in…";
		setTimeout(() => {
			btn.innerHTML =
				'Sign in <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />';
			btn.disabled = false;
			alert(`✨ Welcome back, ${email.split("@")[0]}! (demo)`);
		}, 1200);
	};

	const handleSignup = (e) => {
		e.preventDefault();
		const email = e.target.email.value;
		console.log(`📝 Signup attempt: ${email}`);
		const btn = e.target.querySelector(".btn-primary");
		btn.disabled = true;
		btn.innerHTML = "Creating…";
		setTimeout(() => {
			btn.innerHTML =
				'Create account <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />';
			btn.disabled = false;
			alert(`🎉 Account created for ${email.split("@")[0]}! (demo)`);
		}, 1200);
	};

	return (
		<div
			ref={containerRef}
			className="font-dmsans min-h-screen flex items-center justify-center p-4 sm:p-6 bg-cream"
		>
			<div className="auth-card w-full max-w-6xl bg-white/70 backdrop-blur-xl rounded-[2.5rem] shadow-2xl overflow-hidden grid grid-cols-1 md:grid-cols-[1fr_1.1fr] border border-white/50 transition-shadow hover:shadow-3xl">
				<div className="brand-panel bg-espresso text-cream p-8 md:p-10 flex flex-col justify-between relative overflow-hidden">
					<div className="absolute inset-0 bg-gradient-to-br from-clay/20 via-transparent to-sage/10 pointer-events-none" />
					<div className="relative z-10">
						<div className="brand-item flex items-center gap-3 text-2xl font-extrabold tracking-tight">
							<Globe className="w-8 h-8 text-clay" strokeWidth={2.5} />
							<span>
								Market<span className="text-clay">Hub</span>
							</span>
						</div>
						<p className="brand-item text-cream/60 text-sm font-medium tracking-wide mt-1">
							B2B wholesale · dynamic pricing
						</p>
					</div>

					<div className="relative z-10 space-y-6">
						<h2 className="brand-item font-raleway text-3xl md:text-4xl font-bold leading-tight">
							Trade smarter,
							<br />
							<span className="text-clay">grow faster.</span>
						</h2>
						<ul className="brand-item space-y-3 text-sm font-medium text-cream/80">
							<li className="flex items-center gap-3">
								<ShieldCheck className="w-5 h-5 text-clay" />
								Verified suppliers
							</li>
							<li className="flex items-center gap-3">
								<TrendingUp className="w-5 h-5 text-clay" />
								Real-time pricing
							</li>
							<li className="flex items-center gap-3">
								<IndianRupee className="w-5 h-5 text-clay" />
								Zero-friction UPI
							</li>
						</ul>
					</div>

					<div className="relative z-10 text-cream/30 text-xs tracking-widest border-t border-white/10 pt-4 mt-4">
						© 2026 MarketHub · All rights reserved
					</div>
				</div>

				{/* ── Form Panel ── */}
				<div className="form-panel p-8 md:p-10 flex flex-col bg-white/30">
					<div className="form-header flex items-start justify-between mb-6">
						<div>
							<h2 className="text-2xl font-bold text-espresso">
								{activeTab === "login" ? "Welcome back" : "Join the network"}
							</h2>
							<p className="text-espresso/60 text-sm">
								{activeTab === "login"
									? "Sign in to continue sourcing"
									: "Start sourcing in minutes"}
							</p>
						</div>
						<div className="flex gap-1 bg-espresso/5 p-1 rounded-full">
							<button
								onClick={() => handleTabSwitch("login")}
								className={`px-4 py-1.5 text-xs font-bold rounded-full transition-all ${
									activeTab === "login"
										? "bg-clay text-white shadow-md shadow-clay/25"
										: "text-espresso/60 hover:bg-espresso/5"
								}`}
							>
								Login
							</button>
							<button
								onClick={() => handleTabSwitch("signup")}
								className={`px-4 py-1.5 text-xs font-bold rounded-full transition-all ${
									activeTab === "signup"
										? "bg-clay text-white shadow-md shadow-clay/25"
										: "text-espresso/60 hover:bg-espresso/5"
								}`}
							>
								Sign up
							</button>
						</div>
					</div>

					{/* ── Login Form ── */}
					<div
						ref={loginFormRef}
						className={`${activeTab === "login" ? "block" : "hidden"}`}
					>
						<form onSubmit={handleLogin} className="flex flex-col gap-4">
							<div className="form-field">
								<label
									htmlFor="loginEmail"
									className="text-xs font-bold text-espresso/60 uppercase tracking-wider"
								>
									Email address
								</label>
								<div className="relative">
									<Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-espresso/40" />
									<input
										id="loginEmail"
										name="email"
										type="email"
										placeholder="you@company.com"
										required
										className="w-full pl-10 pr-4 py-3 bg-white/60 rounded-xl border border-espresso/10 focus:border-clay focus:ring-4 focus:ring-clay/10 transition-all outline-none text-espresso placeholder:text-espresso/30"
									/>
								</div>
							</div>

							<div className="form-field">
								<label
									htmlFor="loginPassword"
									className="text-xs font-bold text-espresso/60 uppercase tracking-wider"
								>
									Password
								</label>
								<div className="relative">
									<Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-espresso/40" />
									<input
										id="loginPassword"
										name="password"
										type="password"
										placeholder="••••••••"
										required
										className="w-full pl-10 pr-4 py-3 bg-white/60 rounded-xl border border-espresso/10 focus:border-clay focus:ring-4 focus:ring-clay/10 transition-all outline-none text-espresso placeholder:text-espresso/30"
									/>
								</div>
							</div>

							<div className="form-field flex items-center justify-between text-sm">
								<label className="flex items-center gap-2 text-espresso/70">
									<input
										type="checkbox"
										defaultChecked
										className="accent-clay w-4 h-4"
									/>
									Remember me
								</label>
								<a
									href="#"
									className="text-clay font-semibold hover:opacity-70 transition"
								>
									Forgot password?
								</a>
							</div>

							<button
								type="submit"
								className="btn-primary group w-full bg-clay text-cream font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 hover:bg-clay/90 hover:-translate-y-0.5 transition-all shadow-lg shadow-clay/25 hover:shadow-clay/35"
							>
								Sign in
								<ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
							</button>

							<div className="form-field divider flex items-center gap-4 text-espresso/30 text-xs uppercase tracking-widest">
								<span className="flex-1 h-px bg-espresso/10" />
								or continue with
								<span className="flex-1 h-px bg-espresso/10" />
							</div>

							<div className="form-field grid grid-cols-3 gap-2">
								{["Google", "Facebook", "Apple"].map((provider) => (
									<button
										key={provider}
										type="button"
										className="flex items-center justify-center gap-2 py-2.5 bg-white/50 border border-espresso/5 rounded-xl hover:border-clay hover:bg-white transition text-espresso/80 text-sm font-medium"
									>
										{provider === "Google" && "G"}
										{provider === "Facebook" && "f"}
										{provider === "Apple" && ""}
										<span className="hidden sm:inline">{provider}</span>
									</button>
								))}
							</div>

							<p className="form-field text-center text-espresso/60 text-sm">
								Don't have an account?{" "}
								<button
									type="button"
									onClick={() => handleTabSwitch("signup")}
									className="text-clay font-bold hover:opacity-70 transition"
								>
									Sign up →
								</button>
							</p>
						</form>
					</div>

					{/* ── Signup Form ── */}
					<div
						ref={signupFormRef}
						className={`${activeTab === "signup" ? "block" : "hidden"}`}
					>
						<form onSubmit={handleSignup} className="flex flex-col gap-4">
							<div className="grid grid-cols-2 gap-3">
								<div className="form-field">
									<label
										htmlFor="signupFirst"
										className="text-xs font-bold text-espresso/60 uppercase tracking-wider"
									>
										First name
									</label>
									<div className="relative">
										<User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-espresso/40" />
										<input
											id="signupFirst"
											name="firstName"
											type="text"
											placeholder="Malik"
											required
											className="w-full pl-10 pr-4 py-3 bg-white/60 rounded-xl border border-espresso/10 focus:border-clay focus:ring-4 focus:ring-clay/10 transition-all outline-none text-espresso placeholder:text-espresso/30"
										/>
									</div>
								</div>
								<div className="form-field">
									<label
										htmlFor="signupLast"
										className="text-xs font-bold text-espresso/60 uppercase tracking-wider"
									>
										Last name
									</label>
									<input
										id="signupLast"
										name="lastName"
										type="text"
										placeholder="Sharma"
										required
										className="w-full px-4 py-3 bg-white/60 rounded-xl border border-espresso/10 focus:border-clay focus:ring-4 focus:ring-clay/10 transition-all outline-none text-espresso placeholder:text-espresso/30"
									/>
								</div>
							</div>

							<div className="form-field">
								<label
									htmlFor="signupEmail"
									className="text-xs font-bold text-espresso/60 uppercase tracking-wider"
								>
									Business email
								</label>
								<div className="relative">
									<Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-espresso/40" />
									<input
										id="signupEmail"
										name="email"
										type="email"
										placeholder="Malik@company.com"
										required
										className="w-full pl-10 pr-4 py-3 bg-white/60 rounded-xl border border-espresso/10 focus:border-clay focus:ring-4 focus:ring-clay/10 transition-all outline-none text-espresso placeholder:text-espresso/30"
									/>
								</div>
							</div>

							<div className="form-field">
								<label
									htmlFor="signupPassword"
									className="text-xs font-bold text-espresso/60 uppercase tracking-wider"
								>
									Create password
								</label>
								<div className="relative">
									<Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-espresso/40" />
									<input
										id="signupPassword"
										name="password"
										type="password"
										placeholder="Min. 8 characters"
										required
										className="w-full pl-10 pr-4 py-3 bg-white/60 rounded-xl border border-espresso/10 focus:border-clay focus:ring-4 focus:ring-clay/10 transition-all outline-none text-espresso placeholder:text-espresso/30"
									/>
								</div>
							</div>

							<div className="form-field">
								<label
									htmlFor="signupCompany"
									className="text-xs font-bold text-espresso/60 uppercase tracking-wider"
								>
									Company name
								</label>
								<div className="relative">
									<Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-espresso/40" />
									<input
										id="signupCompany"
										name="company"
										type="text"
										placeholder="Your business name"
										className="w-full pl-10 pr-4 py-3 bg-white/60 rounded-xl border border-espresso/10 focus:border-clay focus:ring-4 focus:ring-clay/10 transition-all outline-none text-espresso placeholder:text-espresso/30"
									/>
								</div>
							</div>

							<button
								type="submit"
								className="btn-primary group w-full bg-clay text-cream font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 hover:bg-clay/90 hover:-translate-y-0.5 transition-all shadow-lg shadow-clay/25 hover:shadow-clay/35"
							>
								Create account
								<ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
							</button>

							<div className="form-field divider flex items-center gap-4 text-espresso/30 text-xs uppercase tracking-widest">
								<span className="flex-1 h-px bg-espresso/10" />
								or continue with
								<span className="flex-1 h-px bg-espresso/10" />
							</div>

							<div className="form-field grid grid-cols-3 gap-2">
								{["Google", "Facebook", "Apple"].map((provider) => (
									<button
										key={provider}
										type="button"
										className="flex items-center justify-center gap-2 py-2.5 bg-white/50 border border-espresso/5 rounded-xl hover:border-clay hover:bg-white transition text-espresso/80 text-sm font-medium"
									>
										{provider === "Google" && "G"}
										{provider === "Facebook" && "f"}
										{provider === "Apple" && ""}
										<span className="hidden sm:inline">{provider}</span>
									</button>
								))}
							</div>

							<p className="form-field text-center text-espresso/60 text-sm">
								Already a member?{" "}
								<button
									type="button"
									onClick={() => handleTabSwitch("login")}
									className="text-clay font-bold hover:opacity-70 transition"
								>
									Log in →
								</button>
							</p>
						</form>
					</div>
				</div>
			</div>
		</div>
	);
};

export default AuthPage;
