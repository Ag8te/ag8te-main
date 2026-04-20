import { Fragment, useState, useEffect } from "react";
import { 
  RefreshCw, ChevronDown, ChevronUp, Globe
} from "lucide-react";
import { apiFetch } from "@/lib/api";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export const ApiLogsManagement = () => {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedLog, setExpandedLog] = useState<string | null>(null);
  const [providerFilter, setProviderFilter] = useState<"all" | "yoco" | "paypal">("yoco");

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const endpoint = providerFilter === "all"
        ? "/api/admin/api-logs"
        : `/api/admin/api-logs?provider=${providerFilter}`;
      const res = await apiFetch(endpoint);
      if (res.success) {
        setLogs(res.data.logs);
      }
    } catch (err) {
      console.error("Failed to fetch API logs:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [providerFilter]);

  const latestYocoCheckout = logs.find((log) => log.provider === "yoco" && log.endpoint === "/api/checkouts");
  const latestResponse = latestYocoCheckout?.response_payload || {};
  const latestRequest = latestYocoCheckout?.request_payload || {};
  const latestStatus = latestYocoCheckout?.status_code;
  const latestProcessingMode = latestResponse.processingMode || "unknown";
  const latestRedirectUrl = latestResponse.redirectUrl || "N/A";
  const latestExternalId = latestRequest.externalId || latestResponse.externalId || "N/A";
  const latestErrorMessage =
    latestYocoCheckout?.error_message ||
    latestResponse?.message ||
    latestResponse?.error ||
    "None";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h2 className="text-xl font-bold text-slate-900">External API Integration Logs</h2>
          <p className="text-sm text-slate-500">Use the Yoco filter to inspect the latest checkout request and response.</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-xl border border-slate-200 bg-white p-1">
            {(["yoco", "paypal", "all"] as const).map((provider) => (
              <button
                key={provider}
                type="button"
                onClick={() => setProviderFilter(provider)}
                className={cn(
                  "rounded-lg px-3 py-1.5 text-xs font-bold uppercase tracking-wider transition-colors",
                  providerFilter === provider
                    ? "bg-slate-900 text-white"
                    : "text-slate-500 hover:bg-slate-50"
                )}
              >
                {provider}
              </button>
            ))}
          </div>
          <Button variant="outline" size="sm" onClick={fetchLogs} disabled={loading}>
            <RefreshCw className={cn("h-4 w-4 mr-2", loading && "animate-spin")} /> Refresh
          </Button>
        </div>
      </div>

      {providerFilter === "yoco" && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Latest Status</p>
            <p className={cn(
              "mt-2 text-lg font-black",
              latestStatus >= 200 && latestStatus < 300 ? "text-emerald-600" : "text-rose-600"
            )}>
              {latestStatus ?? "N/A"}
            </p>
          </div>
          <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Processing Mode</p>
            <p className="mt-2 text-lg font-black text-slate-900">{latestProcessingMode}</p>
          </div>
          <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">External ID</p>
            <p className="mt-2 truncate text-sm font-bold text-slate-900">{latestExternalId}</p>
          </div>
          <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Redirect URL</p>
            <p className="mt-2 truncate text-sm font-bold text-slate-900">{latestRedirectUrl}</p>
          </div>
          <div className="rounded-2xl border border-amber-100 bg-amber-50 p-4 shadow-sm md:col-span-4">
            <p className="text-[10px] font-bold uppercase tracking-widest text-amber-700">Latest Yoco Error Hint</p>
            <p className="mt-2 text-sm font-semibold text-amber-900">{String(latestErrorMessage)}</p>
          </div>
        </div>
      )}

      {providerFilter === "yoco" && latestYocoCheckout && (
        <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">How To Read This</p>
          <p className="mt-2 text-sm text-slate-600">
            If status is `200` and `redirectUrl` exists, our server created the checkout successfully and the failure is happening on Yoco&apos;s hosted payment page or merchant setup. If status is `403` or another non-2xx response, the problem is in our Yoco key or request configuration.
          </p>
        </div>
      )}

      <div className="bg-white border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-100">
            <thead className="bg-slate-50/50">
              <tr>
                <th className="px-6 py-4 text-left text-[10px] font-bold text-slate-400 uppercase tracking-widest">Status</th>
                <th className="px-6 py-4 text-left text-[10px] font-bold text-slate-400 uppercase tracking-widest">Provider</th>
                <th className="px-6 py-4 text-left text-[10px] font-bold text-slate-400 uppercase tracking-widest">Endpoint</th>
                <th className="px-6 py-4 text-left text-[10px] font-bold text-slate-400 uppercase tracking-widest">Method</th>
                <th className="px-6 py-4 text-left text-[10px] font-bold text-slate-400 uppercase tracking-widest">Time</th>
                <th className="px-6 py-4 text-right text-[10px] font-bold text-slate-400 uppercase tracking-widest">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {logs.length > 0 ? (
                logs.map((log) => (
                  <Fragment key={log.id}>
                    <tr className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={cn(
                          "px-2 py-1 rounded-md text-[10px] font-bold uppercase",
                          log.status_code >= 200 && log.status_code < 300 ? "bg-green-50 text-green-600" : "bg-red-50 text-red-600"
                        )}>
                          {log.status_code}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <Globe className="h-3 w-3 text-slate-400" />
                          <span className="text-sm font-bold text-slate-700 capitalize">{log.provider}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <code className="text-xs font-mono text-slate-500">{log.endpoint}</code>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-[10px] font-bold text-slate-400">{log.method}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-xs text-slate-400">
                        {new Date(log.created_at).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <button 
                          onClick={() => setExpandedLog(expandedLog === log.id ? null : log.id)}
                          className="p-1 hover:bg-slate-100 rounded transition-colors"
                        >
                          {expandedLog === log.id ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        </button>
                      </td>
                    </tr>
                    {expandedLog === log.id && (
                      <tr className="bg-slate-50/50">
                        <td colSpan={6} className="px-6 py-6">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                              <p className="text-[10px] font-bold text-slate-400 uppercase mb-2">Request Payload</p>
                              <pre className="p-4 bg-slate-900 text-slate-300 rounded-xl text-xs overflow-x-auto max-h-[300px]">
                                {JSON.stringify(log.request_payload, null, 2)}
                              </pre>
                            </div>
                            <div>
                              <p className="text-[10px] font-bold text-slate-400 uppercase mb-2">Response Payload</p>
                              <pre className="p-4 bg-slate-900 text-slate-300 rounded-xl text-xs overflow-x-auto max-h-[300px]">
                                {JSON.stringify(log.response_payload, null, 2)}
                              </pre>
                              {log.error_message && (
                                <div className="mt-3 rounded-xl border border-rose-100 bg-rose-50 p-3">
                                  <p className="text-[10px] font-bold uppercase tracking-widest text-rose-500">Error Message</p>
                                  <p className="mt-1 text-xs font-semibold text-rose-700">{log.error_message}</p>
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-400 italic text-sm">
                    {loading ? "Loading logs..." : "No API logs found."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
