import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type ShipmentDocument = HydratedDocument<Shipment>;

@Schema({ _id: false })
export class TimelineItem {
  @Prop({ required: true })
  label: string;

  @Prop({ default: '' })
  detail: string;

  @Prop({ default: '' })
  at: string;

  @Prop({ default: false })
  done: boolean;
}

export const TimelineItemSchema = SchemaFactory.createForClass(TimelineItem);

@Schema({ timestamps: true, collection: 'shipments' })
export class Shipment {
  @Prop({ required: true, unique: true, index: true })
  trackingCode: string;

  @Prop({ required: true })
  senderName: string;

  @Prop({ required: true })
  senderAddress: string;

  @Prop({ required: true })
  senderEmail: string;

  @Prop({ required: true })
  receiverName: string;

  @Prop({ required: true })
  receiverAddress: string;

  @Prop({ required: true })
  receiverEmail: string;

  @Prop({ required: true })
  parcelDetails: string;

  @Prop({ required: true })
  weight: string;

  @Prop({ required: true })
  cityOfDeparture: string;

  @Prop({ required: true })
  dateOfDeparture: string;

  @Prop({ required: true })
  estimatedDateOfArrival: string;

  @Prop({ required: true })
  currentLocation: string;

  @Prop({ required: true })
  deliveryStatus: string;

  @Prop({ required: true })
  statusLevel: string;

  @Prop({ required: true })
  amountPaid: string;

  @Prop({ required: true })
  destination: string;

  @Prop({ default: 'plane' })
  mode: string;

  @Prop({ default: '' })
  shipmentHistory: string;

  @Prop({ type: [TimelineItemSchema], default: [] })
  timeline: TimelineItem[];
}

export const ShipmentSchema = SchemaFactory.createForClass(Shipment);
