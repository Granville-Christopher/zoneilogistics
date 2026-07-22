export interface ShipmentHistoryItem {
  label: string;
  detail: string;
  at: string;
  done: boolean;
}

export interface Shipment {
  id: string;
  trackingCode: string;
  senderName: string;
  senderAddress: string;
  senderEmail: string;
  receiverName: string;
  receiverAddress: string;
  receiverEmail: string;
  parcelDetails: string;
  weight: string;
  cityOfDeparture: string;
  dateOfDeparture: string;
  estimatedDateOfArrival: string;
  currentLocation: string;
  deliveryStatus: string;
  statusLevel: string;
  amountPaid: string;
  destination: string;
  mode: string;
  shipmentHistory: string;
  timeline: ShipmentHistoryItem[];
  createdAt: string;
  updatedAt: string;
}
