import { Suspense, lazy, useState, useEffect, useCallback, type ComponentType } from "react";
import { useNavigate } from "react-router-dom";
import {
    Box,
    CircularProgress,
    Typography,
} from "@mui/material";
import {
    Dashboard as LayoutTemplate,
    People as Users,
    Assignment as ClipboardList,
    Inventory as Package,
    Help as HelpCircle,
    AccountTree as ListTree,
    Work as Briefcase,
    AccountBalanceWallet as CreditCard,
    PeopleAlt as UserSquare2,
    AccessTime as Clock,
    Settings,
    Shield,
    Insights as Activity,
    ReportProblem as ShieldAlert,
    Chat as MessageSquare,
    Image as ImageIcon,
    ShoppingBag,
} from "@mui/icons-material";
import { useToast } from "@/hooks/use-toast";
import { apiFetch } from "@/lib/api";
import DashboardLayout from "@/components/dashboard/DashboardLayout";

const lazyNamed = (factory: () => Promise<Record<string, any>>, exportName: string) =>
    lazy(async () => {
        const module = await factory();
        return { default: module[exportName] };
    });

const Overview = lazy(() => import("@/components/admin/Overview"));
const UsersManagement = lazyNamed(() => import("@/components/admin/UsersManagement"), "UsersManagement");
const RequestsManagement = lazyNamed(() => import("@/components/admin/RequestsManagement"), "RequestsManagement");
const ProductsManagement = lazyNamed(() => import("@/components/admin/ProductsManagement"), "ProductsManagement");
const ContentManagement = lazyNamed(() => import("@/components/admin/ContentManagement"), "ContentManagement");
const WithdrawalsManagement = lazyNamed(() => import("@/components/admin/WithdrawalsManagement"), "WithdrawalsManagement");
const AgentsManagement = lazyNamed(() => import("@/components/admin/AgentsManagement"), "AgentsManagement");
const PendingUpdatesManagement = lazyNamed(() => import("@/components/admin/PendingUpdatesManagement"), "PendingUpdatesManagement");
const SettingsManagement = lazyNamed(() => import("@/components/admin/SettingsManagement"), "SettingsManagement");
const FAQManagement = lazyNamed(() => import("@/components/admin/FAQManagement"), "FAQManagement");
const CategoriesManagement = lazyNamed(() => import("@/components/admin/CategoriesManagement"), "CategoriesManagement");
const ServicesManagement = lazyNamed(() => import("@/components/admin/ServicesManagement"), "ServicesManagement");
const SalesFinance = lazyNamed(() => import("@/components/admin/SalesFinance"), "SalesFinance");
const CarouselManagement = lazyNamed(() => import("@/components/admin/CarouselManagement"), "CarouselManagement");
const ApiLogsManagement = lazyNamed(() => import("@/components/admin/ApiLogsManagement"), "ApiLogsManagement");
const ReportsManagement = lazyNamed(() => import("@/components/admin/ReportsManagement"), "ReportsManagement");
const GlobalChatsManagement = lazyNamed(() => import("@/components/admin/GlobalChatsManagement"), "GlobalChatsManagement");
const AffiliatesManagement = lazyNamed(() => import("@/components/admin/AffiliatesManagement"), "AffiliatesManagement");
const PaymentSettings = lazyNamed(() => import("@/components/admin/PaymentSettings"), "PaymentSettings");
const LandingPageManagement = lazy(() => import("@/components/admin/LandingPageManagement"));
const PanicAlertsPanel = lazyNamed(() => import("@/components/admin/PanicAlertsPanel"), "PanicAlertsPanel");

type TabKey =
    | "overview"
    | "users"
    | "requests"
    | "products"
    | "faqs"
    | "categories"
    | "services"
    | "sales"
    | "carousel"
    | "cms"
    | "settings"
    | "legal"
    | "withdrawals"
    | "agents"
    | "pending-updates"
    | "pendingUpdates"
    | "api-logs"
    | "user-reports"
    | "global-chats"
    | "affiliates"
    | "payment-settings"
    | "landing"
    | "safety";

const NAV_STRUCTURE = [
    {
        type: "item",
        id: "overview",
        label: "Account Management",
        icon: LayoutTemplate
    },
    {
        type: "item",
        id: "users",
        label: "Users Management",
        icon: Users
    },
    {
        type: "item",
        id: "affiliates",
        label: "Affiliates & Agents",
        icon: UserSquare2
    },
    {
        type: "group",
        label: "Monitoring",
        icon: Shield,
        children: [
            { id: "api-logs", label: "API Logs", icon: Activity },
            { id: "user-reports", label: "User Reports", icon: ShieldAlert },
            { id: "global-chats", label: "Global Chats", icon: MessageSquare },
            { id: "safety", label: "Panic Alerts", icon: ShieldAlert },
        ]
    },
    {
        type: "group",
        label: "e-Shop",
        icon: Package,
        children: [
            { id: "products", label: "Products", icon: Package },
            { id: "categories", label: "Categories", icon: ListTree },
        ]
    },
    {
        type: "group",
        label: "Service Ops",
        icon: Briefcase,
        children: [
            { id: "requests", label: "Request Management", icon: ClipboardList },
            { id: "services", label: "Services", icon: Briefcase },
            { id: "sales", label: "Sales & Orders", icon: ShoppingBag },
            { id: "withdrawals", label: "Withdrawals", icon: CreditCard },
            { id: "agents", label: "Agents", icon: UserSquare2 },
            { id: "pending-updates", label: "Pending Updates", icon: Clock },
        ]
    },
    {
        type: "group",
        label: "Portal Management",
        icon: Settings,
        children: [
            { id: "faqs", label: "FAQs", icon: HelpCircle },
            { id: "carousel", label: "Carousel", icon: ImageIcon },
            { id: "landing", label: "Landing Page", icon: LayoutTemplate },
            { id: "cms", label: "Footer CMS", icon: LayoutTemplate },
            { id: "settings", label: "General Settings", icon: Settings },
            { id: "payment-settings", label: "Payment Gateways", icon: CreditCard },
            { id: "legal", label: "Legal", icon: Shield },
        ]
    }
];

