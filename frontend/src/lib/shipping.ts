export const formatShipmentStatus = (status?: string | null) => {
  const normalized = String(status || "awaiting_shipment").replace(/_/g, " ").trim();
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
};

const getShippingShipments = (shipping: any) => {
  if (Array.isArray(shipping?.shipments) && shipping.shipments.length > 0) {
    return shipping.shipments;
  }
  if (shipping?.shipment) {
    return [shipping.shipment];
  }
  return [];
};

export const getPrimaryTrackingReference = (shipping: any) => {
  return shipping?.tracking_reference || shipping?.shipment?.tracking_reference || getShippingShipments(shipping)[0]?.tracking_reference || null;
};

export const getTrackingSummary = (shipping: any) => {
  return getPrimaryTrackingReference(shipping) || "Pending";
};

export const getDeliveryServiceLabel = (shipping: any) => {
  return shipping?.quote?.service_name || shipping?.shipment?.service_name || getShippingShipments(shipping)[0]?.service_name || "Courier Guy";
};

const formatISODate = (dateStr: string): string => {
  try {
    const dt = new Date(dateStr);
    if (isNaN(dt.getTime())) return dateStr;
    return dt.toLocaleDateString('en-ZA', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
};

const isRawISOString = (str: string): boolean => {
  return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(str);
};

export const getDeliveryEtaLabel = (shipping: any): string | null => {
  const label = shipping?.quote?.delivery_estimate_label;
  if (label) {
    if (isRawISOString(label)) {
      return `Est. delivery by ${formatISODate(label)}`;
    }
    const isoMatch = label.match(/(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}[^\s]*)/);
    if (isoMatch) {
      return label.replace(isoMatch[1], formatISODate(isoMatch[1]));
    }
    return label;
  }
  const date = shipping?.quote?.estimated_delivery_date;
  if (date && isRawISOString(date)) {
    return `Est. delivery by ${formatISODate(date)}`;
  }
  return null;
};
