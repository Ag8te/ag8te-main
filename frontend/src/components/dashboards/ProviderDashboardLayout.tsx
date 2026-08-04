import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
    LayoutTemplate,
    ClipboardList,
    Briefcase,
    Wallet,
    Settings,
    Shield,
    LogOut,
    Menu,
    Bell,
    ChevronDown,
    User as UserIcon,
    Search,
    Plus
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

interface SidebarItem {
    id: string;
    label: string;
    icon: any;
    href: string;
    onClick?: () => void;
}

interface ProviderDashboardLayoutProps {
    children: React.ReactNode;
    role: 'driver' | 'professional' | 'service-provider';
    title: string;
    subtitle?: string;
    navItems: SidebarItem[];
    activeTabId?: string;
    onWithdrawClick?: () => void;
    onFindJobsClick?: () => void;
}

export const ProviderDashboardLayout = ({
    children,
    role,
    title,
    subtitle,
    navItems,
    activeTabId,
    onWithdrawClick,
    onFindJobsClick
}: ProviderDashboardLayoutProps) => {
    const navigate = useNavigate();
    const location = useLocation();
    const { toast } = useToast();
    const { user, logout } = useAuth();
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [scrolled, setScrolled] = useState(false);

    useEffect(() => {
        const handleScroll = () => {
            setScrolled(window.scrollY > 10);
        };
        window.addEventListener("scroll", handleScroll);
        return () => window.removeEventListener("scroll", handleScroll);
    }, []);

    const handleLogout = () => {
        logout();
        toast({ title: "Logged Out", description: "You have securely logged out." });
        navigate("/login");
    };

    const roleLabel = role === 'driver' ? 'DRIVER' : role === 'professional' ? 'PROFESSIONAL' : 'SERVICE PROVIDER';
    const themeColor = role === 'driver' ? '#1e88e5' : '#5e35b1'; 
    const themeBg = "bg-white"; /* Removed tinted backgrounds for Airbnb feel */
    const themeText = role === 'driver' ? 'text-[#1e88e5]' : 'text-[#5e35b1]';

    return (
        <div className="flex min-h-screen bg-white font-sans">
            {/* Sidebar Desktop */}
            <aside
                className={cn(
                    "fixed inset-y-0 left-0 z-50 w-[260px] transform bg-white transition-all duration-300 ease-in-out border-r border-gray-100 lg:static lg:translate-x-0",
                    sidebarOpen ? "translate-x-0" : "-translate-x-full lg:w-0 lg:overflow-hidden lg:border-none"
                )}
            >
                {/* Logo Area */}
                <div className="flex h-[80px] items-center px-8">
                    <span className="flex items-center gap-2 font-bold cursor-pointer" onClick={() => navigate('/')}>
                        <div className={cn("flex h-8 w-8 items-center justify-center rounded-lg border border-slate-100", themeText)}>
                            <Shield className="h-5 w-5" />
                        </div>
                        <span className="text-xl font-bold tracking-tighter text-[#222222]">
                            AG8TE
                        </span>
                    </span>
                </div>

                {/* Sidebar Nav */}
                <div className="flex flex-1 flex-col h-[calc(100vh-80px)] overflow-hidden">
                    <div className="flex-1 overflow-y-auto px-4 py-6">
                        <nav className="space-y-1">
                            {navItems.map((item) => (
                                <button
                                    key={item.id}
                                    onClick={() => {
                                        if (item.onClick) {
                                            item.onClick();
                                        } else {
                                            navigate(item.href);
                                        }
                                    }}
                                    className={cn(
                                        "flex items-center gap-4 w-full px-4 py-3 rounded-xl transition-all duration-200 text-sm font-medium relative group",
                                        (location.pathname === item.href || (activeTabId === item.id))
                                            ? "bg-slate-50 text-black font-bold"
                                            : "text-[#484848] hover:bg-slate-50 hover:text-black"
                                    )}
                                >
                                    <item.icon className={cn("h-[20px] w-[20px]", (location.pathname === item.href || (activeTabId === item.id)) ? "text-black" : "text-[#717171]")} />
                                    <span>
                                        {item.label}
                                    </span>
                                </button>
                            ))}
                        </nav>
                    </div>

                    {/* Sidebar Footer */}
                    <div className="p-6 border-t border-gray-100">
                        <button
                            onClick={handleLogout}
                            className="flex w-full items-center justify-start gap-3 rounded-xl px-4 py-3 text-sm font-bold text-[#222222] transition-all hover:bg-slate-50 group"
                        >
                            <LogOut className="h-5 w-5" />
                            Logout
                        </button>
                    </div>
                </div>
            </aside>

            {/* Main Content */}
            <div className="flex flex-1 flex-col overflow-hidden min-w-0">
                <header className={cn(
                    "native-safe-top sticky top-0 z-30 flex h-[80px] w-full items-center justify-between px-8 transition-all duration-200",
                    scrolled ? "bg-white/90 backdrop-blur-md border-b border-gray-100" : "bg-white border-b border-gray-50"
                )}>
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => setSidebarOpen(!sidebarOpen)}
                            className="flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 hover:shadow-md transition-all"
                        >
                            <Menu className="h-4 w-4" />
                        </button>
                    </div>

                    <div className="flex items-center gap-6">
                        <button className="relative p-2 text-[#222222] hover:bg-slate-50 rounded-full transition-colors">
                            <Bell className="h-5 w-5" />
                            <span className="absolute top-2 right-2 flex h-2 w-2">
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
                            </span>
                        </button>

                        <div className="flex items-center gap-3 py-1 px-1 pr-4 rounded-full border border-gray-200 cursor-pointer hover:shadow-md transition-all">
                            <div className={cn("flex h-8 w-8 items-center justify-center rounded-full text-white font-bold text-xs", role === 'driver' ? 'bg-[#1e88e5]' : 'bg-[#5e35b1]')}>
                                {user?.name?.charAt(0).toUpperCase() || 'P'}
                            </div>
                            <span className="text-sm font-bold text-[#222222]">
                                {user?.name?.split(' ')[0]}
                            </span>
                        </div>
                    </div>
                </header>

                <main className="flex-1 overflow-y-auto p-8 lg:p-12">
                    <div className="mx-auto max-w-6xl">
                        {/* Page Title */}
                        <div className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-6">
                            <div>
                                <h1 className="text-3xl md:text-4xl font-bold text-[#222222] tracking-tighter">
                                    {title}
                                </h1>
                                {subtitle && (
                                    <p className="text-base text-[#717171] mt-2 font-medium">
                                        {subtitle}
                                    </p>
                                )}
                            </div>

                            <div className="flex gap-3">
                                <button 
                                    onClick={onWithdrawClick}
                                    className="rounded-xl bg-white border border-gray-300 px-6 py-3 text-sm font-bold text-[#222222] hover:border-black transition-all active:scale-95"
                                >
                                    Withdraw Funds
                                </button>
                                <button 
                                    onClick={onFindJobsClick}
                                    className={cn("rounded-xl px-6 py-3 text-sm font-bold text-white shadow-sm transition-all hover:shadow-md active:scale-95", role === 'driver' ? 'bg-[#1e88e5]' : 'bg-[#5e35b1]')}
                                >
                                    Find New Jobs
                                </button>
                            </div>
                        </div>

                        {children}
                    </div>
                </main>
            </div>

            {/* Mobile Sidebar Overlay */}
            {!sidebarOpen && (
                <div
                    className="lg:hidden fixed inset-0 z-40 bg-gray-900/10"
                    onClick={() => setSidebarOpen(true)}
                />
            )}
        </div>
    );
};
