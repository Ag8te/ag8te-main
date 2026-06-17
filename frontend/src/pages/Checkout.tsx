import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Check,
  CreditCard,
  Loader2,
  Lock,
  Navigation,
  ShieldCheck,
  Truck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useCart } from "@/contexts/CartContext";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { apiFetch } from "@/lib/api";
import { getCurrentLocationAddress } from "@/lib/locationUtils";
import { openExternalUrl } from "@/lib/native";
import { cn } from "@/lib/utils";

type ShippingQuote = {
  quote_id: string;
  carrier: string;
  service_level_code?: string | null;
  service_name: string;
  amount: number;
  base_amount?: number;
  markup_amount?: number;
  currency?: string;
  estimated_days?: number | null;
  estimated_delivery_date?: string | null;
  delivery_estimate_label?: string;
};

type DeliveryAddress = {
  street_address: string;
  suburb: string;
  city: string;
  province: string;
  postal_code: string;
  country: string;
  unit_number: string;
  building_name: string;
  delivery_instructions: string;
};

const Checkout = () => {
  const { items, total, count } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [isProcessing, setIsProcessing] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [isLoadingRates, setIsLoadingRates] = useState(false);
  const [shippingOptions, setShippingOptions] = useState<ShippingQuote[]>([]);
  const [selectedShippingId, setSelectedShippingId] = useState<string | null>(null);
  const [shippingError, setShippingError] = useState("");
  const [shippingInsight, setShippingInsight] = useState<{
    serviceable: boolean;
    serviceability_message?: string;
  } | null>(null);
  const [yocoEnabled, setYocoEnabled] = useState(true);

  const [formData, setFormData] = useState({
    firstName: user?.name ? user.name.split(" ")[0] : "",
    lastName: user?.name && user.name.includes(" ") ? user.name.split(" ").slice(1).join(" ") : "",
    email: user?.email || "",
    phone: user?.phone || "",
    streetAddress: "",
    suburb: "",
    city: "",
    province: "",
    postalCode: "",
    unitNumber: "",
    buildingName: "",
    deliveryInstructions: "",
  });

  useEffect(() => {
    const fetchCheckoutState = async () => {
      try {
        const [gatewayRes, addressRes] = await Promise.all([
          apiFetch("/api/public/payment-gateways"),
          apiFetch("/api/addresses").catch(() => null),
        ]);

        if (gatewayRes.success) {
          setYocoEnabled(Boolean(gatewayRes.data?.yoco?.enabled));
        }

        const addresses = addressRes?.data?.addresses || [];
        const defaultAddress = addresses.find((address: any) => address.is_default) || addresses[0];
        if (defaultAddress) {
          setFormData((prev) => ({
            ...prev,
            streetAddress: prev.streetAddress || defaultAddress.street_address || "",
            suburb: prev.suburb || defaultAddress.unit_number || defaultAddress.building_name || "",
            city: prev.city || defaultAddress.city || "",
            province: prev.province || defaultAddress.province || "",
            postalCode: prev.postalCode || defaultAddress.postal_code || "",
            unitNumber: prev.unitNumber || defaultAddress.unit_number || "",
            buildingName: prev.buildingName || defaultAddress.building_name || "",
            deliveryInstructions: prev.deliveryInstructions || defaultAddress.delivery_instructions || "",
          }));
        }
      } catch (error) {
        console.error("Failed to load checkout config:", error);
      }
    };

    fetchCheckoutState();
  }, []);

  const quoteFingerprint = [
    items.map((item) => `${item.product.id}:${item.quantity}`).join("|"),
    formData.streetAddress,
    formData.suburb,
    formData.city,
    formData.province,
    formData.postalCode,
  ].join("::");

  useEffect(() => {
    if (shippingOptions.length > 0 || selectedShippingId || shippingError || shippingInsight) {
      setShippingOptions([]);
      setSelectedShippingId(null);
      setShippingError("");
      setShippingInsight(null);
    }
  }, [quoteFingerprint]);

  const selectedShippingQuote = useMemo(
    () => shippingOptions.find((option) => option.quote_id === selectedShippingId) || null,
    [shippingOptions, selectedShippingId]
  );

  const orderTotal = useMemo(
    () => total + (selectedShippingQuote?.amount || 0),
    [total, selectedShippingQuote]
  );

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const validateContactAndAddress = () => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const phoneRegex = /^0[0-9]{9}$/;
    const postalRegex = /^[0-9]{4}$/;

    if (!formData.firstName.trim() || formData.firstName.trim().length < 2) {
      throw new Error("First name must be at least 2 characters.");
    }
    if (!formData.lastName.trim() || formData.lastName.trim().length < 2) {
      throw new Error("Last name must be at least 2 characters.");
    }
    if (!emailRegex.test(formData.email.trim())) {
      throw new Error("Please enter a valid email address.");
    }
    if (!phoneRegex.test(formData.phone.trim().replace(/\s/g, ""))) {
      throw new Error("Please enter a valid 10-digit South African phone number starting with 0.");
    }
    if (!formData.streetAddress.trim() || formData.streetAddress.trim().length < 5) {
      throw new Error("Please enter a valid street address.");
    }
    if (!formData.suburb.trim() || formData.suburb.trim().length < 2) {
      throw new Error("Please enter a valid suburb or local area.");
    }
    if (!formData.city.trim() || formData.city.trim().length < 2) {
      throw new Error("Please enter a valid city.");
    }
    if (!formData.province.trim() || formData.province.trim().length < 2) {
      throw new Error("Please enter a valid province.");
    }
    if (!postalRegex.test(formData.postalCode.trim())) {
      throw new Error("Please enter a valid 4-digit postal code.");
    }
  };

  const buildRecipientPayload = () => ({
    first_name: formData.firstName.trim(),
    last_name: formData.lastName.trim(),
    email: formData.email.trim(),
    phone: formData.phone.trim().replace(/\s/g, ""),
  });

  const buildShippingPayload = (): DeliveryAddress => ({
    street_address: formData.streetAddress.trim(),
    suburb: formData.suburb.trim(),
    city: formData.city.trim(),
    province: formData.province.trim(),
    postal_code: formData.postalCode.trim(),
    country: "ZA",
    unit_number: formData.unitNumber.trim(),
    building_name: formData.buildingName.trim(),
    delivery_instructions: formData.deliveryInstructions.trim(),
  });

  const handleQuoteShipping = async () => {
    try {
      validateContactAndAddress();
    } catch (error: any) {
      toast({
        title: "Shipping details incomplete",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    setIsLoadingRates(true);
    setShippingError("");
    setSelectedShippingId(null);

    try {
      const response = await apiFetch("/api/shop/shipping/rates", {
        method: "POST",
        data: {
          items: items
            .filter((item) => !(item.product as any).isDiscount)
            .map((item) => ({
              product_id: item.product.id,
              product_name: item.product.name,
              price: item.product.price,
              shipping_profile: item.product.shipping_profile,
              quantity: item.quantity,
            })),
          shipping: buildShippingPayload(),
          recipient: buildRecipientPayload(),
        },
      });

      const rates = response.data?.rates || [];
      setShippingInsight({
        serviceable: Boolean(response.data?.serviceable ?? rates.length > 0),
        serviceability_message: response.data?.serviceability_message,
      });
      setShippingOptions(rates);
      if (rates.length > 0) {
        setSelectedShippingId(rates[0].quote_id);
      } else {
        setShippingError(response.data?.serviceability_message || "No Courier Guy delivery options were returned for this address.");
      }
    } catch (error: any) {
      const message = error.message || "We could not fetch Courier Guy rates right now.";
      setShippingError(message);
      setShippingInsight(null);
      toast({
        title: "Shipping quote failed",
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsLoadingRates(false);
    }
  };

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();

    if (items.length === 0) {
      toast({ title: "Cart is empty", description: "Add some items before checking out.", variant: "destructive" });
      return;
    }

    if (!yocoEnabled) {
      toast({
        title: "Yoco unavailable",
        description: "Shop checkout is currently limited to Yoco, and it is not enabled right now.",
        variant: "destructive",
      });
      return;
    }

    try {
      validateContactAndAddress();
      if (!selectedShippingQuote) {
        throw new Error("Please fetch Courier Guy rates and select a delivery option before you pay.");
      }
    } catch (error: any) {
      toast({
        title: "Checkout incomplete",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);

    try {
      const response = await apiFetch("/api/payments/create-order", {
        method: "POST",
        data: {
          items: items
            .filter((item) => !(item.product as any).isDiscount)
            .map((item) => ({
              product_id: item.product.id,
              product_name: item.product.name,
              price: item.product.price,
              image_url: item.product.image,
              shipping_profile: item.product.shipping_profile,
              quantity: item.quantity,
              ...((item.product as any).bundleName
                ? { bundle_name: (item.product as any).bundleName }
                : {}),
              ...((item.product as any).variantLabel
                ? { variant_label: (item.product as any).variantLabel }
                : {}),
              ...((item.product as any).sku
                : {}),
                ? { sku: (item.product as any).sku }
              ...(() => {
                const variantLabel = (item.product as any).variantLabel as string | undefined;
                const attributes = (item.product as any).attributes as Array<{
                  name: string;
                  values: string[];
                  images?: Record<string, string>;
                }> | undefined;
                if (!variantLabel || !attributes) return {};
                const colorAttr = attributes.find(a =>
                  ["color", "colour"].includes(a.name.toLowerCase())
                );
                if (!colorAttr?.images) return {};
                const colorEntry = variantLabel
                  .split(", ")
                  .find(part => part.toLowerCase().startsWith("color:") || part.toLowerCase().startsWith("colour:"));
                if (!colorEntry) return {};
                const colorValue = colorEntry.split(": ")[1]?.trim();
                if (!colorValue || !colorAttr.images[colorValue]) return {};
                return { color_image_url: colorAttr.images[colorValue] };
              })(),
            })),
          recipient: buildRecipientPayload(),
          shipping: buildShippingPayload(),
          shipping_quote: selectedShippingQuote,
          total: orderTotal,
          provider: "yoco",
        },
      });

      if (response.success && response.data?.redirect_url) {
        await openExternalUrl(response.data.redirect_url);
        return;
      }

      toast({
        title: "Checkout failed",
        description: response.message || "Could not initialize Yoco checkout. Please try again.",
        variant: "destructive",
      });
    } catch (error: any) {
      const message = error.message || "An unexpected error occurred during checkout.";
      const isStockError = message.includes("out of stock") ||
                           (message.includes("only") && message.includes("left"));
      toast({
        title: isStockError ? "Not enough stock" : "Payment error",
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleUseCurrentLocation = () => {
    getCurrentLocationAddress(
      (address, city, _coords, postalCode) => {
        setFormData((prev) => ({
          ...prev,
          streetAddress: address || prev.streetAddress,
          city: city || prev.city,
          postalCode: postalCode || prev.postalCode,
        }));
      },
      (title, description) => toast({ title, description, variant: "destructive" }),
      setIsLocating,
      "full_address"
    );
  };

  return (
    <main className="min-h-screen bg-white flex flex-col">
      <Navbar />

      <section className="pt-32 pb-12 bg-white relative overflow-hidden border-b border-slate-50">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg width='6' height='6' viewBox='0 0 6 6' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23EEF2FF' fill-opacity='1'%3E%3Cpath d='M5 0h1L0 6V5zM6 5v1H5z'/%3E%3C/g%3E%3C/svg%3E')] opacity-70" />
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
            <div className="lg:col-span-8 space-y-12">
              <div className="rounded-[2.5rem] bg-white p-8 sm:p-12 shadow-2xl shadow-slate-200/60 border border-slate-50">
                <h2 className="mb-10 text-2xl font-bold text-[#222222]">Contact & Delivery</h2>
                <form id="checkout-form" onSubmit={handleCheckout} className="space-y-10">
                  <div className="grid gap-8 sm:grid-cols-2">
                    <div>
                      <Label htmlFor="firstName" className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3 ml-1">First Name</Label>
                      <Input id="firstName" name="firstName" value={formData.firstName} onChange={handleInputChange} className="h-16 px-6 bg-slate-50 rounded-2xl border-transparent text-lg font-medium" disabled={isProcessing} />
                    </div>
                    <div>
                      <Label htmlFor="lastName" className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3 ml-1">Last Name</Label>
                      <Input id="lastName" name="lastName" value={formData.lastName} onChange={handleInputChange} className="h-16 px-6 bg-slate-50 rounded-2xl border-transparent text-lg font-medium" disabled={isProcessing} />
                    </div>
                  </div>

                  <div className="grid gap-8 sm:grid-cols-2">
                    <div>
                      <Label htmlFor="email" className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3 ml-1">Email</Label>
                      <Input id="email" name="email" type="email" value={formData.email} onChange={handleInputChange} className="h-16 px-6 bg-slate-50 rounded-2xl border-transparent text-lg font-medium" disabled={isProcessing} />
                    </div>
                    <div>
                      <Label htmlFor="phone" className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3 ml-1">Phone Number</Label>
                      <Input id="phone" name="phone" type="tel" value={formData.phone} onChange={handleInputChange} className="h-16 px-6 bg-slate-50 rounded-2xl border-transparent text-lg font-medium" disabled={isProcessing} />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="streetAddress" className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3 ml-1">Street Address</Label>
                    <div className="relative">
                      <Input
                        id="streetAddress"
                        name="streetAddress"
                        value={formData.streetAddress}
                        onChange={handleInputChange}
                        placeholder="123 Main St"
                        className="h-16 px-6 pr-14 bg-slate-50 rounded-2xl border-transparent text-lg font-medium"
                        disabled={isProcessing}
                      />
                      <button
                        type="button"
                        onClick={handleUseCurrentLocation}
                        className="absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded-xl text-slate-400 hover:text-primary hover:bg-primary/10 transition-all"
                        title="Use current location"
                      >
                        {isLocating ? <Loader2 className="h-5 w-5 animate-spin" /> : <Navigation className="h-5 w-5" />}
                      </button>
                    </div>
                  </div>

                  <div className="grid gap-8 sm:grid-cols-2">
                    <div>
                      <Label htmlFor="suburb" className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3 ml-1">Suburb / Local Area</Label>
                      <Input id="suburb" name="suburb" value={formData.suburb} onChange={handleInputChange} className="h-16 px-6 bg-slate-50 rounded-2xl border-transparent text-lg font-medium" disabled={isProcessing} />
                    </div>
                    <div>
                      <Label htmlFor="city" className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3 ml-1">City</Label>
                      <Input id="city" name="city" value={formData.city} onChange={handleInputChange} className="h-16 px-6 bg-slate-50 rounded-2xl border-transparent text-lg font-medium" disabled={isProcessing} />
                    </div>
                  </div>

                  <div className="grid gap-8 sm:grid-cols-2">
                    <div>
                      <Label htmlFor="province" className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3 ml-1">Province</Label>
                      <Input id="province" name="province" value={formData.province} onChange={handleInputChange} className="h-16 px-6 bg-slate-50 rounded-2xl border-transparent text-lg font-medium" disabled={isProcessing} />
                    </div>
                    <div>
                      <Label htmlFor="postalCode" className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3 ml-1">Postal Code</Label>
                      <Input id="postalCode" name="postalCode" value={formData.postalCode} onChange={handleInputChange} className="h-16 px-6 bg-slate-50 rounded-2xl border-transparent text-lg font-medium" disabled={isProcessing} />
                    </div>
                  </div>

                  <div className="grid gap-8 sm:grid-cols-2">
                    <div>
                      <Label htmlFor="unitNumber" className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3 ml-1">Unit Number</Label>
                      <Input id="unitNumber" name="unitNumber" value={formData.unitNumber} onChange={handleInputChange} className="h-16 px-6 bg-slate-50 rounded-2xl border-transparent text-lg font-medium" disabled={isProcessing} />
                    </div>
                    <div>
                      <Label htmlFor="buildingName" className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3 ml-1">Building Name</Label>
                      <Input id="buildingName" name="buildingName" value={formData.buildingName} onChange={handleInputChange} className="h-16 px-6 bg-slate-50 rounded-2xl border-transparent text-lg font-medium" disabled={isProcessing} />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="deliveryInstructions" className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3 ml-1">Delivery Instructions</Label>
                    <textarea
                      id="deliveryInstructions"
                      name="deliveryInstructions"
                      value={formData.deliveryInstructions}
                      onChange={handleInputChange}
                      rows={4}
                      className="w-full rounded-3xl bg-slate-50 px-6 py-4 text-base font-medium text-[#222222] outline-none transition-all focus:bg-white focus:ring-4 focus:ring-primary/5"
                      disabled={isProcessing}
                      placeholder="Gate code, landmark, or anything the courier should know."
                    />
                  </div>
                </form>
              </div>

              <div className="rounded-[2.5rem] bg-white p-8 sm:p-12 shadow-2xl shadow-slate-200/60 border border-slate-50">
                <div className="flex items-center justify-between gap-6 mb-8">
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 bg-primary/10 rounded-2xl flex items-center justify-center text-primary">
                      <Truck className="h-6 w-6" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold text-[#222222]">Courier Guy Delivery</h2>
                      <p className="text-sm text-slate-500 font-medium">Get live delivery rates before you pay.</p>
                    </div>
                  </div>
                  <Button
                    type="button"
                    onClick={handleQuoteShipping}
                    disabled={items.length === 0 || isLoadingRates || isProcessing}
                    className="h-12 px-6 rounded-2xl bg-primary text-white font-bold"
                  >
                    {isLoadingRates ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Truck className="h-4 w-4 mr-2" />}
                    {shippingOptions.length > 0 ? "Refresh Rates" : "Get Rates"}
                  </Button>
                </div>

                {shippingError && (
                  <div className="mb-6 rounded-2xl border border-rose-100 bg-rose-50 px-5 py-4 text-sm font-medium text-rose-700">
                    {shippingError}
                  </div>
                )}

                {shippingInsight?.serviceable && shippingInsight.serviceability_message && (
                  <div className="mb-6 rounded-2xl border border-emerald-100 bg-emerald-50 px-5 py-4 text-sm font-medium text-emerald-700">
                    {shippingInsight.serviceability_message}
                  </div>
                )}

                {shippingOptions.length > 0 ? (
                  <div className="grid gap-4 sm:grid-cols-2">
                    {shippingOptions.map((option) => {
                      const isSelected = option.quote_id === selectedShippingId;
                      return (
                        <button
                          key={option.quote_id}
                          type="button"
                          onClick={() => setSelectedShippingId(option.quote_id)}
                          className={cn(
                            "rounded-[2rem] border-2 p-5 text-left transition-all",
                            isSelected
                              ? "border-primary bg-primary/5 shadow-lg shadow-primary/10"
                              : "border-slate-100 bg-white hover:border-slate-200"
                          )}
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
                                {option.carrier}
                              </p>
                              <h3 className="mt-1 text-lg font-bold text-[#222222]">{option.service_name}</h3>
                              <p className="mt-1 text-sm text-slate-500 font-medium">
                                {option.delivery_estimate_label || (option.estimated_days ? `${option.estimated_days} business day${option.estimated_days === 1 ? "" : "s"}` : "Delivery ETA supplied by courier")}
                              </p>
                            </div>
                            <div className="text-right shrink-0">
                              <p className="text-2xl font-black text-primary">R{option.amount.toFixed(2)}</p>
                              {isSelected && (
                                <div className="mt-2 inline-flex h-6 w-6 items-center justify-center rounded-full bg-primary text-white">
                                  <Check className="h-3.5 w-3.5" strokeWidth={3} />
                                </div>
                              )}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="rounded-[2rem] border border-dashed border-slate-200 bg-slate-50/60 px-6 py-8 text-sm text-slate-500 font-medium">
                    Enter your full delivery details and fetch rates to choose a Courier Guy option.
                  </div>
                )}
              </div>

              <div className="rounded-[2.5rem] bg-white p-8 sm:p-12 shadow-2xl shadow-slate-200/60 border border-slate-50">
                <div className="flex items-center gap-4 mb-8">
                  <div className="h-12 w-12 bg-primary/10 rounded-2xl flex items-center justify-center text-primary">
                    <CreditCard className="h-6 w-6" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-[#222222]">Payment Method</h2>
                    <p className="text-sm text-slate-500 font-medium">Shop orders are processed securely through Yoco.</p>
                  </div>
                </div>

                <div
                  className={cn(
                    "rounded-[2rem] border-2 p-6 transition-all",
                    yocoEnabled ? "border-primary bg-primary/5" : "border-rose-100 bg-rose-50"
                  )}
                >
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <div
                        className="h-8 w-20 bg-contain bg-no-repeat bg-left mb-4"
                        style={{ backgroundImage: "url('https://cdn.yoco.com/images/yoco-logo-dark.svg')" }}
                      />
                      <p className="text-base font-bold text-[#222222]">Yoco</p>
                      <p className="text-xs text-slate-500 font-medium mt-1">South African cards and Instant EFT</p>
                    </div>
                    <div className={cn(
                      "inline-flex items-center gap-2 rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em]",
                      yocoEnabled ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"
                    )}>
                      <ShieldCheck className="h-3.5 w-3.5" />
                      {yocoEnabled ? "Enabled" : "Unavailable"}
                    </div>
                  </div>
                </div>

                <div className="mt-8 flex items-center gap-3 text-sm font-bold text-emerald-600 bg-emerald-50 p-6 rounded-2xl border border-emerald-100">
                  <ShieldCheck className="h-6 w-6" />
                  <span>Your payment information is encrypted and secure.</span>
                </div>
              </div>
            </div>

            <div className="lg:col-span-4">
              <div className="sticky top-28 rounded-[2.5rem] bg-white p-8 shadow-2xl shadow-slate-200/60 border border-slate-50 space-y-8">
                <h3 className="text-xl font-bold text-[#222222] border-b border-slate-50 pb-6">Order Summary</h3>

                <div className="max-h-80 overflow-y-auto pr-2 space-y-6">
                  {items.length === 0 ? (
                    <p className="text-base text-slate-400 text-center py-8">Your cart is empty</p>
                  ) : (
                    (() => {
                    const regularItems = items.filter(
                      (item) => !(item.product as any).bundleId
                    );
                    const bundleMap: Record<string, typeof items> = {};
                    items
                      .filter((item) => (item.product as any).bundleId)
                      .forEach((item) => {
                        const bid = (item.product as any).bundleId;
                        if (!bundleMap[bid]) bundleMap[bid] = [];
                        bundleMap[bid].push(item);
                      });
                    const bundleGroups = Object.entries(bundleMap);

                    return (
                      <>
                        {bundleGroups.map(([bundleId, bundleItems]) => {
                          const discountItem = bundleItems.find(
                            (i) => (i.product as any).isDiscount
                          );
                          const productItems = bundleItems.filter(
                            (i) => !(i.product as any).isDiscount
                          );
                          const bundleName = discountItem
                            ? (discountItem.product.name || "")
                                .replace("Bundle Discount: ", "")
                            : "Bundle";
                          const discountAmount = discountItem
                            ? Math.abs(discountItem.product.price)
                            : 0;
                          const bundleTotal = productItems.reduce(
                            (acc, i) => acc + i.product.price * i.quantity,
                            0
                          ) - discountAmount;

                          return (
                            <div
                              key={bundleId}
                              className="rounded-2xl border border-primary/20 bg-primary/5 overflow-hidden"
                            >
                              <div className="px-4 py-2 border-b border-primary/10 flex items-center gap-2">
                                <span className="text-[10px] font-black uppercase tracking-widest text-primary">
                                  Bundle
                                </span>
                                <span className="text-sm font-bold text-slate-800 truncate">
                                  {bundleName}
                                </span>
                              </div>
                              <div className="divide-y divide-primary/10">
                                {productItems.map((item) => (
                                  <div
                                    key={item.product.id}
                                    className="flex items-center gap-3 px-4 py-2"
                                  >
                                    <div className="h-10 w-10 flex-shrink-0 overflow-hidden rounded-xl border border-slate-100 bg-white">
                                      <img
                                        src={(item.product as any).image_url || item.product.image || ""}
                                        alt={item.product.name}
                                        className="h-full w-full object-cover"
                                        onError={(e) => {
                                          (e.target as HTMLImageElement).style.display = "none";
                                        }}
                                      />
                                    </div>
                                    <p className="flex-1 text-sm font-bold text-slate-800 truncate">
                                      {item.product.name}
                                    </p>
                                    <p className="text-sm font-bold text-slate-600">
                                      R{item.product.price.toFixed(2)}
                                    </p>
                                  </div>
                                ))}
                              </div>
                              <div className="px-4 py-2 border-t border-primary/10 space-y-1">
                                {discountAmount > 0 && (
                                  <div className="flex justify-between text-xs">
                                    <span className="text-emerald-600 font-bold">
                                      Bundle saving
                                    </span>
                                    <span className="text-emerald-600 font-black">
                                      -R{discountAmount.toFixed(2)}
                                    </span>
                                  </div>
                                )}
                                <div className="flex justify-between text-sm font-black text-slate-800">
                                  <span>Bundle price</span>
                                  <span className="text-primary">
                                    R{bundleTotal.toFixed(2)}
                                  </span>
                                </div>
                              </div>
                            </div>
                          );
                        })}

                        {regularItems.map((item) => (
                          <div key={item.product.id} className="flex items-center gap-4">
                            <div className="h-16 w-16 flex-shrink-0 overflow-hidden rounded-2xl border border-slate-50 bg-slate-50 shadow-inner">
                              {(() => {
                                let variantImageUrl: string | null = null;
                                const variantLabel = (item.product as any).variantLabel as string | undefined;
                                const attributes = (item.product as any).attributes as Array<{
                                  name: string;
                                  values: string[];
                                  images?: Record<string, string>;
                                }> | undefined;
                                if (variantLabel && attributes) {
                                  const colorAttr = attributes.find(a =>
                                    ["color", "colour"].includes(a.name.toLowerCase())
                                  );
                                  if (colorAttr?.images) {
                                    const colorEntry = variantLabel
                                      .split(", ")
                                      .find(part => part.toLowerCase().startsWith("color:") || part.toLowerCase().startsWith("colour:"));
                                    if (colorEntry) {
                                      const colorValue = colorEntry.split(": ")[1]?.trim();
                                      if (colorValue && colorAttr.images[colorValue]) {
                                        variantImageUrl = colorAttr.images[colorValue];
                                      }
                                    }
                                  }
                                }
                                const finalImageUrl = variantImageUrl || (item.product as any).image_url || item.product.image || "";
                                return (
                                  <img
                                    src={finalImageUrl.startsWith("http") ? finalImageUrl : `${window.location.origin}${finalImageUrl}`}
                                    alt={item.product.name}
                                    className="h-full w-full object-cover"
                                    onError={(e) => {
                                      (e.target as HTMLImageElement).style.display = "none";
                                    }}
                                  />
                                );
                              })()}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-base font-bold text-[#222222] truncate">
                                {item.product.name}
                              </p>
                              {(item.product as any).variantLabel && (
                                <p className="text-[10px] font-bold text-primary uppercase tracking-widest mt-0.5">
                                  {(item.product as any).variantLabel}
                                </p>
                              )}
                              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                                Qty: {item.quantity}
                              </p>
                            </div>
                            <div className="text-base font-bold text-[#222222]">
                              R{(item.product.price * item.quantity).toFixed(2)}
                            </div>
                          </div>
                        ))}
                      </>
                    );
                  })()
                  )}
                </div>

                <div className="space-y-4 border-t border-slate-50 pt-6">
                  <div className="flex justify-between text-base font-medium text-slate-400">
                    <span>Subtotal ({items.filter(i => !(i.product as any).isDiscount).length} items)</span>
                    <span className="text-[#222222]">R{total.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-base font-medium text-slate-400">
                    <span>Courier Guy Shipping</span>
                    <span className={selectedShippingQuote ? "text-[#222222]" : "text-primary italic"}>
                      {selectedShippingQuote ? `R${selectedShippingQuote.amount.toFixed(2)}` : "Select a delivery option"}
                    </span>
                  </div>
                </div>

                <div className="flex justify-between items-center border-t border-slate-50 pt-6">
                  <span className="text-xl font-bold text-[#222222]">Total</span>
                  <span className="text-3xl font-black text-primary">R{orderTotal.toFixed(2)}</span>
                </div>

                <Button
                  type="submit"
                  form="checkout-form"
                  className="w-full h-16 rounded-2xl bg-primary text-white font-bold text-xl shadow-lg hover:shadow-primary/20 transition-all hover:-translate-y-1"
                  disabled={items.length === 0 || isProcessing || !selectedShippingQuote || !yocoEnabled}
                >
                  {isProcessing ? (
                    <div className="flex items-center gap-2">
                      <Loader2 className="h-5 w-5 animate-spin" />
                      <span>Redirecting to Yoco...</span>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center gap-2 text-xl font-bold">
                      <Lock className="h-6 w-6" strokeWidth={2.5} />
                      <span>Pay R{orderTotal.toFixed(2)}</span>
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
