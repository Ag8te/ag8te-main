import { motion } from "framer-motion";
import { useRef } from "react";
import { FileText, ChevronRight, ArrowUp } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Link } from "react-router-dom";

export const TERMS_LAST_UPDATED = "25 February 2026";

export const TERMS_SECTIONS = [
    {
        id: "acceptance",
        title: "Acceptance of Terms",
        content: `By accessing or using the AG8TE platform ("Platform"), website, or any associated mobile applications, you agree to be bound by these Terms of Service ("Terms"). If you do not agree to these Terms, please do not use the Platform.

    These Terms constitute a legally binding agreement between you and AG8TE (Pty) Ltd, a company incorporated in the Republic of South Africa. Use of the Platform is also governed by our Privacy Policy and Cookie Policy, which are incorporated into these Terms by reference.`,
    },
    {
        id: "definitions",
        title: "Definitions",
        content: `"User" means any individual or entity that accesses or uses the Platform.
"Client" means a User who books or requests services through the Platform.
"Service Provider" means a registered professional, driver, tradesperson, or any other person offering services via the Platform.
"Services" means any professional, domestic, transport, or ads service listed on the Platform.
"Booking" means a confirmed reservation of a Service made through the Platform.`,
    },
    {
        id: "eligibility",
        title: "Eligibility & Account Registration",
        content: `You must be at least 18 years of age and legally capable of entering into binding contracts under South African law to use this Platform. By registering, you warrant that all information provided is accurate and complete.

    You are responsible for maintaining the confidentiality of your account credentials. You agree to notify us immediately at support@ag8te.com if you become aware of any unauthorised access to your account.

    AG8TE reserves the right to suspend or terminate any account that provides false information, engages in prohibited conduct, or violates these Terms.`,
    },
    {
        id: "services",
        title: "Service Listings & Bookings",
        content: `AG8TE acts as a ads intermediary connecting Clients with Service Providers. We do not directly provide the services listed and are not a party to contracts entered into between Clients and Service Providers.

    All Service Providers are independently verified through relevant South African regulatory databases including SARS, CIPC, Home Affairs, and SAPS where applicable. However, AG8TE does not guarantee the quality, safety, or legality of any service provided.

    Clients are encouraged to review provider profiles, ratings, and reviews before making a Booking. A Booking is confirmed only upon receipt of a confirmation notification from AG8TE.`,
    },
    {
        id: "payments",
        title: "Payments & Fees",
        content: `All prices displayed on the Platform are in South African Rand (ZAR) and are inclusive of VAT where applicable, in accordance with the Value-Added Tax Act, 89 of 1991.

    Payments are processed through secure third-party payment gateways. AG8TE does not store your full payment card information. A service fee may be charged on transactions, which will be clearly disclosed before checkout.

    Refunds are subject to the individual Service Provider's cancellation policy and, where applicable, the Consumer Protection Act, 68 of 2008 ("CPA"). You have the right to cancel a booking without penalty within five (5) business days for fixed-term service agreements in accordance with the CPA.`,
    },
    {
        id: "cancellations",
        title: "Cancellations & Refunds",
        content: `Clients may cancel a Booking subject to the cancellation policy displayed on the Service Provider's listing. Cancellation fees may apply if a Booking is cancelled within a specified window before the scheduled service time.

    Service Providers who fail to honour a confirmed Booking without adequate notice may be subject to penalties, suspension, or removal from the Platform.

    In the event of a dispute regarding a cancellation, AG8TE's decision following a review of evidence submitted by both parties shall be final, subject to applicable South African consumer protection legislation.`,
    },
    {
        id: "popia",
        title: "Personal Information & POPIA",
        content: `AG8TE collects and processes personal information in accordance with the Protection of Personal Information Act, 4 of 2013 ("POPIA"). By using the Platform, you consent to the collection and processing of your personal information as set out in our Privacy Policy.

    You have the right to access, correct, and request deletion of your personal information held by AG8TE. Please contact our Information Officer at privacy@ag8te.com for any POPIA-related requests.`,
    },
    {
        id: "prohibited",
        title: "Prohibited Conduct",
        content: `You agree not to:
    • Use the Platform for any unlawful purpose or in violation of any South African laws or regulations.
    • Impersonate any person or entity or misrepresent your affiliation with any person or entity.
    • Transmit any viruses, malware, or other harmful code.
    • Engage in fraudulent activity, including submitting false bookings or reviews.
    • Harass, abuse, or harm other Users or Service Providers.
    • Circumvent AG8TE's platform to conduct transactions off-platform to avoid legitimate fees.`,
    },
    {
        id: "liability",
        title: "Limitation of Liability",
        content: `To the maximum extent permitted by South African law, AG8TE shall not be liable for any indirect, incidental, special, or consequential damages arising from your use of the Platform or any services booked through it.

    AG8TE's total liability for any claim arising from these Terms shall not exceed the total fees paid by you through the Platform in the three (3) months preceding the event giving rise to the claim.

    Nothing in these Terms limits our liability for fraud, death, or personal injury caused by our negligence, or for any other liability that cannot be excluded by South African law.`,
    },
    {
        id: "changes",
        title: "Changes to These Terms",
        content: `AG8TE reserves the right to modify these Terms at any time. Material changes will be communicated via email or a prominent notice on the Platform at least fifteen (15) days before they take effect. Continued use of the Platform after such changes constitutes acceptance of the revised Terms.`,
    },
    {
        id: "governing",
        title: "Governing Law & Disputes",
        content: `These Terms are governed by and construed in accordance with the laws of the Republic of South Africa. Any disputes arising from these Terms shall first be referred to mediation. If mediation fails, disputes shall be resolved in the Magistrates' Court or High Court of South Africa having jurisdiction, depending on the amount in dispute.

    For consumer disputes, you may also approach the National Consumer Commission at www.thencc.org.za.`,
    },
    {
        id: "contact",
        title: "Contact Us",
        content: `If you have any questions about these Terms, please contact us at:

    AG8TE (Pty) Ltd
    Email: legal@ag8te.com
    Phone: +27 (0) 11 000 0000
    Address: Johannesburg, Gauteng, South Africa`,
    },
];

const Terms = () => {
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
                            <span className="text-[#222222] font-medium">Terms of Service</span>
                        </div>
                        <div className="flex items-start gap-5">
                            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-lg shadow-primary/20 shrink-0 mt-1">
                                <FileText className="h-7 w-7 text-white" />
                            </div>
                            <div>
                                <h1 className="text-4xl md:text-5xl font-semibold text-[#222222] tracking-tight mb-2">
                                    Terms of Service
                                </h1>
                                <p className="text-slate-500 font-normal">Last updated: {TERMS_LAST_UPDATED}</p>
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
                                {TERMS_SECTIONS.map((s) => (
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
                            {TERMS_SECTIONS.map((s, i) => (
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
                                    {[{ label: "Privacy Policy", to: "/privacy" }, { label: "Cookie Policy", to: "/cookies" }].map(l => (
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

            {/* ── Back to top ─────────────────────────────────────── */}
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

export default Terms;
