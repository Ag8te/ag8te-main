import { motion } from "framer-motion";
import { ExternalLink, Smartphone, Store } from "lucide-react";

export const MobileAppPromo = () => {
    const storeLinks = {
        apple: import.meta.env.VITE_APPLE_APP_STORE_URL || "",
        google: import.meta.env.VITE_GOOGLE_PLAY_URL || "/mzansiserve.apk",
        huawei: import.meta.env.VITE_HUAWEI_APPGALLERY_URL || "",
    };

    const StoreButton = ({
        href,
        label,
        sublabel,
        variant = "dark",
        children,
    }: {
        href?: string;
        label: string;
        sublabel: string;
        variant?: "dark" | "primary";
        children: React.ReactNode;
    }) => {
        const isEnabled = Boolean(href);
        const isDirectDownload = Boolean(href?.endsWith(".apk"));
        const baseClasses =
            variant === "primary"
                ? "bg-primary text-white hover:bg-primary/90"
                : "bg-[#222222] text-white hover:bg-black";

        return (
            <a
                href={isEnabled ? href : undefined}
                target={isEnabled && !isDirectDownload ? "_blank" : undefined}
                rel={isEnabled ? "noreferrer" : undefined}
                download={isDirectDownload ? true : undefined}
                aria-disabled={!isEnabled}
                className={`flex min-w-0 items-center gap-2 rounded-xl px-3 py-3 shadow-lg transition-all sm:gap-3 sm:px-5 ${isEnabled ? `${baseClasses} hover:scale-105` : "cursor-not-allowed bg-slate-200 text-slate-500"
                    }`}
            >
                {children}
                <div className="min-w-0 text-left">
                    <div className={`text-[10px] uppercase font-semibold leading-none ${isEnabled ? "text-white/60" : "text-slate-500"}`}>
                        {sublabel}
                    </div>
                    <div className="flex items-center gap-1 text-base font-bold leading-tight sm:text-lg">
                        <span className="truncate">{label}</span>
                        {isEnabled ? <ExternalLink className="w-4 h-4" /> : null}
                    </div>
                    {!isEnabled ? <div className="text-[10px] mt-1 uppercase tracking-wide">Coming soon</div> : null}
                </div>
            </a>
        );
    };

    return (
        <section className="py-6 sm:py-12 bg-slate-50 relative overflow-hidden">
            {/* Subtle dot pattern */}
            <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg width=\'6\' height=\'6\' viewBox=\'0 0 6 6\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'%23E5E7EB\' fill-opacity=\'0.4\'%3E%3Cpath d=\'M5 0h1L0 6V5zM6 5v1H5z\'/%3E%3C/g%3E%3C/svg%3E')] opacity-50" />

            <div className="container mx-auto px-6 relative z-10">

                {/* Mobile layout — compact side by side */}
                <div className="flex items-center gap-4 sm:hidden">

                    {/* Left — heading + store buttons */}
                    <div className="flex-1 min-w-0">
                        <h2 className="text-base font-bold text-[#222222] mb-3 leading-tight">
                            Get the MzansiServe{" "}
                            <span className="text-primary">Super App</span>
                        </h2>
                        <div className="flex flex-col gap-2">
                            {[
                                { label: "App Store", sublabel: "Download on the", href: storeLinks.apple, icon: (
                                    <svg className="w-5 h-5 fill-current shrink-0" viewBox="0 0 384 512">
                                        <path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41-84.5-41.9-38.9-.9-74.3 22.1-94.6 22.1-20.3 0-48.4-19.1-79-18.3-40.4.6-77.4 25.8-98.1 61.1-41.9 71.4-10.7 177.3 29.8 238.9 19.8 29.1 43.1 61.8 74.5 61.5 30.1-.3 41.4-19.1 77.6-19.1 36.3 0 46.5 19.1 77.8 18.5 31.9-.6 52.3-29.3 72-58.4 22.8-33.1 32.2-65.2 32.6-67.1-.7-.3-62.8-24.3-63-96.1zM288.2 86.4c17.5-22.1 29.4-52.6 26.2-86.4-28.9 1.2-58.8 19.8-79.6 44.1-18.6 21.6-34.8 53-30.7 85.1 32.2 2.5 60.1-17.7 84.1-42.8z" />
                                    </svg>
                                ), bg: "bg-[#1a1a2e]" },
                                { label: "Google Play", sublabel: "Get it on", href: storeLinks.google, icon: <Smartphone className="w-5 h-5 shrink-0" />, bg: "bg-primary" },
                                { label: "AppGallery", sublabel: "Explore on", href: storeLinks.huawei, icon: <Store className="w-5 h-5 shrink-0" />, bg: "bg-[#1a1a2e]" },
                            ].map(({ label, sublabel, href, icon, bg }) => {
                                const enabled = Boolean(href);
                                return (
                                    <a
                                        key={label}
                                        href={enabled ? href : undefined}
                                        target={enabled ? "_blank" : undefined}
                                        rel={enabled ? "noreferrer" : undefined}
                                        aria-disabled={!enabled}
                                        className={`flex items-center gap-2 rounded-xl px-3 py-2 transition-all ${enabled ? `${bg} text-white active:scale-95` : "bg-slate-200 text-slate-500 cursor-not-allowed"}`}
                                    >
                                        {icon}
                                        <div>
                                            <p className={`text-[9px] uppercase font-semibold leading-none ${enabled ? "text-white/60" : "text-slate-400"}`}>{sublabel}</p>
                                            <p className="text-xs font-bold leading-tight text-white">{label}</p>
                                            {!enabled && <p className="text-[9px] uppercase tracking-wide text-slate-400">Coming soon</p>}
                                        </div>
                                    </a>
                                );
                            })}
                        </div>
                    </div>

                    {/* Right — mini phone mockup matching desktop version */}
                    <div className="w-[110px] shrink-0">
                        <div className="bg-[#0F172A] rounded-[20px] border-[4px] border-[#222] overflow-hidden relative" style={{ aspectRatio: '9/18' }}>
                            {/* Camera notch */}
                            <div className="absolute top-0 w-full h-[12px] bg-[#222] flex justify-center items-end pb-[2px] z-30">
                                <div className="w-6 h-[4px] bg-black rounded-full" />
                            </div>
                            <div className="h-full bg-white relative flex flex-col">
                                {/* Address bar */}
                                <div className="pt-[14px] px-1.5 pb-1 bg-gray-50 border-b border-gray-200 flex flex-col gap-[2px] z-20">
                                    <div className="flex justify-between items-center mb-[2px]">
                                        <div className="text-[6px] font-bold text-gray-400">9:41</div>
                                        <div className="flex gap-[2px]">
                                            <div className="w-2 h-1.5 bg-gray-400 rounded-sm" />
                                            <div className="w-2 h-1.5 bg-gray-400 rounded-sm" />
                                        </div>
                                    </div>
                                    <div className="h-[14px] bg-white rounded border border-gray-200 flex items-center px-1.5 gap-1">
                                        <div className="w-1 h-1 bg-primary rounded-full" />
                                        <div className="text-[5px] text-gray-500 font-medium truncate">mzansiserve.co.za</div>
                                    </div>
                                </div>
                                {/* Screen content */}
                                <div className="flex-1 overflow-hidden text-[6px] leading-tight">
                                    <div className="bg-white h-full flex flex-col">
                                        {/* Navbar */}
                                        <div className="px-1.5 py-1 flex justify-between items-center bg-[#0F172A] text-white">
                                            <div className="font-bold tracking-tight text-[6px]">MZANSISERVE</div>
                                            <div className="w-3 h-3 flex flex-col justify-between py-[2px]">
                                                <div className="h-[1px] w-full bg-white rounded-full" />
                                                <div className="h-[1px] w-full bg-white rounded-full" />
                                                <div className="h-[1px] w-full bg-white rounded-full" />
                                            </div>
                                        </div>
                                        {/* Mini hero */}
                                        <div className="relative bg-[#0F172A] overflow-hidden" style={{ height: '52px' }}>
                                            <div className="absolute inset-0 bg-[#0F172A]/60 z-10" />
                                            <img
                                                src="https://images.unsplash.com/photo-1521737711867-e3b97375f902?w=400&q=80&fm=jpg"
                                                alt="Hero"
                                                className="absolute inset-0 w-full h-full object-cover opacity-50"
                                            />
                                            <div className="relative z-20 p-1.5 pt-2 text-left">
                                                <div className="inline-block px-[3px] py-[1px] bg-primary/20 border border-primary/30 rounded-full text-[4px] text-primary font-bold mb-[2px] uppercase">#1 in SA</div>
                                                <div className="text-white font-bold text-[6px] leading-none mb-[2px]">Your Life,<br />Simplified.</div>
                                                <div className="text-white/60 text-[4px] mb-1">Services at your door.</div>
                                                <div className="w-8 py-[2px] bg-primary rounded text-center text-white font-bold text-[4px]">Book Now</div>
                                            </div>
                                        </div>
                                        {/* Quick actions */}
                                        <div className="px-1.5 py-1.5 bg-[#F8FAFC]">
                                            <div className="grid grid-cols-4 gap-[3px] -mt-3 relative z-20">
                                                {[
                                                    { icon: "🚗", label: "Cab" },
                                                    { icon: "💼", label: "Pros" },
                                                    { icon: "🔧", label: "Home" },
                                                    { icon: "🛒", label: "Shop" },
                                                ].map((item, i) => (
                                                    <div key={i} className="p-[3px] bg-white rounded shadow-sm border border-gray-100 flex flex-col items-center">
                                                        <div className="text-[6px] mb-[1px]">{item.icon}</div>
                                                        <div className="text-[3px] font-bold text-gray-600">{item.label}</div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                        {/* Providers */}
                                        <div className="px-1.5 py-1 flex-1">
                                            <div className="font-bold text-[#222222] text-[5px] mb-1">Top Rated Experts</div>
                                            <div className="flex gap-[3px]">
                                                {[
                                                    { name: "Dr. Thabo", role: "Specialist", img: "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=100&fm=jpg" },
                                                    { name: "Lindiwe", role: "Legal", img: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=100&fm=jpg" },
                                                ].map((p, i) => (
                                                    <div key={i} className="flex-1 bg-white border border-gray-100 rounded p-[3px] flex flex-col items-center text-center">
                                                        <img src={p.img} alt={p.name} className="w-5 h-5 rounded-full mb-[2px] object-cover" />
                                                        <div className="font-bold text-[4px] text-[#222222] truncate w-full">{p.name}</div>
                                                        <div className="text-primary text-[3px]">{p.role}</div>
                                                        <div className="flex gap-[1px] mt-[1px]">
                                                            {[...Array(5)].map((_, j) => <div key={j} className="w-[2px] h-[2px] bg-yellow-400 rounded-full" />)}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                        {/* Home indicator */}
                                        <div className="h-4 bg-white flex justify-center items-center pb-1">
                                            <div className="w-8 h-[2px] bg-gray-200 rounded-full" />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Desktop layout — original, unchanged */}
                <div className="hidden sm:flex flex-col lg:flex-row items-center gap-16">

                    {/* Text content */}
                    <div className="flex-1">
                        <h2 className="text-2xl sm:text-4xl md:text-5xl lg:text-6xl font-semibold text-[#222222] mb-3 sm:mb-6">
                            Get the MzansiServe{" "}
                            <span className="text-primary">Super App</span>
                        </h2>
                        <p className="hidden sm:block text-lg md:text-xl text-slate-600 font-normal mb-10 leading-relaxed max-w-xl">
                            Manage bookings, chat with professionals, and track your drivers in real-time.
                            Everything you need, right in your pocket.
                        </p>

                        {/* Feature checklist — hidden on mobile */}
                        <ul className="hidden sm:grid sm:grid-cols-2 gap-4 mb-12">
                            {[
                                "Real-time Driver Tracking",
                                "Instant In-App Chat",
                                "Secure Mobile Payments",
                                "Exclusive App-only Deals",
                            ].map((item, i) => (
                                <li key={i} className="flex items-center gap-3">
                                    <span className="w-6 h-6 bg-primary/20 rounded-full flex items-center justify-center shrink-0">
                                        <span className="text-primary text-sm font-bold">✓</span>
                                    </span>
                                    <span className="text-slate-600 font-normal text-sm">{item}</span>
                                </li>
                            ))}
                        </ul>

                        {/* App store buttons */}
                        <div className="grid grid-cols-2 gap-3 sm:flex sm:flex-wrap sm:gap-4">
                            <StoreButton
                                href={storeLinks.apple}
                                label="App Store"
                                sublabel="Download on the"
                            >
                                <svg className="w-7 h-7 fill-current" viewBox="0 0 384 512">
                                    <path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41-84.5-41.9-38.9-.9-74.3 22.1-94.6 22.1-20.3 0-48.4-19.1-79-18.3-40.4.6-77.4 25.8-98.1 61.1-41.9 71.4-10.7 177.3 29.8 238.9 19.8 29.1 43.1 61.8 74.5 61.5 30.1-.3 41.4-19.1 77.6-19.1 36.3 0 46.5 19.1 77.8 18.5 31.9-.6 52.3-29.3 72-58.4 22.8-33.1 32.2-65.2 32.6-67.1-.7-.3-62.8-24.3-63-96.1zM288.2 86.4c17.5-22.1 29.4-52.6 26.2-86.4-28.9 1.2-58.8 19.8-79.6 44.1-18.6 21.6-34.8 53-30.7 85.1 32.2 2.5 60.1-17.7 84.1-42.8z" />
                                </svg>
                            </StoreButton>

                            <StoreButton
                                href={storeLinks.google}
                                label="Google Play"
                                sublabel="Get it on"
                                variant="primary"
                            >
                                <Smartphone className="w-7 h-7" />
                            </StoreButton>

                            <StoreButton
                                href={storeLinks.huawei}
                                label="AppGallery"
                                sublabel="Explore on"
                            >
                                <Store className="w-7 h-7" />
                            </StoreButton>
                        </div>
                        <p className="mt-4 text-sm text-slate-500">
                            Store links will activate automatically once the published listing URLs are added to the frontend environment.
                        </p>
                    </div>

                    {/* Phone mockup — hidden on mobile */}
                    <div className="hidden sm:flex flex-1 relative justify-center lg:justify-end">
                        <motion.div
                            className="relative z-10"
                        >
                            <div className="w-[280px] h-[580px] bg-[#0F172A] rounded-[3rem] border-[8px] border-[#222] shadow-[0_32px_80px_rgba(0,0,0,0.25)] overflow-hidden relative mx-auto">
                                {/* Camera notch */}
                                <div className="absolute top-0 w-full h-7 bg-[#222] flex justify-center items-end pb-1.5 z-30">
                                    <div className="w-16 h-3 bg-black rounded-full" />
                                </div>

                                <div className="h-full bg-white relative flex flex-col">
                                    {/* Address bar */}
                                    <div className="pt-8 px-4 pb-2 bg-gray-50 border-b border-gray-200 flex flex-col gap-1 z-20">
                                        <div className="flex justify-between items-center mb-1">
                                            <div className="text-[10px] font-bold text-gray-400">9:41</div>
                                            <div className="flex gap-1">
                                                <div className="w-3 h-2 bg-gray-400 rounded-sm" />
                                                <div className="w-3 h-2 bg-gray-400 rounded-sm" />
                                            </div>
                                        </div>
                                        <div className="h-7 bg-white rounded-lg border border-gray-200 flex items-center px-3 gap-2">
                                            <div className="w-2 h-2 bg-primary rounded-full" />
                                            <div className="text-[10px] text-gray-500 font-medium truncate">mzansiserve.co.za</div>
                                        </div>
                                    </div>

                                    {/* Screen content */}
                                    <div className="flex-1 overflow-y-auto text-[8px] leading-tight">
                                        <div className="bg-white">
                                            {/* Navbar */}
                                            <div className="px-3 py-2 flex justify-between items-center bg-[#0F172A] text-white">
                                                <div className="font-bold tracking-tight text-[10px]">MZANSISERVE</div>
                                                <div className="w-4 h-4 flex flex-col justify-between py-1">
                                                    <div className="h-0.5 w-full bg-white rounded-full" />
                                                    <div className="h-0.5 w-full bg-white rounded-full" />
                                                    <div className="h-0.5 w-full bg-white rounded-full" />
                                                </div>
                                            </div>

                                            {/* Mini hero */}
                                            <div className="relative h-32 bg-[#0F172A] overflow-hidden">
                                                <div className="absolute inset-0 bg-gradient-to-r from-[#0F172A] to-transparent z-10" />
                                                <img
                                                    src="https://images.unsplash.com/photo-1521737711867-e3b97375f902?w=400&q=80&fm=jpg"
                                                    alt="Hero"
                                                    className="absolute inset-0 w-full h-full object-cover opacity-50"
                                                />
                                                <div className="relative z-20 p-4 pt-6 text-left">
                                                    <div className="inline-block px-1.5 py-0.5 bg-primary/20 border border-primary/30 rounded-full text-[6px] text-primary font-bold mb-1 uppercase">#1 in SA</div>
                                                    <div className="text-white font-bold text-[12px] leading-none mb-1">Your Life,<br />Simplified.</div>
                                                    <div className="text-white/60 text-[7px] mb-3">Professional services at your door.</div>
                                                    <div className="w-16 py-1.5 bg-primary rounded text-center text-white font-bold shadow-sm text-[7px]">Book Now</div>
                                                </div>
                                            </div>

                                            {/* Quick actions */}
                                            <div className="px-3 py-4 bg-[#F8FAFC]">
                                                <div className="grid grid-cols-4 gap-2 -mt-8 relative z-20">
                                                    {[
                                                        { icon: "🚗", label: "Transport" },
                                                        { icon: "💼", label: "Pros" },
                                                        { icon: "🔧", label: "Home" },
                                                        { icon: "🛒", label: "Shop" },
                                                    ].map((item, i) => (
                                                        <div key={i} className="p-1.5 bg-white rounded-lg shadow-sm border border-gray-100 flex flex-col items-center">
                                                            <div className="text-[10px] mb-0.5">{item.icon}</div>
                                                            <div className="text-[5px] font-bold text-gray-600">{item.label}</div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>

                                            {/* Providers */}
                                            <div className="px-3 py-2">
                                                <div className="font-bold text-[#222222] text-[9px] mb-2">Top Rated Experts</div>
                                                <div className="flex gap-2">
                                                    {[
                                                        { name: "Dr. Thabo", role: "Specialist", img: "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=100&fm=jpg" },
                                                        { name: "Lindiwe", role: "Legal", img: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=100&fm=jpg" },
                                                    ].map((p, i) => (
                                                        <div key={i} className="flex-1 bg-white border border-gray-100 rounded-lg p-1.5 flex flex-col items-center text-center shadow-sm">
                                                            <img src={p.img} alt={p.name} className="w-8 h-8 rounded-full mb-1 object-cover" />
                                                            <div className="font-bold text-[7px] text-[#222222] truncate w-full">{p.name}</div>
                                                            <div className="text-primary text-[5px]">{p.role}</div>
                                                            <div className="flex gap-0.5 mt-0.5">
                                                                {[...Array(5)].map((_, j) => <div key={j} className="w-1 h-1 bg-yellow-400 rounded-full" />)}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Home indicator */}
                                    <div className="h-6 bg-white flex justify-center items-center pb-2">
                                        <div className="w-24 h-1.5 bg-gray-200 rounded-full" />
                                    </div>
                                </div>
                            </div>
                        </motion.div>

                        {/* Glow */}
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-primary/20 blur-[100px] rounded-full pointer-events-none" />
                    </div>
                </div>
            </div>
        </section>
    );
};
