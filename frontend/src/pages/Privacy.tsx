import { motion } from "framer-motion";
import { useRef } from "react";
import { ShieldCheck, ChevronRight, ArrowUp } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Link } from "react-router-dom";

export const PRIVACY_LAST_UPDATED = "25 February 2026";

export const PRIVACY_SECTIONS = [
    {
        id: "introduction",
        title: "Introduction",
        content: `MzansiServe (Pty) Ltd ("MzansiServe", "we", "us", or "our") is committed to protecting your personal information in accordance with the Protection of Personal Information Act, 4 of 2013 ("POPIA") and all other applicable South African data protection laws.

    This Privacy Policy explains what personal information we collect, how we use it, who we share it with, and what rights you have regarding your information. Please read it carefully alongside our Terms of Service and Cookie Policy.`,
    },
    {
        id: "information-we-collect",
        title: "Information We Collect",
        content: `We collect the following categories of personal information:

    Identity & Contact Information: Full name, email address, phone number, physical address, and identity number (where required for verification).

    Account Information: Username, password (encrypted), role, and profile image.

    Service & Booking Information: Details of services requested or provided, booking history, and payment transactions.

    Verification Data: Qualifications, certifications, SARS tax number, CIPC registration details, and other regulatory compliance documents from Service Providers.

    Usage & Device Data: IP address, browser type, device identifiers, pages visited, time spent on the Platform, and referral URLs.

    Location Data: General or precise location information when you use transport or location-based features, with your consent.

    Communications: Records of your correspondence with us or other Users through the Platform.`,
    },
    {
        id: "lawful-basis",
        title: "Lawful Basis for Processing",
        content: `Under POPIA, we process your personal information on the following lawful grounds:

    • Contractual necessity: To create and manage your account and facilitate bookings.
    • Legal obligation: To comply with South African tax, financial, and regulatory requirements.
    • Legitimate interest: To improve our Platform, prevent fraud, and ensure platform safety.
    • Consent: For marketing communications and non-essential cookies (which you may withdraw at any time).`,
    },
    {
        id: "how-we-use",
        title: "How We Use Your Information",
        content: `We use your personal information to:

    • Create and manage your MzansiServe account.
    • Facilitate and confirm service bookings between Clients and Service Providers.
    • Process payments and issue invoices or receipts.
    • Verify Service Provider credentials and qualifications.
    • Communicate with you about your bookings, account, and the Platform.
    • Send marketing and promotional communications (only with your consent).
    • Detect, investigate, and prevent fraud and other illegal activities.
    • Improve, personalise, and develop the Platform and its features.
    • Comply with applicable South African laws and court orders.`,
    },
    {
        id: "sharing",
        title: "Sharing Your Information",
        content: `We do not sell your personal information. We may share it with:

    Service Providers: We share relevant Client information (name, contact details, booking details) with the Service Provider you book.

    Payment Processors: Secure third-party payment gateways (e.g. PayFast, Peach Payments) who process your payments under their own privacy policies.

    Verification Partners: Government databases and regulatory bodies such as SARS, CIPC, Home Affairs, and SAPS for Service Provider verification.

    Technology Partners: Cloud hosting, analytics, and support tool providers who access data only as necessary to deliver their services and are bound by data processing agreements.

    Legal Authorities: Where required by South African law, court order, or to protect the rights, property, or safety of MzansiServe, its users, or the public.`,
    },
    {
        id: "retention",
        title: "Data Retention",
        content: `We retain your personal information for as long as:
    • Your account is active and for a period after deletion as required by law.
    • Required to fulfil the purposes described in this Policy.
    • Required to comply with our legal obligations under South African law (e.g. SARS requires financial records to be kept for five years).

    When we no longer need your data, we securely delete or anonymise it.`,
    },
    {
        id: "your-rights",
        title: "Your Rights Under POPIA",
        content: `As a data subject under POPIA, you have the right to:

    • Access: Know what personal information we hold about you and receive a copy.
    • Correction: Request that we correct inaccurate or incomplete personal information.
    • Deletion: Request deletion of your personal information, subject to legal obligations.
    • Objection: Object to the processing of your personal information in certain circumstances.
    • Withdrawal of Consent: Withdraw consent for marketing or non-essential processing at any time.
    • Complaints: Lodge a complaint with the Information Regulator of South Africa at inforeg.org.za.

    To exercise any of these rights, contact our Information Officer at: privacy@mzansiserve.co.za`,
    },
    {
        id: "security",
        title: "Security",
        content: `We implement appropriate technical and organisational security measures to protect your personal information against unauthorised access, loss, destruction, or alteration. These include encryption in transit (TLS), encrypted storage for sensitive data, access controls, and regular security assessments.

    However, no internet transmission is entirely secure. You are responsible for keeping your account credentials confidential and for notifying us immediately of any suspected breach.`,
    },
    {
        id: "cross-border",
        title: "Cross-Border Transfers",
        content: `Some of our technology partners may be located outside South Africa. Where we transfer personal information outside of South Africa, we do so only to countries or recipients that provide adequate levels of protection, or with appropriate safeguards in place as required by POPIA section 72.`,
    },
    {
        id: "children",
        title: "Children's Privacy",
        content: `The Platform is not intended for use by persons under the age of 18. We do not knowingly collect personal information from minors. If you believe we have inadvertently collected information from a child, please contact us immediately and we will delete it.`,
    },
    {
        id: "changes-privacy",
        title: "Changes to This Policy",
        content: `We may update this Privacy Policy from time to time. Material changes will be communicated via email or a prominent notice on the Platform. The "Last Updated" date at the top of this page reflects the most recent revision. Continued use of the Platform after changes constitutes your acceptance of the revised Policy.`,
    },
    {
        id: "contact-privacy",
        title: "Contact & Information Officer",
        content: `If you have any questions or concerns about this Privacy Policy or how we handle your personal information, please contact our Information Officer:

    Information Officer, MzansiServe (Pty) Ltd
    Email: privacy@mzansiserve.co.za
    Phone: +27 (0) 11 000 0000
    Address: Johannesburg, Gauteng, South Africa

    You also have the right to lodge a complaint with the Information Regulator of South Africa:
    Website: inforeg.org.za
    Email: inforeg@justice.gov.za`,
    },
];

const Privacy = () => {
    const contentRef = useRef<HTMLDivElement>(null);

    const scrollToSection = (id: string) => {
        document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
    };

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
                            <span className="text-[#222222] font-medium">Privacy Policy</span>
                        </div>
                        <div className="flex items-start gap-5">
                            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-lg shadow-primary/20 shrink-0 mt-1">
                                <ShieldCheck className="h-7 w-7 text-white" />
                            </div>
                            <div>
                                <h1 className="text-4xl md:text-5xl font-semibold text-[#222222] tracking-tight mb-2">
                                    Privacy Policy
                                </h1>
                                <p className="text-slate-500 font-normal">Last updated: {PRIVACY_LAST_UPDATED} · Aligned with POPIA</p>
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
                                {PRIVACY_SECTIONS.map((s) => (
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
                            {PRIVACY_SECTIONS.map((s, i) => (
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
                                    {[{ label: "Terms of Service", to: "/terms" }, { label: "Cookie Policy", to: "/cookies" }].map(l => (
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

export default Privacy;
