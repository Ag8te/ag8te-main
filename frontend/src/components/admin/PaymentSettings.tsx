import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import {
  CreditCard,
  Globe,
  Loader2,
  Lock,
  Power,
  Save,
  ShieldCheck,
  Truck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type SettingsState = {
  paypal: {
    enabled: boolean;
    client_id: string;
    client_secret: string;
    mode: string;
  };
  yoco: {
    enabled: boolean;
    secret_key: string;
    api_url: string;
  };
  shiplogic: {
    enabled: boolean;
    api_key: string;
    api_url: string;
    courier_name: string;
    collection_company: string;
    collection_name: string;
    collection_phone: string;
    collection_email: string;
    collection_street_address: string;
    collection_local_area: string;
    collection_city: string;
    collection_zone: string;
    collection_code: string;
    collection_country: string;
    default_parcel_description: string;
    default_weight_kg: number;
    default_length_cm: number;
    default_width_cm: number;
    default_height_cm: number;
    max_weight_per_parcel_kg: number;
    shipping_markup_type: string;
    shipping_markup_value: number;
    automatic_shipment_creation: boolean;
  };
};

const defaultSettings: SettingsState = {
  paypal: {
    enabled: false,
    client_id: "",
    client_secret: "",
    mode: "live",
  },
  yoco: {
    enabled: false,
    secret_key: "",
    api_url: "https://payments.yoco.com",
  },
  shiplogic: {
    enabled: false,
    api_key: "",
    api_url: "https://api.shiplogic.com",
    courier_name: "The Courier Guy",
    collection_company: "",
    collection_name: "",
    collection_phone: "",
    collection_email: "",
    collection_street_address: "",
    collection_local_area: "",
    collection_city: "",
    collection_zone: "",
    collection_code: "",
    collection_country: "ZA",
    default_parcel_description: "General goods",
    default_weight_kg: 1,
    default_length_cm: 30,
    default_width_cm: 25,
    default_height_cm: 20,
    max_weight_per_parcel_kg: 25,
    shipping_markup_type: "flat",
    shipping_markup_value: 0,
    automatic_shipment_creation: true,
  },
};

export const PaymentSettings = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<SettingsState>(defaultSettings);

  const setGateway = <T extends keyof SettingsState,>(gateway: T, patch: Partial<SettingsState[T]>) => {
    setSettings((prev) => ({
      ...prev,
      [gateway]: {
        ...prev[gateway],
        ...patch,
      },
    }));
  };

  const fetchSettings = useCallback(async () => {
    setLoading(true);
    try {
      const adminHeaders = { Authorization: `Bearer ${localStorage.getItem("adminToken")}` };
      const res = await apiFetch("/api/admin/settings/payment", { headers: adminHeaders });
      if (res?.success && res.data) {
        setSettings({
          paypal: { ...defaultSettings.paypal, ...(res.data.paypal || {}) },
          yoco: { ...defaultSettings.yoco, ...(res.data.yoco || {}) },
          shiplogic: { ...defaultSettings.shiplogic, ...(res.data.shiplogic || {}) },
        });
      }
    } catch (error) {
      toast({ title: "Error", description: "Failed to load payment settings.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const adminHeaders = { Authorization: `Bearer ${localStorage.getItem("adminToken")}` };
      await apiFetch("/api/admin/settings/payment", {
        method: "PATCH",
        headers: adminHeaders,
        data: settings,
      });

      toast({
        title: "Settings Saved",
        description: "Payment and shipping infrastructure settings have been updated.",
        className: "bg-[#5e35b1] text-white",
      });
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Update failed", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="py-24 flex flex-col items-center gap-3">
        <Loader2 className="animate-spin h-8 w-8 text-[#5e35b1]" />
        <span className="text-sm font-medium text-slate-400">Loading payment gateways...</span>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex justify-between items-end">
        <div className="space-y-1">
          <h3 className="text-2xl font-black text-slate-900 tracking-tight">Checkout Infrastructure</h3>
          <p className="text-slate-500 font-medium">Configure Yoco payments and Courier Guy shipping from one place.</p>
        </div>
        <Button
          onClick={handleSave}
          disabled={saving}
          className="h-12 px-10 bg-[#5e35b1] hover:bg-[#4527a0] font-black shadow-xl shadow-purple-200"
        >
          {saving ? <Loader2 className="animate-spin h-5 w-5" /> : <Save className="w-5 h-5 mr-3" />}
          Save Configuration
        </Button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        <Card className="border border-slate-200 shadow-sm bg-white overflow-hidden">
          <CardHeader className="pb-4 border-b border-slate-50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 bg-[#003087]/10 text-[#003087] flex items-center justify-center">
                  <CreditCard className="h-6 w-6" />
                </div>
                <div>
                  <CardTitle className="text-xl font-black">PayPal Checkout</CardTitle>
                  <CardDescription>Global payments and subscriptions.</CardDescription>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-[10px] font-bold uppercase tracking-widest ${settings.paypal.enabled ? "text-emerald-500" : "text-slate-300"}`}>
                  {settings.paypal.enabled ? "Enabled" : "Disabled"}
                </span>
                <Switch checked={settings.paypal.enabled} onCheckedChange={(enabled) => setGateway("paypal", { enabled })} />
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-6 space-y-4">
            <div className="space-y-2">
              <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest flex items-center">
                <Lock className="w-3 h-3 mr-2" /> Client ID
              </label>
              <Input value={settings.paypal.client_id} onChange={(e) => setGateway("paypal", { client_id: e.target.value })} className="font-medium h-11" />
            </div>
            <div className="space-y-2">
              <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest flex items-center">
                <ShieldCheck className="w-3 h-3 mr-2" /> Client Secret
              </label>
              <Input type="password" value={settings.paypal.client_secret} onChange={(e) => setGateway("paypal", { client_secret: e.target.value })} className="font-medium h-11" />
            </div>
            <div className="space-y-2">
              <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest flex items-center">
                <Globe className="w-3 h-3 mr-2" /> Environment Mode
              </label>
              <Select value={settings.paypal.mode} onValueChange={(mode) => setGateway("paypal", { mode })}>
                <SelectTrigger className="h-11 font-bold">
                  <SelectValue placeholder="Select mode" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sandbox">Sandbox (Testing)</SelectItem>
                  <SelectItem value="live">Live (Production)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-slate-200 shadow-sm bg-white overflow-hidden">
          <CardHeader className="pb-4 border-b border-slate-50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 bg-[#00aaff]/10 text-[#00aaff] flex items-center justify-center">
                  <CreditCard className="h-6 w-6" />
                </div>
                <div>
                  <CardTitle className="text-xl font-black">Yoco (South Africa)</CardTitle>
                  <CardDescription>Local card payments and Instant EFT.</CardDescription>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-[10px] font-bold uppercase tracking-widest ${settings.yoco.enabled ? "text-emerald-500" : "text-slate-300"}`}>
                  {settings.yoco.enabled ? "Enabled" : "Disabled"}
                </span>
                <Switch checked={settings.yoco.enabled} onCheckedChange={(enabled) => setGateway("yoco", { enabled })} />
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-6 space-y-4">
            <div className="space-y-2">
              <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest flex items-center">
                <ShieldCheck className="w-3 h-3 mr-2" /> Secret Key
              </label>
              <Input type="password" value={settings.yoco.secret_key} onChange={(e) => setGateway("yoco", { secret_key: e.target.value })} className="font-medium h-11" />
            </div>
            <div className="space-y-2">
              <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest flex items-center">
                <Globe className="w-3 h-3 mr-2" /> API URL
              </label>
              <Input value={settings.yoco.api_url} onChange={(e) => setGateway("yoco", { api_url: e.target.value })} className="font-medium h-11 text-xs" />
            </div>
            <div className="p-4 bg-blue-50/50 border border-blue-100 rounded-lg">
              <p className="text-[11px] text-blue-700 font-medium leading-relaxed">
                <strong>Tip:</strong> Shop checkout is wired to Yoco, so keep this enabled for live orders.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-slate-200 shadow-sm bg-white overflow-hidden">
          <CardHeader className="pb-4 border-b border-slate-50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 bg-emerald-100 text-emerald-600 flex items-center justify-center">
                  <Truck className="h-6 w-6" />
                </div>
                <div>
                  <CardTitle className="text-xl font-black">Courier Guy / Shiplogic</CardTitle>
                  <CardDescription>Shipping quotes, shipment creation, and tracking.</CardDescription>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-[10px] font-bold uppercase tracking-widest ${settings.shiplogic.enabled ? "text-emerald-500" : "text-slate-300"}`}>
                  {settings.shiplogic.enabled ? "Enabled" : "Disabled"}
                </span>
                <Switch checked={settings.shiplogic.enabled} onCheckedChange={(enabled) => setGateway("shiplogic", { enabled })} />
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-6 space-y-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest flex items-center">
                  <ShieldCheck className="w-3 h-3 mr-2" /> API Key
                </label>
                <Input type="password" value={settings.shiplogic.api_key} onChange={(e) => setGateway("shiplogic", { api_key: e.target.value })} className="font-medium h-11" />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest flex items-center">
                  <Globe className="w-3 h-3 mr-2" /> API URL
                </label>
                <Input value={settings.shiplogic.api_url} onChange={(e) => setGateway("shiplogic", { api_url: e.target.value })} className="font-medium h-11 text-xs" />
              </div>
              <div className="space-y-2">
                <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Courier Name</label>
                <Input value={settings.shiplogic.courier_name} onChange={(e) => setGateway("shiplogic", { courier_name: e.target.value })} className="font-medium h-11" />
              </div>
              <div className="space-y-2">
                <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Collection Company</label>
                <Input value={settings.shiplogic.collection_company} onChange={(e) => setGateway("shiplogic", { collection_company: e.target.value })} className="font-medium h-11" />
              </div>
              <div className="space-y-2">
                <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Collection Contact</label>
                <Input value={settings.shiplogic.collection_name} onChange={(e) => setGateway("shiplogic", { collection_name: e.target.value })} className="font-medium h-11" />
              </div>
              <div className="space-y-2">
                <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Collection Phone</label>
                <Input value={settings.shiplogic.collection_phone} onChange={(e) => setGateway("shiplogic", { collection_phone: e.target.value })} className="font-medium h-11" />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Collection Email</label>
                <Input value={settings.shiplogic.collection_email} onChange={(e) => setGateway("shiplogic", { collection_email: e.target.value })} className="font-medium h-11" />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Street Address</label>
                <Input value={settings.shiplogic.collection_street_address} onChange={(e) => setGateway("shiplogic", { collection_street_address: e.target.value })} className="font-medium h-11" />
              </div>
              <div className="space-y-2">
                <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Local Area</label>
                <Input value={settings.shiplogic.collection_local_area} onChange={(e) => setGateway("shiplogic", { collection_local_area: e.target.value })} className="font-medium h-11" />
              </div>
              <div className="space-y-2">
                <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest">City</label>
                <Input value={settings.shiplogic.collection_city} onChange={(e) => setGateway("shiplogic", { collection_city: e.target.value })} className="font-medium h-11" />
              </div>
              <div className="space-y-2">
                <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Province / Zone</label>
                <Input value={settings.shiplogic.collection_zone} onChange={(e) => setGateway("shiplogic", { collection_zone: e.target.value })} className="font-medium h-11" />
              </div>
              <div className="space-y-2">
                <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Postal Code</label>
                <Input value={settings.shiplogic.collection_code} onChange={(e) => setGateway("shiplogic", { collection_code: e.target.value })} className="font-medium h-11" />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Default Parcel Description</label>
                <Input value={settings.shiplogic.default_parcel_description} onChange={(e) => setGateway("shiplogic", { default_parcel_description: e.target.value })} className="font-medium h-11" />
              </div>
              <div className="space-y-2">
                <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Weight (kg)</label>
                <Input type="number" value={settings.shiplogic.default_weight_kg} onChange={(e) => setGateway("shiplogic", { default_weight_kg: Number(e.target.value) || 0 })} className="font-medium h-11" />
              </div>
              <div className="space-y-2">
                <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Max Weight / Parcel</label>
                <Input type="number" value={settings.shiplogic.max_weight_per_parcel_kg} onChange={(e) => setGateway("shiplogic", { max_weight_per_parcel_kg: Number(e.target.value) || 0 })} className="font-medium h-11" />
              </div>
              <div className="space-y-2">
                <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Length (cm)</label>
                <Input type="number" value={settings.shiplogic.default_length_cm} onChange={(e) => setGateway("shiplogic", { default_length_cm: Number(e.target.value) || 0 })} className="font-medium h-11" />
              </div>
              <div className="space-y-2">
                <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Width (cm)</label>
                <Input type="number" value={settings.shiplogic.default_width_cm} onChange={(e) => setGateway("shiplogic", { default_width_cm: Number(e.target.value) || 0 })} className="font-medium h-11" />
              </div>
              <div className="space-y-2">
                <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Height (cm)</label>
                <Input type="number" value={settings.shiplogic.default_height_cm} onChange={(e) => setGateway("shiplogic", { default_height_cm: Number(e.target.value) || 0 })} className="font-medium h-11" />
              </div>
              <div className="space-y-2">
                <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Markup Type</label>
                <Select value={settings.shiplogic.shipping_markup_type} onValueChange={(shipping_markup_type) => setGateway("shiplogic", { shipping_markup_type })}>
                  <SelectTrigger className="h-11 font-bold">
                    <SelectValue placeholder="Select markup type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="flat">Flat Amount</SelectItem>
                    <SelectItem value="percentage">Percentage</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Markup Value</label>
                <Input type="number" value={settings.shiplogic.shipping_markup_value} onChange={(e) => setGateway("shiplogic", { shipping_markup_value: Number(e.target.value) || 0 })} className="font-medium h-11" />
              </div>
            </div>

            <div className="flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
              <div>
                <p className="text-sm font-bold text-slate-700">Automatic shipment creation after payment</p>
                <p className="text-xs text-slate-500 font-medium">If enabled, paid shop orders create a Courier Guy shipment immediately.</p>
              </div>
              <Switch
                checked={settings.shiplogic.automatic_shipment_creation}
                onCheckedChange={(automatic_shipment_creation) => setGateway("shiplogic", { automatic_shipment_creation })}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="p-6 bg-[#fafafa] border border-slate-100 flex items-center gap-4">
        <div className="h-10 w-10 rounded-full bg-white flex items-center justify-center text-slate-400 shadow-sm">
          <Power className="h-5 w-5" />
        </div>
        <div className="text-sm">
          <p className="text-slate-600 font-bold">Immediate effect on new checkout sessions</p>
          <p className="text-slate-400 font-medium italic">Existing Yoco sessions are not changed retroactively, but new shop checkouts will use the latest shipping and payment settings.</p>
        </div>
      </div>
    </div>
  );
};
