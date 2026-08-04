import { motion } from "framer-motion";
import { useRef } from "react";
import { Cookie, ChevronRight, ArrowUp } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Link } from "react-router-dom";

const LAST_UPDATED = "25 February 2026";

const cookieTypes = [
    {
        name: "Essential Cookies",
        required: true,
        purpose: "These cookies are strictly necessary for the Platform to function and cannot be switched off. They are set in response to actions you take, such as logging in, filling forms, or setting your privacy preferences.",
        examples: "Session authentication, CSRF protection tokens, load balancing.",
        retention: "Session or up to 24 hours.",
    },
    {
        name: "Analytics Cookies",
        required: false,
        purpose: "These cookies help us understand how visitors interact with the Platform by collecting and reporting information anonymously. This helps us improve our service.",
        examples: "Google Analytics (_ga, _gid), page view tracking, feature usage heatmaps.",
        retention: "Up to 2 years.",
    },
    {
        name: "Functional Cookies",
        required: false,
        purpose: "These cookies enable enhanced functionality and personalisation, such as remembering your language or location preferences, and providing you with a more tailored experience.",
        examples: "Language preference, last-used location, dark/light mode setting.",
        retention: "Up to 12 months.",
    },
    {
        name: "Marketing & Targeting Cookies",
        required: false,
        purpose: "These cookies are set through our advertising partners to build a profile of your interests and show you relevant adverts on other sites. They do not store personal information directly but identify your browser and device uniquely.",
        examples: "Google Ads, Meta Pixel, retargeting identifiers.",
        retention: "Up to 90 days.",
    },
];

const sections = [
    {
        id: "what-are-cookies",
        title: "What Are Cookies?",
        content: `Cookies are small text files that are stored on your device (computer, smartphone, or tablet) when you visit a website. They allow websites to recognise your device on subsequent visits, remember your preferences, and provide a more seamless user experience.

    Cookies can be "session cookies" (deleted when you close your browser) or "persistent cookies" (stored on your device for a set period or until you delete them). They can be set by the website you are visiting ("first-party cookies") or by third-party services embedded on the site ("third-party cookies").`,
    },
    {
        id: "why-we-use",
        title: "Why We Use Cookies",
        content: `AG8TE uses cookies and similar technologies to:

    • Keep you signed in to your account securely.
    • Remember your preferences and settings.
    • Understand how you use our Platform so we can improve it.
    • Personalise your experience based on your location and activity.
    • Measure the effectiveness of our marketing campaigns.
    • Prevent fraud and enhance security.`,
    },
    {
        id: "types",
        title: "Types of Cookies We Use",
        content: `See the detailed cookie table below for a breakdown of each category, its purpose, and retention period.`,
    },
    {
        id: "popia-consent",
        title: "Consent Under POPIA",
        content: `In accordance with the Protection of Personal Information Act, 4 of 2013 ("POPIA"), we only set non-essential cookies (analytics, functional, and marketing) with your explicit consent, obtained through our Cookie Consent banner when you first visit the Platform.

    You may withdraw or change your cookie preferences at any time by clicking the "Cookie Settings" link in the footer of our website. Withdrawing consent will not affect the lawfulness of any processing carried out before withdrawal.`,
    },
    {
        id: "third-party",
        title: "Third-Party Cookies",
        content: `Some features of the Platform involve third-party services that may set their own cookies. These include:

    • Google Analytics & Google Ads (Google LLC): Analytics and advertising. Privacy policy at policies.google.com/privacy
    • Meta Pixel (Meta Platforms Inc.): Advertising and retargeting. Privacy policy at www.facebook.com/privacy/policy
    • PayFast / Peach Payments: Payment processing cookies for fraud prevention and session management.

    We do not control these third-party cookies. Please refer to the respective third-party privacy policies for more information.`,
    },
    {
        id: "managing",
        title: "Managing & Disabling Cookies",
        content: `You can manage cookies through your browser settings. Most modern browsers allow you to:

    • View, block, or delete cookies.
    • Set preferences for specific websites.
    • Block third-party cookies.

    Please note that disabling certain cookies may affect the functionality of the Platform. Instructions for managing cookies in popular browsers:

    • Google Chrome: Settings → Privacy and Security → Cookies and other site data
    • Mozilla Firefox: Settings → Privacy & Security → Cookies and Site Data
    • Safari: Preferences → Privacy → Manage Website Data
    • Microsoft Edge: Settings → Cookies and site permissions`,
    },
    {
        id: "do-not-track",
        title: "Do Not Track",
        content: `Some browsers include a "Do Not Track" (DNT) feature that sends a signal to websites requesting that your browsing not be tracked. The Platform currently does not respond to DNT signals, as there is no industry-wide standard for how these signals should be interpreted. We will update this Policy if this changes.`,
    },
    {
        id: "changes-cookies",
        title: "Changes to This Cookie Policy",
        content: `We may update this Cookie Policy from time to time to reflect changes in technology, legislation, or our business practices. Material changes will be communicated via a notice on the Platform. The "Last Updated" date at the top of this page reflects the most recent revision.`,
    },
    {
        id: "contact-cookies",
        title: "Contact Us",
        content: `If you have any questions about how we use cookies, please contact us:

    AG8TE (Pty) Ltd
    Email: privacy@ag8te.com
    Phone: +27 (0) 11 000 0000

    You may also lodge a complaint with the Information Regulator of South Africa at inforeg.org.za.`,
    },
];