const AdminSectionFallback = () => (
    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 320 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, color: 'text.secondary' }}>
            <CircularProgress size={22} />
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
                Loading section...
            </Typography>
        </Box>
    </Box>
);

const AdminDashboard = () => {
    const navigate = useNavigate();
    const { toast } = useToast();
    const [activeTab, setActiveTab] = useState<TabKey>("overview");
    const [adminName, setAdminName] = useState<string>("Admin");
    const [stats, setStats] = useState<any>(null);
    const [recentOrders, setRecentOrders] = useState<any[]>([]);
    const [recentRequests, setRecentRequests] = useState<any[]>([]);
    const [loadingStats, setLoadingStats] = useState(false);

    const renderLazySection = (Component: ComponentType<any>) => (
        <Suspense fallback={<AdminSectionFallback />}>
            <Component />
        </Suspense>
    );

    useEffect(() => {
        const token = localStorage.getItem("adminToken");
        const userStr = localStorage.getItem("adminUser");

        if (!token) {
            navigate("/admin/login");
            return;
        }

        if (userStr) {
            try {
                const user = JSON.parse(userStr);
                setAdminName(user.first_name || user.username || "Admin");
            } catch (e) {
                console.error("Failed to parse admin data:", e);
            }
        }
    }, [navigate]);

    const [pendingRequests, setPendingRequests] = useState([]);

const fetchPending = async () => {
    const res = await apiFetch('/api/admin/pending-profile-updates');
    if (res.success) {
        setPendingRequests(res.data.pending_updates);
    }
};

useEffect(() => {
    fetchPending();
}, []);



    const fetchDashboardData = useCallback(async () => {
        setLoadingStats(true);
        try {
            const adminHeaders = { Authorization: `Bearer ${localStorage.getItem("adminToken")}` };

            const statsRes = await apiFetch("/api/admin/global-stats", { headers: adminHeaders });
            if (statsRes?.success) setStats(statsRes.data);

            const ordersRes = await apiFetch("/api/admin/orders?limit=6", { headers: adminHeaders });
            if (ordersRes?.success) setRecentOrders(ordersRes.data.orders);

            const requestsRes = await apiFetch("/api/admin/requests?limit=6", { headers: adminHeaders });
            if (requestsRes?.success) setRecentRequests(requestsRes.data.requests);
        } catch (error) {
            console.error("Failed to fetch dashboard stats", error);
        } finally {
            setLoadingStats(false);
        }
    }, []);

    useEffect(() => {
        if (activeTab === "overview") {
            fetchDashboardData();
        }
    }, [activeTab, fetchDashboardData]);

    const handleLogout = () => {
        localStorage.removeItem("adminToken");
        localStorage.removeItem("adminUser");
        toast({ title: "Logged Out", description: "You have securely logged out." });
        navigate("/admin/login");
    };

    const renderContent = () => {
        switch (activeTab) {
            case "overview":
                return (
                    <Suspense fallback={<AdminSectionFallback />}>
                        <Overview
                            stats={stats}
                            recentOrders={recentOrders}
                            recentRequests={recentRequests}
                            loading={loadingStats}
                            onRefresh={fetchDashboardData}
                        />
                    </Suspense>
                );
            case "users":
                return renderLazySection(UsersManagement);
            case "requests":
                return renderLazySection(RequestsManagement);
            case "products":
                return renderLazySection(ProductsManagement);
            case "faqs":
                return renderLazySection(FAQManagement);
            case "categories":
                return renderLazySection(CategoriesManagement);
            case "services":
                return renderLazySection(ServicesManagement);
            case "sales":
                return renderLazySection(SalesFinance);
            case "carousel":
                return renderLazySection(CarouselManagement);
            case "landing":
                return renderLazySection(LandingPageManagement);
            case "cms":
            case "legal":
                return renderLazySection(ContentManagement);
            case "settings":
                return renderLazySection(SettingsManagement);
            case "payment-settings":
                return renderLazySection(PaymentSettings);
            case "withdrawals":
                return renderLazySection(WithdrawalsManagement);
            case "agents":
                return renderLazySection(AgentsManagement);
            case "pending-updates":
                return renderLazySection(PendingUpdatesManagement);
            case "affiliates":
                return renderLazySection(AffiliatesManagement);
            case "api-logs":
                return renderLazySection(ApiLogsManagement);
            case "user-reports":
                return renderLazySection(ReportsManagement);
            case "global-chats":
                return renderLazySection(GlobalChatsManagement);
            case "safety":
                return renderLazySection(PanicAlertsPanel);
            default:
                return null;
        }
    };

    return (
        <DashboardLayout
            title={activeTab === "overview" ? "Account Management Overview" : activeTab.replace(/([A-Z])/g, ' $1').replace("-", " ").trim()}
            activeTab={activeTab}
            onTabChange={(tab) => setActiveTab(tab as TabKey)}
            onLogout={handleLogout}
            displayName={adminName}
            role="Administrator"
            navStructure={NAV_STRUCTURE}
        >
            {renderContent()}
        </DashboardLayout>
    );
};


export default AdminDashboard;
