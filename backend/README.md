# Inventory Management — Backend

Express + SQLite REST API for the Inventory Management System.

## Requirements

- Node.js 18 or later

## Setup

```bash
cd backend
npm install
```

## Run

**Development** (auto-restarts on file changes — Node 18+):
```bash
npm run dev
```

**Production:**
```bash
npm start
```

The server starts on **http://localhost:3000** by default.  
Set the `PORT` environment variable to use a different port.

## API Endpoints

| Method | Path                    | Description                              |
|--------|-------------------------|------------------------------------------|
| GET    | `/api/inventory`        | List all products                        |
| GET    | `/api/inventory/:id`    | Get one product by ID                    |
| POST   | `/api/inventory`        | Create a new product                     |
| PUT    | `/api/inventory/:id`    | Update a product                         |
| DELETE | `/api/inventory/:id`    | Delete a product                         |
| GET    | `/api/stats`            | KPI summary (totals, low stock, value)   |

## POST / PUT Request Body (JSON)

```json
{
  "product_code": "PRD-021",
  "name":         "Sample Product",
  "category":     "Electronics",
  "quantity":     50,
  "unit_price":   29.99
}
```

`status` is calculated automatically from `quantity`:
- `> 10` → **In Stock**
- `1–10` → **Low Stock**
- `0`    → **Out of Stock**

## Database

SQLite file is created automatically at `backend/data/inventory.db` on first run.  
The 20 seed products are inserted only when the table is empty.

To reset and re-seed, delete `backend/data/inventory.db` and restart the server.