const Cookies = () => {
    const contentRef = useRef<HTMLDivElement>(null);
    const scrollToSection = (id: string) =>
        document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });

    return (
        <main className="min-h-screen bg-white">
            <Navbar />

            {/* ── Hero header ─────────────────────────────────────── */}
            <section className="pt-32 pb-12 bg-white relative overflow-hidden">
                <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg width=\'6\' height=\'6\' viewBox=\'0 0 6 6\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'%23E5E7EB\' fill-opacity=\'0.5\'%3E%3Cpath d=\'M5 0h1L0 6V5zM6 5v1H5z\'/%3E%3C/g%3E%3C/svg%3E')] opacity-60" />
                <div className="container mx-auto px-6 relative z-10 max-w-5xl">
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                        <div className="flex items-center gap-2 text-sm text-slate-400 mb-6">
                            <Link to="/" className="hover:text-primary transition-colors">Home</Link>
                            <ChevronRight size={14} />
                            <span className="text-[#222222] font-medium">Cookie Policy</span>
                        </div>
                        <div className="flex items-start gap-5">
                            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-lg shadow-primary/20 shrink-0 mt-1">
                                <Cookie className="h-7 w-7 text-white" />
                            </div>
                            <div>
                                <h1 className="text-4xl md:text-5xl font-semibold text-[#222222] tracking-tight mb-2">
                                    Cookie Policy
                                </h1>
                                <p className="text-slate-500 font-normal">Last updated: {LAST_UPDATED} · Aligned with POPIA</p>
                            </div>
                        </div>
                    </motion.div>
                </div>
            </section>

            {/* ── Body ────────────────────────────────────────────── */}
            <section className="bg-slate-50 border-t border-slate-100 py-16">
                <div className="container mx-auto px-6 max-w-5xl">
                    <div className="flex flex-col lg:flex-row gap-12">

                        {/* ── Sticky ToC ──────────────────────────────── */}
                        <aside className="hidden lg:block shrink-0 w-56">
                            <div className="sticky top-28 space-y-1">
                                <p className="text-[11px] font-medium text-slate-400 uppercase tracking-[0.15em] mb-4">Contents</p>
                                {sections.map((s) => (
                                    <button
                                        key={s.id}
                                        onClick={() => scrollToSection(s.id)}
                                        className="w-full text-left px-3 py-2 rounded-xl text-[13px] text-slate-600 hover:text-primary hover:bg-white transition-all font-normal"
                                    >
                                        {s.title}
                                    </button>
                                ))}
                            </div>
                        </aside>

                        {/* ── Content ─────────────────────────────────── */}
                        <div ref={contentRef} className="flex-1 space-y-8">

                            {/* ── Cookie types table ────────────────────── */}
                            <motion.div
                                initial={{ opacity: 0, y: 16 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                className="bg-white rounded-2xl p-8 shadow-sm border border-slate-100"
                            >
                                <h2 className="text-lg font-semibold text-[#222222] mb-6">Cookie Categories</h2>
                                <div className="space-y-4">
                                    {cookieTypes.map((ct) => (
                                        <div key={ct.name} className="rounded-xl border border-slate-100 p-5 hover:border-primary/20 transition-colors">
                                            <div className="flex items-center justify-between mb-3">
                                                <h3 className="font-semibold text-[#222222] text-[15px]">{ct.name}</h3>
                                                <span className={`text-[11px] font-medium px-3 py-1 rounded-full ${ct.required ? "bg-primary/10 text-primary" : "bg-slate-100 text-slate-500"}`}>
                                                    {ct.required ? "Essential" : "Optional"}
                                                </span>
                                            </div>
                                            <p className="text-sm text-slate-600 font-normal mb-2">{ct.purpose}</p>
                                            <p className="text-[12px] text-slate-400 font-normal">
                                                <span className="font-medium text-slate-500">Examples: </span>{ct.examples}
                                            </p>
                                            <p className="text-[12px] text-slate-400 font-normal mt-1">
                                                <span className="font-medium text-slate-500">Retention: </span>{ct.retention}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            </motion.div>

                            {/* ── Text sections ─────────────────────────── */}
                            {sections.map((s, i) => (
                                <motion.div
                                    key={s.id}
                                    id={s.id}
                                    initial={{ opacity: 0, y: 16 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    viewport={{ once: true, margin: "-40px" }}
                                    transition={{ delay: i * 0.03, duration: 0.4 }}
                                    className="bg-white rounded-2xl p-8 shadow-sm border border-slate-100 scroll-mt-28"
                                >
                                    <h2 className="text-lg font-semibold text-[#222222] mb-4 flex items-center gap-3">
                                        <span className="w-7 h-7 rounded-full bg-primary/10 text-primary text-[11px] font-semibold flex items-center justify-center shrink-0">
                                            {i + 1}
                                        </span>
                                        {s.title}
                                    </h2>
                                    <div className="text-[15px] text-slate-600 font-normal leading-relaxed whitespace-pre-line">
                                        {s.content}
                                    </div>
                                </motion.div>
                            ))}

                            {/* ── Related links ─────────────────────────── */}
                            <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-primary/5 rounded-2xl p-8 border border-primary/10">
                                <p className="text-sm font-medium text-[#222222] mb-4">Related Policies</p>
                                <div className="flex flex-wrap gap-3">
                                    {[{ label: "Terms of Service", to: "/terms" }, { label: "Privacy Policy", to: "/privacy" }].map(l => (
                                        <Link key={l.to} to={l.to}
                                            className="px-5 py-2.5 bg-white rounded-xl text-sm font-medium text-primary border border-primary/20 hover:border-primary/40 hover:shadow-sm transition-all">
                                            {l.label}
                                        </Link>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <button
                onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
                className="fixed bottom-8 right-8 w-10 h-10 bg-white border border-slate-200 rounded-full shadow-lg flex items-center justify-center text-slate-500 hover:text-primary hover:border-primary/30 transition-all z-50"
            >
                <ArrowUp size={16} />
            </button>

            <Footer />
        </main>
    );
};

export default Cookies;
