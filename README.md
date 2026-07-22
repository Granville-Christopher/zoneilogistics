# Zonei International Logistics

Rebrand of [zoneiintl.com](https://zoneiintl.com) — NestJS courier & freight shipping website.

**Zonei International Logistics** provides international and local courier service solutions worldwide. We ship only (no shop-and-ship).

## Pages

1. `/` — Home (hero track + visuals)
2. `/about.html` — About Zonei
3. `/services.html` — Freight services
4. `/track.html` — Track Package form
5. `/package.html?code=` — Package status page (full shipment details)
6. `/contact.html` — Contact & quote
7. `/admin/index.html` — Admin dashboard (table, edit, receipt, delete)
8. `/admin/new.html` — Create shipment
9. `/admin/edit.html?id=` — Edit shipment
10. `/admin/receipt.html?id=` — View / print receipt

## Database (MongoDB)

Set `MONGODB_URI` in `.env`:

```env
MONGODB_URI=mongodb://127.0.0.1:27017/zoneiintl
```

Or use MongoDB Atlas:

```env
MONGODB_URI=mongodb+srv://USER:PASSWORD@cluster0.xxxxx.mongodb.net/zoneiintl?retryWrites=true&w=majority
```

### Import previous database dump

Put your old export in the project (JSON / JSONL / mongoexport), then run:

```bash
npm run import:shipments -- path/to/your-old-dump.json
```

Supported field names include both the new schema and common legacy courier fields (`tracking_code`, `sender_name`, `receiver_email`, etc.).

## Brand

- Company: **Zonei International Logistics**
- Colors: dark blue, blue, white
- Logo: `public/assets/a.jpg`
- Contact: 8th floor, 379 Hudson St, New York, NY 10018 · info@zoneiintl.com

## Freight modes

Plane · Ship · Train · Truck

## Run locally

```bash
npm install
npm run start:dev
```

Open [http://localhost:3000](http://localhost:3000).

## API

- `POST /api/quotes` — shipping quote request
- `GET /api/track/:code` — track a shipment (e.g. `291220112`)
