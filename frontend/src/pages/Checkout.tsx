import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, CreditCard, Lock, Check, ShieldCheck, ChevronRight,Navigation,Loader2 } from "lucide-react";
import { useJsApiLoader } from "@react-google-maps/api";
import { getCurrentLocationAddress } from "@/lib/locationUtils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCart } from "@/contexts/CartContext";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { apiFetch } from "@/lib/api";
import { cn } from "@/lib/utils";

const LIBRARIES: ("places")[] = ["places"];
const GOOGLE_MAPS_API_KEY = "AIzaSyBtXh26PcILBqis4Ad66wPetvU_wUKMNRs";

const Checkout = () => {
    const { items, total, count, clearCart } = useCart();
    const { user } = useAuth();
    const navigate = useNavigate();
    const { toast } = useToast();
    const [isProcessing, setIsProcessing] = useState(false);
    const [selectedProvider, setSelectedProvider] = useState<"paypal" | "yoco">("yoco");
    const [enabledGateways, setEnabledGateways] = useState<{paypal: boolean, yoco: boolean}>({ paypal: true, yoco: true });
    const [isLocating, setIsLocating] = useState(false);

    const { isLoaded } = useJsApiLoader({
        id: 'google-map-script',
        googleMapsApiKey: GOOGLE_MAPS_API_KEY,
        libraries: LIBRARIES,
    });

    useEffect(() => {
        const fetchGateways = async () => {
            try {
                const response = await apiFetch("/api/public/payment-gateways");
                if (response.success && response.data) {
                    const gateways = {
                        paypal: response.data.paypal?.enabled ?? false,
                        yoco: response.data.yoco?.enabled ?? false
                    };
                    setEnabledGateways(gateways);
                    
                    // Set default selection based on what's enabled
                    if (!gateways.paypal && gateways.yoco) {
                        setSelectedProvider("yoco");
                    } else if (gateways.paypal && !gateways.yoco) {
                        setSelectedProvider("paypal");
                    } else if (gateways.paypal && gateways.yoco) {
                        // If both are enabled, default to paypal or keep current if already set
                        setSelectedProvider("paypal");
                    } else {
                        // If neither is enabled, clear selection or handle as needed
                        setSelectedProvider(null); // Or some default "none" state
                    }
                }
            } catch (error) {
                console.error("Failed to fetch payment gateways:", error);
            }
        };
        fetchGateways();
    }, []);

    const [formData, setFormData] = useState({
        firstName: user?.name ? user.name.split(" ")[0] : "",
        lastName: user?.name && user.name.includes(" ") ? user.name.split(" ").slice(1).join(" ") : "",
        email: user?.email || "",
        phone: user?.phone || "",
        address: "",
        city: "",
        postalCode: "",
    });

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };
    const validateForm = (): boolean => {
        const { firstName, lastName, email, phone, address, city, postalCode } = formData;

        if (!firstName.trim() || firstName.trim().length < 2) {
            toast({ variant: "destructive", title: "Invalid First Name", description: "First name must be at least 2 characters." });
            return false;
        }
        if (!lastName.trim() || lastName.trim().length < 2) {
            toast({ variant: "destructive", title: "Invalid Last Name", description: "Last name must be at least 2 characters." });
            return false;
        }
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!email.trim() || !emailRegex.test(email.trim())) {
            toast({ variant: "destructive", title: "Invalid Email", description: "Please enter a valid email address." });
            return false;
        }
        const phoneRegex = /^0[0-9]{9}$/;
        if (!phone.trim() || !phoneRegex.test(phone.trim().replace(/\s/g, ''))) {
            toast({ variant: "destructive", title: "Invalid Phone Number", description: "Please enter a valid 10-digit SA phone number starting with 0." });
            return false;
        }
        if (!address.trim() || address.trim().length < 5) {
            toast({ variant: "destructive", title: "Invalid Address", description: "Please enter a valid street address." });
            return false;
        }
        if (!city.trim() || city.trim().length < 2) {
            toast({ variant: "destructive", title: "Invalid City", description: "Please enter a valid city name." });
            return false;
        }
        const postalRegex = /^[0-9]{4}$/;
        if (!postalCode.trim() || !postalRegex.test(postalCode.trim())) {
            toast({ variant: "destructive", title: "Invalid Postal Code", description: "Please enter a valid 4-digit SA postal code." });
            return false;
        }
        return true;
    };
    const handleCheckout = async (e: React.FormEvent) => {
        e.preventDefault();
        if (items.length === 0) {
            toast({ title: "Cart is empty", description: "Add some items before checking out.", variant: "destructive" });
            return;
        }
        if (!validateForm()) return;
        setIsProcessing(true);

        try {
            const response = await apiFetch("/api/payments/create-order", {
                method: "POST",
                data: {
                    items: items.map(item => ({
                        product_id: item.product.id,
                        product_name: item.product.name,
                        price: item.product.price,
                        image_url: item.product.image,
                        quantity: item.quantity,
                    })),
                    shipping_address: `${formData.address}, ${formData.city}, ${formData.postalCode}`,
                    total: total,
                    provider: selectedProvider
                }
            });

            if (response.success && response.data?.redirect_url) {
                // Force redirection to payment gateway
                window.location.href = response.data.redirect_url;
            } else {
                toast({ 
                    title: "Checkout Failed", 
                    description: response.message || "Could not initialize payment. Please try again.", 
                    variant: "destructive" 
                });
            }
        } catch (error: any) {
            console.error("Checkout error:", error);
            toast({
                title: "Payment Error",
                description: error.message || "An unexpected error occurred during checkout.",
                variant: "destructive",
            });
        } finally {
            setIsProcessing(false);
        }
    };

    const handleUseCurrentLocation = () => {
      getCurrentLocationAddress(
        (address, city, _coords, postalCode) => {
          setFormData(prev => ({ ...prev, address, city, postalCode }));
        },
        (title, description) => toast({ variant: "destructive", title, description }),
        setIsLocating,
        'full_address'
      );
    };

    return (
        <main className="min-h-screen bg-white flex flex-col">
            <Navbar />

            {/* ── Page header ── */}
            <section className="pt-32 pb-12 bg-white relative overflow-hidden border-b border-slate-50">
                <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg width=\'6\' height=\'6\' viewBox=\'0 0 6 6\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'%23EEF2FF\' fill-opacity=\'1\'%3E%3Cpath d=\'M5 0h1L0 6V5zM6 5v1H5z\'/%3E%3C/g%3E%3C/svg%3E')] opacity-70" />
                <div className="container mx-auto px-6 max-w-7xl relative z-10">
                    <Button
                        variant="ghost"
                        onClick={() => navigate(-1)}
                        className="mb-8 -ml-4 gap-2 text-slate-400 hover:text-primary font-bold transition-colors"
                    >
                        <ArrowLeft className="h-5 w-5" /> Back to Cart
                    </Button>
                    <h1 className="text-4xl md:text-5xl font-bold text-[#222222] tracking-tight">Checkout</h1>
                </div>
            </section>

            <div className="flex-1 bg-white">
                <div className="container mx-auto px-6 py-12 max-w-7xl">
                    <div className="grid gap-12 lg:grid-cols-12">
                        {/* Checkout Form */}
                        <div className="lg:col-span-8 space-y-12">
                            <div className="rounded-[2.5rem] bg-white p-8 sm:p-12 shadow-2xl shadow-slate-200/60 border border-slate-50">
                                <h2 className="mb-10 text-2xl font-bold text-[#222222]">Contact & Shipping</h2>
                                <form id="checkout-form" onSubmit={handleCheckout} className="space-y-10">
                                    <div className="grid gap-8 sm:grid-cols-2">
                                        <div className="relative group">
                                            <Label htmlFor="firstName" className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3 ml-1">First Name</Label>
                                            <Input
                                                id="firstName"
                                                name="firstName"
                                                value={formData.firstName}
                                                onChange={handleInputChange}
                                                required
                                                disabled={isProcessing}
                                                className="h-16 px-6 bg-slate-50 rounded-2xl border-transparent focus:bg-white focus:border-primary/20 outline-none text-[#222222] font-medium text-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                            />
                                        </div>
                                        <div className="relative group">
                                            <Label htmlFor="lastName" className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3 ml-1">Last Name</Label>
                                            <Input
                                                id="lastName"
                                                name="lastName"
                                                value={formData.lastName}
                                                onChange={handleInputChange}
                                                required
                                                disabled={isProcessing}
                                                className="h-16 px-6 bg-slate-50 rounded-2xl border-transparent focus:bg-white focus:border-primary/20 outline-none text-[#222222] font-medium text-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                            />
                                        </div>
                                    </div>

                                    <div className="grid gap-8 sm:grid-cols-2">
                                        <div className="relative group">
                                            <Label htmlFor="email" className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3 ml-1">Email</Label>
                                            <Input
                                                id="email"
                                                name="email"
                                                type="email"
                                                value={formData.email}
                                                onChange={handleInputChange}
                                                required
                                                disabled={isProcessing}
                                                className="h-16 px-6 bg-slate-50 rounded-2xl border-transparent focus:bg-white focus:border-primary/20 outline-none text-[#222222] font-medium text-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                            />
                                        </div>
                                        <div className="relative group">
                                            <Label htmlFor="phone" className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3 ml-1">Phone Number</Label>
                                            <Input
                                                id="phone"
                                                name="phone"
                                                type="tel"
                                                value={formData.phone}
                                                onChange={handleInputChange}
                                                required
                                                disabled={isProcessing}
                                                className="h-16 px-6 bg-slate-50 rounded-2xl border-transparent focus:bg-white focus:border-primary/20 outline-none text-[#222222] font-medium text-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                            />
                                        </div>
                                    </div>

                                    <div className="relative group">
                                        <Label htmlFor="address" className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3 ml-1">Street Address</Label>
                                        <div className="relative">
                                        <Input
                                            id="address"
                                            name="address"
                                            value={formData.address}
                                            onChange={handleInputChange}
                                            required
                                            disabled={isProcessing}
                                            placeholder="123 Main St"
                                            className="h-16 px-6 pr-14 bg-slate-50 rounded-2xl border-transparent focus:bg-white focus:border-primary/20 outline-none text-[#222222] font-medium text-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                        />
                                        <button
                                            type="button"
                                            onClick={handleUseCurrentLocation}
                                            className="absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded-xl text-slate-400 hover:text-primary hover:bg-primary/10 transition-all z-10"
                                            title="Use current location"
                                          >
                                            {isLocating
                                             ? <Loader2 className="h-5 w-5 animate-spin" /> 
                                             : <Navigation className="h-5 w-5" />
                                            }
                                          </button>
                                        </div>
                                    </div>

                                    <div className="grid gap-8 sm:grid-cols-2">
                                        <div className="relative group">
                                            <Label htmlFor="city" className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3 ml-1">City</Label>
                                            <Input
                                                id="city"
                                                name="city"
                                                value={formData.city}
                                                onChange={handleInputChange}
                                                required
                                                disabled={isProcessing}
                                                className="h-16 px-6 bg-slate-50 rounded-2xl border-transparent focus:bg-white focus:border-primary/20 outline-none text-[#222222] font-medium text-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                            />
                                        </div>
                                        <div className="relative group">
                                            <Label htmlFor="postalCode" className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3 ml-1">Postal Code</Label>
                                            <Input
                                                id="postalCode"
                                                name="postalCode"
                                                value={formData.postalCode}
                                                onChange={handleInputChange}
                                                required
                                                disabled={isProcessing}
                                                className="h-16 px-6 bg-slate-50 rounded-2xl border-transparent focus:bg-white focus:border-primary/20 outline-none text-[#222222] font-medium text-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                            />
                                        </div>
                                    </div>
                                </form>
                            </div>

                            {/* Payment Info Box */}
                            <div className="rounded-[2.5rem] bg-white p-8 sm:p-12 shadow-2xl shadow-slate-200/60 border border-slate-50">
                                <div className="flex items-center gap-4 mb-8">
                                    <div className="h-12 w-12 bg-primary/10 rounded-2xl flex items-center justify-center text-primary">
                                        <CreditCard className="h-6 w-6" />
                                    </div>
                                    <h2 className="text-2xl font-bold text-[#222222]">Select Payment Method</h2>
                                </div>
                                
                                <div className="grid gap-6 sm:grid-cols-2 mb-10">
                                    {enabledGateways.paypal && (
                                        <div 
                                            onClick={() => setSelectedProvider("paypal")}
                                            className={cn(
                                                "relative overflow-hidden cursor-pointer rounded-2xl border-2 p-6 transition-all",
                                                selectedProvider === "paypal" 
                                                    ? "border-primary bg-primary/5 shadow-md ring-1 ring-primary/20" 
                                                    : "border-slate-100 hover:border-slate-200 bg-white"
                                            )}
                                        >
                                            <div className="flex items-center justify-between mb-4">
                                                <div className="h-10 w-24 bg-contain bg-no-repeat bg-left" 
                                                    style={{ backgroundImage: "url('https://www.paypalobjects.com/webstatic/mktg/logo/pp_cc_mark_111x69.jpg')" }} 
                                                />
                                                {selectedProvider === "paypal" && (
                                                    <div className="h-6 w-6 bg-primary rounded-full flex items-center justify-center">
                                                        <Check className="h-3.5 w-3.5 text-white" strokeWidth={3} />
                                                    </div>
                                                )}
                                            </div>
                                            <p className="text-base font-bold text-[#222222]">PayPal / Card</p>
                                            <p className="text-xs text-slate-500 font-medium mt-1">International & Local methods</p>
                                        </div>
                                    )}

                                    {enabledGateways.yoco && (
                                        <div 
                                            onClick={() => setSelectedProvider("yoco")}
                                            className={cn(
                                                "relative overflow-hidden cursor-pointer rounded-2xl border-2 p-6 transition-all",
                                                selectedProvider === "yoco" 
                                                    ? "border-primary bg-primary/5 shadow-md ring-1 ring-primary/20" 
                                                    : "border-slate-100 hover:border-slate-200 bg-white"
                                            )}
                                        >
                                            <div className="flex items-center justify-between mb-4">
                                                <div className="h-8 w-16 bg-contain bg-no-repeat bg-left" 
                                                    style={{ backgroundImage: "url('https://cdn.yoco.com/images/yoco-logo-dark.svg')" }} 
                                                />
                                                {selectedProvider === "yoco" && (
                                                    <div className="h-6 w-6 bg-primary rounded-full flex items-center justify-center">
                                                        <Check className="h-3.5 w-3.5 text-white" strokeWidth={3} />
                                                    </div>
                                                )}
                                            </div>
                                            <p className="text-base font-bold text-[#222222]">Yoco</p>
                                            <p className="text-xs text-slate-500 font-medium mt-1">Local SA Cards / Instant EFT</p>
                                        </div>
                                    )}

                                    {!enabledGateways.paypal && !enabledGateways.yoco && (
                                        <div className="col-span-full p-6 bg-slate-50 rounded-2xl border border-slate-100 text-center">
                                            <p className="text-slate-500 font-medium">No payment methods currently available.</p>
                                        </div>
                                    )}
                                </div>

                                <div className="flex items-center gap-3 text-sm font-bold text-emerald-600 bg-emerald-50 p-6 rounded-2xl border border-emerald-100">
                                    <ShieldCheck className="h-6 w-6" />
                                    <span>Your payment information is encrypted and secure.</span>
                                </div>
                            </div>
                        </div>

                        {/* Order Summary */}
                        <div className="lg:col-span-4">
                            <div className="sticky top-28 rounded-[2.5rem] bg-white p-8 shadow-2xl shadow-slate-200/60 border border-slate-50 space-y-8">
                                <h3 className="text-xl font-bold text-[#222222] border-b border-slate-50 pb-6">Order Summary</h3>

                                <div className="max-h-80 overflow-y-auto pr-2 space-y-6">
                                    {items.length === 0 ? (
                                        <p className="text-base text-slate-400 text-center py-8">Your cart is empty</p>
                                    ) : (
                                        items.map((item) => (
                                            <div key={item.product.id} className="flex items-center gap-4">
                                                <div className="h-16 w-16 flex-shrink-0 overflow-hidden rounded-2xl border border-slate-50 bg-slate-50 shadow-inner">
                                                    <img
                                                        src={item.product.image}
                                                        alt={item.product.name}
                                                        className="h-full w-full object-cover"
                                                    />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-base font-bold text-[#222222] truncate">{item.product.name}</p>
                                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-0.5">Qty: {item.quantity}</p>
                                                </div>
                                                <div className="text-base font-bold text-[#222222]">R{item.product.price * item.quantity}</div>
                                            </div>
                                        ))
                                    )}
                                </div>

                                <div className="space-y-4 border-t border-slate-50 pt-6">
                                    <div className="flex justify-between text-base font-medium text-slate-400">
                                        <span>Subtotal ({count} items)</span>
                                        <span className="text-[#222222]">R{total.toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between text-base font-medium text-slate-400">
                                        <span>Shipping</span>
                                        <span className="text-primary italic">Calculated soon</span>
                                    </div>
                                </div>

                                <div className="flex justify-between items-center border-t border-slate-50 pt-6">
                                    <span className="text-xl font-bold text-[#222222]">Total</span>
                                    <span className="text-3xl font-black text-primary">R{total.toFixed(2)}</span>
                                </div>

                                <Button
                                    type="submit"
                                    form="checkout-form"
                                    className="w-full h-16 rounded-2xl bg-primary text-white font-bold text-xl shadow-lg hover:shadow-primary/20 transition-all hover:-translate-y-1"
                                    disabled={items.length === 0 || isProcessing}
                                >
                                    {isProcessing ? (
                                        <div className="flex items-center gap-2">
                                            <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                            <span>Processing...</span>
                                        </div>
                                    ) : (
                                        <div className="flex items-center justify-center gap-2 text-xl font-bold">
                                            <Lock className="h-6 w-6" strokeWidth={2.5} />
                                            <span>Pay R{total.toFixed(2)}</span>
                                        </div>
                                    )}
                                </Button>

                                <div className="flex items-center justify-center gap-2 pt-4">
                                    <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                        <Check className="h-3 w-3 text-emerald-500" strokeWidth={3} />
                                        Secure 256-bit SSL encryption
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <Footer />
        </main>
    );
};

export default Checkout;
