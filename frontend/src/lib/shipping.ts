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

export const getDeliveryEtaLabel = (shipping: any) => {
  return shipping?.quote?.delivery_estimate_label || null;
};
