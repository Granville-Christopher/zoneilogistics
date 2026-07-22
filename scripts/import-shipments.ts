/**
 * Import previous database dump into MongoDB.
 *
 * Usage:
 *   npx ts-node -r tsconfig-paths/register scripts/import-shipments.ts path/to/dump.json
 *
 * Accepts:
 * - JSON array of documents
 * - Mongo export JSON / JSONL
 * - Our app format OR common legacy courier field names
 */
import { config } from 'dotenv';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import mongoose from 'mongoose';

config({ path: resolve(process.cwd(), '.env') });
config({ path: resolve(process.cwd(), '.env.local') });

const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/zoneiintl';

type AnyRecord = Record<string, unknown>;

function pick(row: AnyRecord, keys: string[], fallback = ''): string {
  for (const key of keys) {
    const value = row[key];
    if (value !== undefined && value !== null && String(value).trim() !== '') {
      return String(value).trim();
    }
  }
  return fallback;
}

function normalizeTrackingCode(code?: string) {
  const raw = (code || `${Date.now()}`).trim().toUpperCase();
  if (/^ZI-\d{8,14}$/.test(raw)) return raw;
  const digits = raw.replace(/\D/g, '').slice(-10).padStart(10, '0');
  return `ZI-${digits}`;
}

function mapRow(row: AnyRecord) {
  const trackingCode = normalizeTrackingCode(
    pick(row, [
      'trackingCode',
      'tracking_code',
      'trackingId',
      'tracking_id',
      'track_no',
      'trackNo',
      'code',
    ]),
  );

  return {
    trackingCode,
    senderName: pick(row, ['senderName', 'sender_name', 'sname', 'from_name'], 'Unknown Sender'),
    senderAddress: pick(row, ['senderAddress', 'sender_address', 'saddress', 'from_address'], 'N/A'),
    senderEmail: pick(row, ['senderEmail', 'sender_email', 'semail', 'from_email'], 'info@zoneiintl.com'),
    receiverName: pick(row, ['receiverName', 'receiver_name', 'rname', 'to_name'], 'Unknown Receiver'),
    receiverAddress: pick(row, ['receiverAddress', 'receiver_address', 'raddress', 'to_address'], 'N/A'),
    receiverEmail: pick(row, ['receiverEmail', 'receiver_email', 'remail', 'to_email'], 'info@zoneiintl.com'),
    parcelDetails: pick(row, ['parcelDetails', 'parcel_details', 'parcel', 'description', 'product'], 'Parcel'),
    weight: pick(row, ['weight', 'parcel_weight'], 'N/A'),
    cityOfDeparture: pick(row, ['cityOfDeparture', 'city_of_departure', 'origin', 'departure_city'], 'N/A'),
    dateOfDeparture: pick(row, ['dateOfDeparture', 'date_of_departure', 'departure_date', 'ship_date'], ''),
    estimatedDateOfArrival: pick(row, ['estimatedDateOfArrival', 'estimated_date_of_arrival', 'arrival_date', 'eta'], ''),
    currentLocation: pick(row, ['currentLocation', 'current_location', 'location'], 'In transit'),
    deliveryStatus: pick(row, ['deliveryStatus', 'delivery_status', 'status_text', 'status_message'], 'In transit'),
    statusLevel: pick(row, ['statusLevel', 'status_level', 'status'], 'Ordered'),
    amountPaid: pick(row, ['amountPaid', 'amount_paid', 'amount', 'price'], '0'),
    destination: pick(row, ['destination', 'dest', 'to_city'], 'N/A'),
    mode: pick(row, ['mode', 'freight_mode', 'transport'], 'plane'),
    shipmentHistory: pick(row, ['shipmentHistory', 'shipment_history', 'history', 'notes'], ''),
    timeline: Array.isArray(row.timeline) ? row.timeline : [],
  };
}

function parseDump(raw: string): AnyRecord[] {
  const trimmed = raw.trim();
  if (!trimmed) return [];

  // JSON array
  if (trimmed.startsWith('[')) {
    const parsed = JSON.parse(trimmed);
    return Array.isArray(parsed) ? parsed : [];
  }

  // Single object
  if (trimmed.startsWith('{')) {
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) return parsed;
      if (parsed && typeof parsed === 'object') {
        if (Array.isArray((parsed as AnyRecord).shipments)) {
          return (parsed as AnyRecord).shipments as AnyRecord[];
        }
        if (Array.isArray((parsed as AnyRecord).data)) {
          return (parsed as AnyRecord).data as AnyRecord[];
        }
        return [parsed as AnyRecord];
      }
    } catch {
      // JSONL fallback below
    }
  }

  // JSONL / NDJSON
  return trimmed
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => JSON.parse(line) as AnyRecord);
}

async function main() {
  const fileArg = process.argv[2];
  if (!fileArg) {
    console.error('Usage: npx ts-node scripts/import-shipments.ts <dump-file.json>');
    process.exit(1);
  }

  const filePath = resolve(process.cwd(), fileArg);
  const raw = readFileSync(filePath, 'utf8');
  const rows = parseDump(raw);
  if (!rows.length) {
    console.error('No records found in dump file.');
    process.exit(1);
  }

  console.log(`Connecting to MongoDB: ${uri}`);
  await mongoose.connect(uri);

  const collection = mongoose.connection.collection('shipments');
  let upserted = 0;
  let skipped = 0;

  for (const row of rows) {
    const mapped = mapRow(row);
    if (!mapped.trackingCode) {
      skipped += 1;
      continue;
    }
    await collection.updateOne(
      { trackingCode: mapped.trackingCode },
      {
        $set: {
          ...mapped,
          updatedAt: new Date(),
        },
        $setOnInsert: {
          createdAt: new Date(),
        },
      },
      { upsert: true },
    );
    upserted += 1;
  }

  console.log(`Import complete. Upserted: ${upserted}. Skipped: ${skipped}.`);
  await mongoose.disconnect();
}

main().catch(async (error) => {
  console.error(error);
  try {
    await mongoose.disconnect();
  } catch {
    // ignore
  }
  process.exit(1);
});
