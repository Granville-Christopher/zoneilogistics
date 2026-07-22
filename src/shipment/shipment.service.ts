import { Injectable, NotFoundException, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CreateShipmentDto } from './dto/create-shipment.dto';
import { UpdateShipmentDto } from './dto/update-shipment.dto';
import { Shipment, ShipmentDocument } from './schemas/shipment.schema';
import { ShipmentHistoryItem } from './shipment.types';

@Injectable()
export class ShipmentService implements OnModuleInit {
  constructor(
    @InjectModel(Shipment.name)
    private readonly shipmentModel: Model<ShipmentDocument>,
  ) {}

  async onModuleInit() {
    const count = await this.shipmentModel.estimatedDocumentCount();
    if (count === 0) {
      await this.seedDemo();
    }
  }

  private generateCode() {
    const digits = `${Date.now()}${Math.floor(Math.random() * 100)}`.slice(-10);
    return `ZI-${digits}`;
  }

  normalizeTrackingCode(code?: string) {
    const raw = (code || this.generateCode()).trim().toUpperCase();
    if (/^ZI-\d{8,14}$/.test(raw)) return raw;
    const digits = raw.replace(/\D/g, '').slice(-10).padStart(10, '0');
    return `ZI-${digits}`;
  }

  private statusFlags(statusLevel: string) {
    const level = (statusLevel || '').toLowerCase();
    const delivered = level.includes('delivered') && !level.includes('out for');
    const outForDelivery =
      level.includes('out for delivery') ||
      (level.includes('delivery') && !delivered);
    const inTransit =
      delivered ||
      outForDelivery ||
      level.includes('transit') ||
      level.includes('hold');
    const processing =
      inTransit || level.includes('process') || level.includes('depart');
    return {
      ordered: true,
      processing,
      inTransit,
      outForDelivery: delivered || outForDelivery,
      delivered,
    };
  }

  buildTimeline(
    dto: {
      cityOfDeparture: string;
      destination: string;
      currentLocation: string;
      statusLevel: string;
      shipmentHistory?: string;
    },
    options: {
      now: string;
      previous?: ShipmentHistoryItem[];
      createdAt?: string;
    },
  ): ShipmentHistoryItem[] {
    const flags = this.statusFlags(dto.statusLevel);
    const previous = options.previous || [];
    const findPrev = (label: string) =>
      previous.find((item) => item.label === label);

    const stamp = (
      label: string,
      detail: string,
      done: boolean,
      fallbackAt?: string,
    ): ShipmentHistoryItem => {
      const prev = findPrev(label);
      if (!done) {
        return { label, detail, at: '', done: false };
      }
      if (prev?.done && prev.at) {
        return { label, detail, at: prev.at, done: true };
      }
      return {
        label,
        detail,
        at: fallbackAt || options.now,
        done: true,
      };
    };

    return [
      stamp(
        'Ordered',
        dto.shipmentHistory ||
          `Shipment ordered from ${dto.cityOfDeparture}`,
        flags.ordered,
        options.createdAt || options.now,
      ),
      stamp('Departed', `Left ${dto.cityOfDeparture}`, flags.processing),
      stamp(
        'In transit',
        `Current location: ${dto.currentLocation}`,
        flags.inTransit,
      ),
      stamp(
        'Out for delivery',
        `Approaching ${dto.destination}`,
        flags.outForDelivery,
      ),
      stamp('Delivered', `Delivered to ${dto.destination}`, flags.delivered),
    ];
  }

  private toShipmentView(doc: ShipmentDocument) {
    const obj = doc.toObject();
    return {
      id: String(doc._id),
      trackingCode: obj.trackingCode,
      senderName: obj.senderName,
      senderAddress: obj.senderAddress,
      senderEmail: obj.senderEmail,
      receiverName: obj.receiverName,
      receiverAddress: obj.receiverAddress,
      receiverEmail: obj.receiverEmail,
      parcelDetails: obj.parcelDetails,
      weight: obj.weight,
      cityOfDeparture: obj.cityOfDeparture,
      dateOfDeparture: obj.dateOfDeparture,
      estimatedDateOfArrival: obj.estimatedDateOfArrival,
      currentLocation: obj.currentLocation,
      deliveryStatus: obj.deliveryStatus,
      statusLevel: obj.statusLevel,
      amountPaid: obj.amountPaid,
      destination: obj.destination,
      mode: obj.mode,
      shipmentHistory: obj.shipmentHistory,
      timeline: obj.timeline || [],
      createdAt:
        doc.get('createdAt')?.toISOString?.() ||
        new Date().toISOString(),
      updatedAt:
        doc.get('updatedAt')?.toISOString?.() ||
        new Date().toISOString(),
    };
  }

  private async seedDemo() {
    const demo: CreateShipmentDto = {
      trackingCode: 'ZI-2653238813',
      senderName: 'James Carter',
      senderAddress: '379 Hudson St, New York, NY 10018, USA',
      senderEmail: 'james.carter@example.com',
      receiverName: 'Amina Okoro',
      receiverAddress: '12 Admiralty Way, Lagos, Nigeria',
      receiverEmail: 'amina.okoro@example.com',
      parcelDetails: 'Electronics — sealed carton, fragile handling required.',
      weight: '8.2 kg',
      cityOfDeparture: 'New York',
      dateOfDeparture: '2026-07-10',
      estimatedDateOfArrival: '2026-07-25',
      currentLocation: 'Afghanistan',
      deliveryStatus: 'Package in transit to destination hub',
      statusLevel: 'In Transit',
      amountPaid: '$245.00',
      destination: 'Lagos, Nigeria',
      mode: 'plane',
      shipmentHistory:
        'Shipment created and accepted at Zonei International Logistics New York hub.',
    };
    await this.create(demo);
  }

