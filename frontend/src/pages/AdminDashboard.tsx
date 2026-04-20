import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
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
} from "@mui/icons-material";
import { useToast } from "@/hooks/use-toast";
import { apiFetch } from "@/lib/api";
import { UsersManagement } from "@/components/admin/UsersManagement";
import { RequestsManagement } from "@/components/admin/RequestsManagement";
import { ProductsManagement } from "@/components/admin/ProductsManagement";
import { ContentManagement } from "@/components/admin/ContentManagement";
import { WithdrawalsManagement } from "@/components/admin/WithdrawalsManagement";
import { AgentsManagement } from "@/components/admin/AgentsManagement";
import { PendingUpdatesManagement } from "@/components/admin/PendingUpdatesManagement";
import { SettingsManagement } from "@/components/admin/SettingsManagement";
import { FAQManagement } from "@/components/admin/FAQManagement";
import { CategoriesManagement } from "@/components/admin/CategoriesManagement";
import { ServicesManagement } from "@/components/admin/ServicesManagement";
import { SalesFinance } from "@/components/admin/SalesFinance";
import { CarouselManagement } from "@/components/admin/CarouselManagement";
import { ApiLogsManagement } from "@/components/admin/ApiLogsManagement";
import { ReportsManagement } from "@/components/admin/ReportsManagement";
import { GlobalChatsManagement } from "@/components/admin/GlobalChatsManagement";
import { AffiliatesManagement } from "@/components/admin/AffiliatesManagement";
import { PaymentSettings } from "@/components/admin/PaymentSettings";
import LandingPageManagement from "@/components/admin/LandingPageManagement";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import Overview from "@/components/admin/Overview";

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
    | "landing";

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
        ]
    },
    {
        type: "group",
        label: "Ads",
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

const AdminDashboard = () => {
    const navigate = useNavigate();
    const { toast } = useToast();
    const [activeTab, setActiveTab] = useState<TabKey>("overview");
    const [adminName, setAdminName] = useState<string>("Admin");
    const [stats, setStats] = useState<any>(null);
    const [recentOrders, setRecentOrders] = useState<any[]>([]);
    const [recentRequests, setRecentRequests] = useState<any[]>([]);
    const [loadingStats, setLoadingStats] = useState(false);

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
                    <Overview
                        stats={stats}
                        recentOrders={recentOrders}
                        recentRequests={recentRequests}
                        loading={loadingStats}
                        onRefresh={fetchDashboardData}
                    />
                );
            case "users":
                return <UsersManagement />;
            case "requests":
                return <RequestsManagement />;
            case "products":
                return <ProductsManagement />;
            case "faqs":
                return <FAQManagement />;
            case "categories":
                return <CategoriesManagement />;
            case "services":
                return <ServicesManagement />;
            case "sales":
                return <SalesFinance />;
            case "carousel":
                return <CarouselManagement />;
            case "landing":
                return <LandingPageManagement />;
            case "cms":
            case "legal":
                return <ContentManagement />;
            case "settings":
                return <SettingsManagement />;
            case "payment-settings":
                return <PaymentSettings />;
            case "withdrawals":
                return <WithdrawalsManagement />;
            case "agents":
                return <AgentsManagement />;
            case "pending-updates":
                return <PendingUpdatesManagement />;
            case "affiliates":
                return <AffiliatesManagement />;
            case "api-logs":
                return <ApiLogsManagement />;
            case "user-reports":
                return <ReportsManagement />;
            case "global-chats":
                return <GlobalChatsManagement />;
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