  async findAll() {
    const docs = await this.shipmentModel.find().sort({ updatedAt: -1 }).exec();
    return docs.map((doc) => this.toShipmentView(doc));
  }

  async findOne(id: string) {
    const doc = await this.shipmentModel.findById(id).exec();
    if (!doc) throw new NotFoundException('Shipment not found.');
    return this.toShipmentView(doc);
  }

  async findByTrackingCode(code: string) {
    const normalized = this.normalizeTrackingCode(code);
    const raw = code.trim().toUpperCase();
    const doc = await this.shipmentModel
      .findOne({
        $or: [{ trackingCode: normalized }, { trackingCode: raw }],
      })
      .exec();
    if (!doc) {
      throw new NotFoundException(
        'No shipment found for that tracking code. Check the code and try again.',
      );
    }
    return this.toShipmentView(doc);
  }

  async create(dto: CreateShipmentDto) {
    const now = new Date().toISOString();
    const trackingCode = this.normalizeTrackingCode(dto.trackingCode);
    const created = await this.shipmentModel.create({
      trackingCode,
      senderName: dto.senderName,
      senderAddress: dto.senderAddress,
      senderEmail: dto.senderEmail,
      receiverName: dto.receiverName,
      receiverAddress: dto.receiverAddress,
      receiverEmail: dto.receiverEmail,
      parcelDetails: dto.parcelDetails,
      weight: dto.weight,
      cityOfDeparture: dto.cityOfDeparture,
      dateOfDeparture: dto.dateOfDeparture,
      estimatedDateOfArrival: dto.estimatedDateOfArrival,
      currentLocation: dto.currentLocation,
      deliveryStatus: dto.deliveryStatus,
      statusLevel: dto.statusLevel,
      amountPaid: dto.amountPaid,
      destination: dto.destination,
      mode: dto.mode || 'plane',
      shipmentHistory: dto.shipmentHistory || '',
      timeline: this.buildTimeline(dto, { now, createdAt: now }),
    });
    return this.toShipmentView(created);
  }

  async update(id: string, dto: UpdateShipmentDto) {
    const current = await this.shipmentModel.findById(id).exec();
    if (!current) throw new NotFoundException('Shipment not found.');

    const { trackingCode: _ignored, ...safeDto } = dto;
    const now = new Date().toISOString();
    Object.assign(current, safeDto);
    if (!current.mode) current.mode = 'plane';
    current.timeline = this.buildTimeline(
      {
        cityOfDeparture: current.cityOfDeparture,
        destination: current.destination,
        currentLocation: current.currentLocation,
        statusLevel: current.statusLevel,
        shipmentHistory: current.shipmentHistory,
      },
      {
        now,
        previous: (current.timeline || []) as ShipmentHistoryItem[],
        createdAt:
          current.get('createdAt')?.toISOString?.() || now,
      },
    );
    await current.save();
    return this.toShipmentView(current);
  }

  async remove(id: string) {
    const result = await this.shipmentModel.findByIdAndDelete(id).exec();
    if (!result) throw new NotFoundException('Shipment not found.');
    return { success: true as const, id };
  }

  toPublicView(shipment: {
    id: string;
    trackingCode: string;
    deliveryStatus: string;
    statusLevel: string;
    cityOfDeparture: string;
    destination: string;
    mode: string;
    weight: string;
    currentLocation: string;
    estimatedDateOfArrival: string;
    dateOfDeparture: string;
    amountPaid: string;
    parcelDetails: string;
    shipmentHistory: string;
    senderName: string;
    senderAddress: string;
    senderEmail: string;
    receiverName: string;
    receiverAddress: string;
    receiverEmail: string;
    timeline: ShipmentHistoryItem[];
    updatedAt: string;
  }) {
    return {
      success: true,
      code: shipment.trackingCode,
      id: shipment.id,
      status: shipment.deliveryStatus,
      statusLevel: shipment.statusLevel,
      origin: shipment.cityOfDeparture,
      destination: shipment.destination,
      mode: shipment.mode,
      weight: shipment.weight,
      currentLocation: shipment.currentLocation,
      estimatedDelivery: shipment.estimatedDateOfArrival,
      dateOfDeparture: shipment.dateOfDeparture,
      amountPaid: shipment.amountPaid,
      parcelDetails: shipment.parcelDetails,
      shipmentHistory: shipment.shipmentHistory,
      sender: {
        name: shipment.senderName,
        address: shipment.senderAddress,
        email: shipment.senderEmail,
      },
      receiver: {
        name: shipment.receiverName,
        address: shipment.receiverAddress,
        email: shipment.receiverEmail,
      },
      timeline: shipment.timeline,
      updatedAt: shipment.updatedAt,
      message: shipment.deliveryStatus,
    };
  }
}
