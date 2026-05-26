'use strict';

/**
 * database.js — PostgreSQL schema bootstrap + seed data
 *
 * Exports:
 *   dbPromise  — resolves to { db, save } once all tables exist and seeds are loaded.
 *                save() is a no-op; pg commits immediately on every query.
 *   calcStatus — helper used by inventory routes to compute stock status label.
 */

const { db } = require('./db');

function calcStatus(qty) {
  if (qty === 0)  return 'Out of Stock';
  if (qty <= 10)  return 'Low Stock';
  return 'In Stock';
}

const seedProducts = [
  { product_code: 'PRD-001', name: 'Wireless Keyboard',           category: 'Electronics',     quantity: 45,  unit_price: 79.99  },
  { product_code: 'PRD-002', name: 'USB-C Hub 7-Port',            category: 'Electronics',     quantity: 7,   unit_price: 49.99  },
  { product_code: 'PRD-003', name: 'Ergonomic Office Chair',      category: 'Furniture',       quantity: 0,   unit_price: 299.99 },
  { product_code: 'PRD-004', name: 'A4 Copy Paper (500 Sheets)',  category: 'Stationery',      quantity: 230, unit_price: 12.50  },
  { product_code: 'PRD-005', name: 'Ballpoint Pens (12-Pack)',    category: 'Stationery',      quantity: 6,   unit_price: 8.99   },
  { product_code: 'PRD-006', name: 'Height-Adj. Standing Desk',   category: 'Furniture',       quantity: 12,  unit_price: 549.99 },
  { product_code: 'PRD-007', name: 'Monitor 24" FHD IPS',        category: 'Electronics',     quantity: 18,  unit_price: 349.99 },
  { product_code: 'PRD-008', name: 'Heavy Duty Stapler',          category: 'Stationery',      quantity: 0,   unit_price: 15.99  },
  { product_code: 'PRD-009', name: 'Laptop Riser Stand',          category: 'Electronics',     quantity: 5,   unit_price: 89.99  },
  { product_code: 'PRD-010', name: '4-Drawer Filing Cabinet',     category: 'Furniture',       quantity: 9,   unit_price: 199.99 },
  { product_code: 'PRD-011', name: 'Magnetic Whiteboard 4x3ft',   category: 'Office Supplies', quantity: 22,  unit_price: 129.99 },
  { product_code: 'PRD-012', name: 'Printer Paper (5-Ream Case)', category: 'Stationery',      quantity: 85,  unit_price: 45.00  },
  { product_code: 'PRD-013', name: 'Printer Toner Cartridge Blk', category: 'Office Supplies', quantity: 3,   unit_price: 89.99  },
  { product_code: 'PRD-014', name: 'Ergonomic Wireless Mouse',    category: 'Electronics',     quantity: 34,  unit_price: 65.99  },
  { product_code: 'PRD-015', name: 'Conference Room Table',       category: 'Furniture',       quantity: 2,   unit_price: 899.99 },
  { product_code: 'PRD-016', name: 'Notebook A5 (Pack of 6)',     category: 'Stationery',      quantity: 180, unit_price: 5.99   },
  { product_code: 'PRD-017', name: 'HDMI Cable 2m',               category: 'Electronics',     quantity: 28,  unit_price: 19.99  },
  { product_code: 'PRD-018', name: 'Cable Management Tray',       category: 'Office Supplies', quantity: 15,  unit_price: 35.99  },
  { product_code: 'PRD-019', name: 'Dry-Erase Markers Set (12)',  category: 'Stationery',      quantity: 0,   unit_price: 12.99  },
  { product_code: 'PRD-020', name: 'Webcam 1080p HD USB',         category: 'Electronics',     quantity: 6,   unit_price: 129.99 },
];

// Resolves to { db, save } once the schema and seed data are ready.
const dbPromise = (async () => {

  // ── Schema ─────────────────────────────────────────────────────
  await db.run(`
    CREATE TABLE IF NOT EXISTS products (
      id           SERIAL       PRIMARY KEY,
      product_code TEXT         NOT NULL UNIQUE,
      name         TEXT         NOT NULL,
      category     TEXT         NOT NULL,
      quantity     INTEGER      NOT NULL DEFAULT 0,
      unit_price   REAL         NOT NULL,
      status       TEXT         NOT NULL DEFAULT 'In Stock',
      created_at   TIMESTAMPTZ  DEFAULT NOW(),
      updated_at   TIMESTAMPTZ  DEFAULT NOW()
    )
  `);

  await db.run(`
    CREATE TABLE IF NOT EXISTS spare_parts (
      id            SERIAL      PRIMARY KEY,
      name          TEXT        NOT NULL,
      part_no       TEXT        NOT NULL UNIQUE,
      category      TEXT        NOT NULL DEFAULT 'Spare Parts',
      machine       TEXT        NOT NULL DEFAULT '',
      on_hand       INTEGER     NOT NULL DEFAULT 0,
      on_order      INTEGER     NOT NULL DEFAULT 0,
      monthly_usage REAL        NOT NULL DEFAULT 0,
      lead_time     REAL        NOT NULL DEFAULT 0,
      buffer        REAL        NOT NULL DEFAULT 3,
      safety_stock  REAL        NOT NULL DEFAULT 1,
      created_at    TIMESTAMPTZ DEFAULT NOW(),
      updated_at    TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  await db.run(`
    CREATE TABLE IF NOT EXISTS local_purchases (
      id            SERIAL      PRIMARY KEY,
      po_number     TEXT        NOT NULL DEFAULT '',
      part_name     TEXT        NOT NULL DEFAULT '',
      supplier      TEXT        NOT NULL DEFAULT '',
      qty_ordered   REAL        NOT NULL DEFAULT 0,
      unit_price    REAL        NOT NULL DEFAULT 0,
      total         REAL        NOT NULL DEFAULT 0,
      order_date    TEXT        NOT NULL DEFAULT '',
      expected_date TEXT        NOT NULL DEFAULT '',
      status        TEXT        NOT NULL DEFAULT 'Pending',
      remarks       TEXT        NOT NULL DEFAULT '',
      created_at    TIMESTAMPTZ DEFAULT NOW(),
      updated_at    TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  await db.run(`
    CREATE TABLE IF NOT EXISTS supplier_2303_files (
      id            SERIAL      PRIMARY KEY,
      supplier_id   INTEGER     NOT NULL DEFAULT 0,
      supplier_name TEXT        NOT NULL DEFAULT '',
      remarks       TEXT        NOT NULL DEFAULT '',
      file_name     TEXT        NOT NULL DEFAULT '',
      file_path     TEXT        NOT NULL DEFAULT '',
      uploaded_at   TIMESTAMPTZ DEFAULT NOW(),
      updated_at    TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  await db.run(`
    CREATE TABLE IF NOT EXISTS categories (
      id            SERIAL      PRIMARY KEY,
      name          TEXT        NOT NULL UNIQUE,
      specification TEXT        NOT NULL DEFAULT '',
      quantity      INTEGER     NOT NULL DEFAULT 0,
      created_at    TIMESTAMPTZ DEFAULT NOW(),
      updated_at    TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  await db.run(`
    CREATE TABLE IF NOT EXISTS suppliers (
      id              SERIAL      PRIMARY KEY,
      code            TEXT        NOT NULL UNIQUE,
      name            TEXT        NOT NULL,
      contact_person  TEXT        NOT NULL DEFAULT '',
      role            TEXT        NOT NULL DEFAULT '',
      email           TEXT        NOT NULL DEFAULT '',
      phone           TEXT        NOT NULL DEFAULT '',
      category        TEXT        NOT NULL DEFAULT '',
      location        TEXT        NOT NULL DEFAULT '',
      status          TEXT        NOT NULL DEFAULT 'Active',
      file_2303_name  TEXT        NOT NULL DEFAULT '',
      file_2303_path  TEXT        NOT NULL DEFAULT '',
      created_at      TIMESTAMPTZ DEFAULT NOW(),
      updated_at      TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  await db.run(`
    CREATE TABLE IF NOT EXISTS purchase_orders (
      id           SERIAL      PRIMARY KEY,
      po_number    TEXT        NOT NULL UNIQUE,
      supplier     TEXT        NOT NULL DEFAULT '',
      order_date   TEXT        NOT NULL DEFAULT '',
      status       TEXT        NOT NULL DEFAULT 'Pending',
      total_amount REAL        NOT NULL DEFAULT 0,
      file_name    TEXT,
      file_path    TEXT,
      created_at   TIMESTAMPTZ DEFAULT NOW(),
      updated_at   TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  await db.run(`
    CREATE TABLE IF NOT EXISTS goods_received (
      id            SERIAL      PRIMARY KEY,
      gr_number     TEXT        NOT NULL UNIQUE,
      po_number     TEXT        NOT NULL DEFAULT '',
      supplier      TEXT        NOT NULL DEFAULT '',
      received_date TEXT        NOT NULL DEFAULT '',
      received_by   TEXT        NOT NULL DEFAULT '',
      status        TEXT        NOT NULL DEFAULT 'Pending',
      total_items   INTEGER     NOT NULL DEFAULT 0,
      created_at    TIMESTAMPTZ DEFAULT NOW(),
      updated_at    TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  await db.run(`
    CREATE TABLE IF NOT EXISTS stock_transfers (
      id                   SERIAL      PRIMARY KEY,
      transfer_no          TEXT        NOT NULL UNIQUE,
      transfer_date        TEXT        NOT NULL DEFAULT '',
      source_location      TEXT        NOT NULL DEFAULT '',
      destination_location TEXT        NOT NULL DEFAULT '',
      items_count          INTEGER     NOT NULL DEFAULT 0,
      status               TEXT        NOT NULL DEFAULT 'Pending',
      transferred_by       TEXT        NOT NULL DEFAULT '',
      created_at           TIMESTAMPTZ DEFAULT NOW(),
      updated_at           TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  await db.run(`
    CREATE TABLE IF NOT EXISTS pullout_receipts (
      id                   SERIAL      PRIMARY KEY,
      transfer_no          TEXT        NOT NULL UNIQUE,
      transfer_date        TEXT        NOT NULL DEFAULT '',
      source_location      TEXT        NOT NULL DEFAULT '',
      destination_location TEXT        NOT NULL DEFAULT '',
      items_count          INTEGER     NOT NULL DEFAULT 0,
      status               TEXT        NOT NULL DEFAULT 'Pending',
      pulled_out_by        TEXT        NOT NULL DEFAULT '',
      prepared_by          TEXT        NOT NULL DEFAULT '',
      returned_by          TEXT        NOT NULL DEFAULT '',
      witnessed_by         TEXT        NOT NULL DEFAULT '',
      created_at           TIMESTAMPTZ DEFAULT NOW(),
      updated_at           TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  await db.run(`
    CREATE TABLE IF NOT EXISTS transmittal_receipts (
      id                   SERIAL      PRIMARY KEY,
      transfer_no          TEXT        NOT NULL UNIQUE,
      transfer_date        TEXT        NOT NULL DEFAULT '',
      source_location      TEXT        NOT NULL DEFAULT '',
      destination_location TEXT        NOT NULL DEFAULT '',
      items_count          INTEGER     NOT NULL DEFAULT 0,
      status               TEXT        NOT NULL DEFAULT 'Pending',
      turned_over_by       TEXT        NOT NULL DEFAULT '',
      received_by          TEXT        NOT NULL DEFAULT '',
      witnessed_by         TEXT        NOT NULL DEFAULT '',
      noted_by             TEXT        NOT NULL DEFAULT '',
      created_at           TIMESTAMPTZ DEFAULT NOW(),
      updated_at           TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  await db.run(`
    CREATE TABLE IF NOT EXISTS trucking_quotations (
      id               SERIAL      PRIMARY KEY,
      quote_number     TEXT        NOT NULL UNIQUE,
      trucking_service TEXT        NOT NULL DEFAULT '',
      date_of_activity TEXT        NOT NULL DEFAULT '',
      sites            TEXT        NOT NULL DEFAULT '',
      total_amount     REAL        NOT NULL DEFAULT 0,
      status           TEXT        NOT NULL DEFAULT 'Pending',
      file_name        TEXT        DEFAULT '',
      file_path        TEXT        DEFAULT '',
      created_at       TIMESTAMPTZ DEFAULT NOW(),
      updated_at       TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  await db.run(`
    CREATE TABLE IF NOT EXISTS manpower_requests (
      id                SERIAL      PRIMARY KEY,
      request_no        TEXT        NOT NULL UNIQUE,
      location          TEXT        NOT NULL DEFAULT '',
      machine_type      TEXT        NOT NULL DEFAULT '',
      machine_quantity  INTEGER     NOT NULL DEFAULT 0,
      manpower_quantity INTEGER     NOT NULL DEFAULT 0,
      purpose           TEXT        NOT NULL DEFAULT '',
      unit_price        REAL        NOT NULL DEFAULT 0,
      remarks           TEXT        NOT NULL DEFAULT '',
      total             REAL        NOT NULL DEFAULT 0,
      file_name         TEXT        DEFAULT '',
      file_path         TEXT        DEFAULT '',
      created_at        TIMESTAMPTZ DEFAULT NOW(),
      updated_at        TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  await db.run(`
    CREATE TABLE IF NOT EXISTS sites_activity (
      id             SERIAL      PRIMARY KEY,
      site_name      TEXT        NOT NULL DEFAULT '',
      activity_type  TEXT        NOT NULL DEFAULT 'Delivery',
      activity_date  TEXT        NOT NULL DEFAULT '',
      location       TEXT        NOT NULL DEFAULT '',
      description    TEXT        NOT NULL DEFAULT '',
      status         TEXT        NOT NULL DEFAULT 'Scheduled',
      file_name      TEXT        DEFAULT '',
      file_path      TEXT        DEFAULT '',
      created_at     TIMESTAMPTZ DEFAULT NOW(),
      updated_at     TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  await db.run(`
    CREATE TABLE IF NOT EXISTS waybills (
      id             SERIAL      PRIMARY KEY,
      waybill_number TEXT        NOT NULL UNIQUE,
      date           TEXT        NOT NULL DEFAULT '',
      origin         TEXT        NOT NULL DEFAULT '',
      destination    TEXT        NOT NULL DEFAULT '',
      notes          TEXT        NOT NULL DEFAULT '',
      file_name      TEXT        DEFAULT '',
      file_path      TEXT        DEFAULT '',
      created_at     TIMESTAMPTZ DEFAULT NOW(),
      updated_at     TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  await db.run(`
    CREATE TABLE IF NOT EXISTS calendar_tasks (
      id          SERIAL      PRIMARY KEY,
      task_date   TEXT        NOT NULL,
      title       TEXT        NOT NULL,
      description TEXT        NOT NULL DEFAULT '',
      category    TEXT        NOT NULL DEFAULT 'General',
      priority    TEXT        NOT NULL DEFAULT 'Medium',
      status      TEXT        NOT NULL DEFAULT 'Pending',
      color       TEXT        NOT NULL DEFAULT '#6366f1',
      created_at  TIMESTAMPTZ DEFAULT NOW(),
      updated_at  TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  // Migrations
  await db.run(`ALTER TABLE calendar_tasks ADD COLUMN IF NOT EXISTS task_time TEXT DEFAULT NULL`);
  await db.run(`ALTER TABLE calendar_tasks ADD COLUMN IF NOT EXISTS task_end_date TEXT DEFAULT NULL`);

  await db.run(`
    CREATE TABLE IF NOT EXISTS line_config (
      id            INTEGER     PRIMARY KEY CHECK (id = 1),
      channel_token TEXT        NOT NULL DEFAULT '',
      user_id       TEXT        NOT NULL DEFAULT '',
      auto_notify   INTEGER     NOT NULL DEFAULT 0,
      updated_at    TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  await db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id         SERIAL      PRIMARY KEY,
      name       TEXT        NOT NULL,
      email      TEXT        NOT NULL UNIQUE,
      role       TEXT        NOT NULL DEFAULT 'Staff',
      password   TEXT        NOT NULL DEFAULT 'password123',
      status     TEXT        NOT NULL DEFAULT 'Active',
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  await db.run(`
    CREATE TABLE IF NOT EXISTS machine_monitoring (
      id          SERIAL      PRIMARY KEY,
      site        TEXT        NOT NULL,
      group_name  TEXT        NOT NULL DEFAULT '',
      area        TEXT        NOT NULL DEFAULT 'Manila Area',
      ez          INTEGER     NOT NULL DEFAULT 0,
      br          INTEGER     NOT NULL DEFAULT 0,
      ez2         INTEGER     NOT NULL DEFAULT 0,
      ezl         INTEGER     NOT NULL DEFAULT 0,
      lb          INTEGER     NOT NULL DEFAULT 0,
      j_ark       INTEGER     NOT NULL DEFAULT 0,
      total       INTEGER     NOT NULL DEFAULT 0,
      created_at  TIMESTAMPTZ DEFAULT NOW(),
      updated_at  TIMESTAMPTZ DEFAULT NOW()
    )
  `);


  await db.run(`
    CREATE TABLE IF NOT EXISTS commercial_invoices (
      id                 SERIAL      PRIMARY KEY,
      ci_number          TEXT        NOT NULL UNIQUE,
      supplier           TEXT        NOT NULL DEFAULT '',
      invoice_date       TEXT        NOT NULL DEFAULT '',
      currency           TEXT        NOT NULL DEFAULT 'USD',
      total_amount       REAL        NOT NULL DEFAULT 0,
      goods_description  TEXT        NOT NULL DEFAULT '',
      remarks            TEXT        NOT NULL DEFAULT '',
      status             TEXT        NOT NULL DEFAULT 'Draft',
      file_name          TEXT        NOT NULL DEFAULT '',
      file_path          TEXT        NOT NULL DEFAULT '',
      created_at         TIMESTAMPTZ DEFAULT NOW(),
      updated_at         TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  await db.run(`
    CREATE TABLE IF NOT EXISTS packing_lists (
      id                 SERIAL      PRIMARY KEY,
      pl_number          TEXT        NOT NULL UNIQUE,
      ci_number          TEXT        NOT NULL DEFAULT '',
      shipper            TEXT        NOT NULL DEFAULT '',
      consignee          TEXT        NOT NULL DEFAULT '',
      pl_date            TEXT        NOT NULL DEFAULT '',
      vessel_flight      TEXT        NOT NULL DEFAULT '',
      bl_awb_number      TEXT        NOT NULL DEFAULT '',
      total_packages     INTEGER     NOT NULL DEFAULT 0,
      total_net_weight   REAL        NOT NULL DEFAULT 0,
      total_gross_weight REAL        NOT NULL DEFAULT 0,
      total_cbm          REAL        NOT NULL DEFAULT 0,
      remarks            TEXT        NOT NULL DEFAULT '',
      status             TEXT        NOT NULL DEFAULT 'Draft',
      file_name          TEXT        NOT NULL DEFAULT '',
      file_path          TEXT        NOT NULL DEFAULT '',
      created_at         TIMESTAMPTZ DEFAULT NOW(),
      updated_at         TIMESTAMPTZ DEFAULT NOW()
    )
  `);


  // ── Migrate pullout_receipts: rename transferred_by → pulled_out_by, add new columns ──
  try {
    await db.run(`ALTER TABLE pullout_receipts RENAME COLUMN transferred_by TO pulled_out_by`);
  } catch (_) { /* already renamed or column doesn't exist */ }
  try {
    await db.run(`ALTER TABLE pullout_receipts ADD COLUMN IF NOT EXISTS pulled_out_by TEXT NOT NULL DEFAULT ''`);
    await db.run(`ALTER TABLE pullout_receipts ADD COLUMN IF NOT EXISTS prepared_by TEXT NOT NULL DEFAULT ''`);
    await db.run(`ALTER TABLE pullout_receipts ADD COLUMN IF NOT EXISTS returned_by TEXT NOT NULL DEFAULT ''`);
    await db.run(`ALTER TABLE pullout_receipts ADD COLUMN IF NOT EXISTS witnessed_by TEXT NOT NULL DEFAULT ''`);
  } catch (_) {}

  // 🔧 Migrate transmittal_receipts: rename transferred_by → turned_over_by, add new columns
  try {
    await db.run(`ALTER TABLE transmittal_receipts RENAME COLUMN transferred_by TO turned_over_by`);
  } catch (_) { /* already renamed or column doesn't exist */ }
  try {
    await db.run(`ALTER TABLE transmittal_receipts ADD COLUMN IF NOT EXISTS turned_over_by TEXT NOT NULL DEFAULT ''`);
    await db.run(`ALTER TABLE transmittal_receipts ADD COLUMN IF NOT EXISTS received_by TEXT NOT NULL DEFAULT ''`);
    await db.run(`ALTER TABLE transmittal_receipts ADD COLUMN IF NOT EXISTS witnessed_by TEXT NOT NULL DEFAULT ''`);
    await db.run(`ALTER TABLE transmittal_receipts ADD COLUMN IF NOT EXISTS noted_by TEXT NOT NULL DEFAULT ''`);
  } catch (_) {}

  // ── Add file upload columns to stock_transfers (Delivery Receipts) ──────
  try {
    await db.run(`ALTER TABLE stock_transfers ADD COLUMN IF NOT EXISTS file_name TEXT NOT NULL DEFAULT ''`);
    await db.run(`ALTER TABLE stock_transfers ADD COLUMN IF NOT EXISTS file_path TEXT NOT NULL DEFAULT ''`);
  } catch (_) {}

  // ── Change items_count to TEXT in stock_transfers (Items Definition) ─────
  try {
    await db.run(`ALTER TABLE stock_transfers ALTER COLUMN items_count TYPE TEXT USING items_count::TEXT`);
  } catch (_) {}

  // ── Add file upload columns to pullout & transmittal receipts ───────────
  try {
    await db.run(`ALTER TABLE pullout_receipts ADD COLUMN IF NOT EXISTS file_name TEXT NOT NULL DEFAULT ''`);
    await db.run(`ALTER TABLE pullout_receipts ADD COLUMN IF NOT EXISTS file_path TEXT NOT NULL DEFAULT ''`);
    await db.run(`ALTER TABLE transmittal_receipts ADD COLUMN IF NOT EXISTS file_name TEXT NOT NULL DEFAULT ''`);
    await db.run(`ALTER TABLE transmittal_receipts ADD COLUMN IF NOT EXISTS file_path TEXT NOT NULL DEFAULT ''`);
  } catch (_) {}

  // ── Drop removed CI columns from existing databases ──────────────────────
  try {
    await db.run(`ALTER TABLE commercial_invoices DROP COLUMN IF EXISTS shipment_terms`);
    await db.run(`ALTER TABLE commercial_invoices DROP COLUMN IF EXISTS port_of_loading`);
    await db.run(`ALTER TABLE commercial_invoices DROP COLUMN IF EXISTS port_of_discharge`);
    await db.run(`ALTER TABLE packing_lists DROP COLUMN IF EXISTS port_of_loading`);
    await db.run(`ALTER TABLE packing_lists DROP COLUMN IF EXISTS port_of_discharge`);
    await db.run(`ALTER TABLE packing_lists DROP COLUMN IF EXISTS vessel_flight`);
    await db.run(`ALTER TABLE packing_lists DROP COLUMN IF EXISTS total_cbm`);
    // Add new BL/AWB columns if they don't exist yet
    await db.run(`ALTER TABLE packing_lists ADD COLUMN IF NOT EXISTS bl_awb_details TEXT NOT NULL DEFAULT ''`);
    await db.run(`ALTER TABLE packing_lists ADD COLUMN IF NOT EXISTS bl_awb_file_name TEXT NOT NULL DEFAULT ''`);
    await db.run(`ALTER TABLE packing_lists ADD COLUMN IF NOT EXISTS bl_awb_file_path TEXT NOT NULL DEFAULT ''`);
    await db.run(`ALTER TABLE packing_lists DROP COLUMN IF EXISTS port_of_discharge`);
  } catch (_) {}

  // ── Ensure line_config row exists ──────────────────────────────
  const lcCnt = await db.scalar('SELECT COUNT(*) FROM line_config');
  if (!lcCnt) {
    await db.run("INSERT INTO line_config (id, channel_token, user_id, auto_notify) VALUES (1,'','',0)");
  }

  // ── Seed LINE Channel Access Token on first boot ───────────────
  const LINE_TOKEN = 'u+HdnLwLxmJPe78tx41dTc/kZgAJ4N2OxisNaZqtSYPme0wDowGxG+XULmScf5XbAfsmrluedmUeFDJEBBy3qkhBklGSxV9aY/ELGdhGWMk+RPZtv78Rq9D8JtVOoEk5yrgxPSTV09YJqMzt15a79wdB04t89/1O/w1cDnyilFU=';
  const lcRow = await db.getOne('SELECT channel_token FROM line_config WHERE id=1');
  if (lcRow && !lcRow.channel_token) {
    await db.run("UPDATE line_config SET channel_token=?, auto_notify=1, updated_at=NOW() WHERE id=1", [LINE_TOKEN]);
    console.log('[db] LINE Channel Access Token saved and auto_notify enabled.');
  }

  // ── Seed products ──────────────────────────────────────────────
  const productCnt = await db.scalar('SELECT COUNT(*) FROM products');
  if (productCnt === 0) {
    for (const p of seedProducts) {
      await db.run(
        'INSERT INTO products (product_code, name, category, quantity, unit_price, status) VALUES (?,?,?,?,?,?)',
        [p.product_code, p.name, p.category, p.quantity, p.unit_price, calcStatus(p.quantity)]
      );
    }
    console.log(`[db] Seeded ${seedProducts.length} products.`);
  }

  // ── Seed spare_parts ───────────────────────────────────────────
  const spCnt = await db.scalar('SELECT COUNT(*) FROM spare_parts');
  if (spCnt === 0) {
    const seedSpareParts = [
      { name: 'Elo Monitor',                                part_no: 'ME0010000064', machine: 'EZ1',                    on_hand: 20, on_order: 30, monthly_usage: 10, lead_time: 4,   buffer: 3, safety_stock: 1 },
      { name: 'IPC 2.5',                                    part_no: 'ME0020000416', machine: 'EZ1, EZ2 & BR',          on_hand: 0,  on_order: 0,  monthly_usage: 0,  lead_time: 4,   buffer: 3, safety_stock: 1 },
      { name: '21.5" Touch Monitor (BR)',                   part_no: 'ME0010000413', machine: 'BR, EZ2 & J-Ark',        on_hand: 0,  on_order: 0,  monthly_usage: 0,  lead_time: 4,   buffer: 3, safety_stock: 1 },
      { name: 'BR SERVER (BZ BINGO GAME SERVER(8013))(BR)', part_no: 'A00900000340', machine: 'BR & EZ2',               on_hand: 7,  on_order: 0,  monthly_usage: 1,  lead_time: 4.5, buffer: 3, safety_stock: 1 },
      { name: 'DELL SERVER (J-ARK)',                        part_no: 'ME0020000612', machine: 'J-Ark',                  on_hand: 0,  on_order: 0,  monthly_usage: 0,  lead_time: 3,   buffer: 3, safety_stock: 1 },
      { name: 'Game Server(8013) MODULE (EZ)(EZ2)',         part_no: 'A00900000073', machine: 'EZ & EZ2',               on_hand: 0,  on_order: 0,  monthly_usage: 0,  lead_time: 4.5, buffer: 3, safety_stock: 1 },
      { name: 'Member Server(8013) MODULE (EZ)(EZ2)',       part_no: 'A00900000072', machine: 'EZ & EZ2',               on_hand: 0,  on_order: 0,  monthly_usage: 0,  lead_time: 1.5, buffer: 3, safety_stock: 1 },
      { name: 'MEI BV SC Advance (EZ)',                     part_no: 'ME0160000067', machine: 'EZ & BR',                on_hand: 0,  on_order: 0,  monthly_usage: 0,  lead_time: 3,   buffer: 3, safety_stock: 1 },
      { name: 'JCM iPRO-100-SS Bill Acceptor Head',         part_no: 'ME0160000077', machine: 'EZ & BR',                on_hand: 0,  on_order: 0,  monthly_usage: 0,  lead_time: 3,   buffer: 3, safety_stock: 1 },
      { name: 'Gen5 Universal Ticket Printer',              part_no: 'A00900000417', machine: 'EZ, EZ2, BR & J-Ark',   on_hand: 0,  on_order: 0,  monthly_usage: 0,  lead_time: 3,   buffer: 3, safety_stock: 1 },
      { name: 'Power Supply (BR)',                          part_no: 'ME0120000124', machine: 'BR, EZ2 & J-Ark',        on_hand: 0,  on_order: 0,  monthly_usage: 0,  lead_time: 1,   buffer: 3, safety_stock: 1 },
      { name: 'Redeem Server',                              part_no: 'A00900000076', machine: 'EZ, EZ2, BR & Lounge',  on_hand: 0,  on_order: 0,  monthly_usage: 0,  lead_time: 1,   buffer: 3, safety_stock: 1 },
      { name: 'Horse Racing Jackpot (JPC)',                 part_no: 'A00900000081', machine: 'EZ, EZ Lounge & Lounge', on_hand: 0,  on_order: 0,  monthly_usage: 0,  lead_time: 1.5, buffer: 3, safety_stock: 1 },
      { name: 'Graphic Controller Set (BR)',                part_no: 'A00700000275', machine: 'EZ2 & BR',               on_hand: 7,  on_order: 0,  monthly_usage: 1,  lead_time: 4.5, buffer: 3, safety_stock: 1 },
      { name: 'Gen 5 Bill Acceptor',                        part_no: 'A00900000419', machine: 'EZ, EZ2, BR & J-Ark',   on_hand: 0,  on_order: 0,  monthly_usage: 1,  lead_time: 1,   buffer: 3, safety_stock: 1 },
    ];
    for (const p of seedSpareParts) {
      await db.run(
        `INSERT INTO spare_parts (name, part_no, machine, on_hand, on_order, monthly_usage, lead_time, buffer, safety_stock)
         VALUES (?,?,?,?,?,?,?,?,?)`,
        [p.name, p.part_no, p.machine, p.on_hand, p.on_order, p.monthly_usage, p.lead_time, p.buffer, p.safety_stock]
      );
    }
    console.log(`[db] Seeded ${seedSpareParts.length} spare parts.`);
  }

  // ── Seed categories ────────────────────────────────────────────
  const catCnt = await db.scalar('SELECT COUNT(*) FROM categories');
  if (catCnt === 0) {
    const seedCats = [
      { name: 'EZ1',        specification: 'EZ1 gaming machine spare parts and components',    quantity: 0 },
      { name: 'EZ2',        specification: 'EZ2 gaming machine spare parts and components',    quantity: 0 },
      { name: 'BR',         specification: 'BR gaming machine spare parts and components',     quantity: 0 },
      { name: 'J-Ark',      specification: 'J-Ark gaming machine spare parts and components',  quantity: 0 },
      { name: 'Lounge',     specification: 'Lounge area machine spare parts and components',   quantity: 0 },
      { name: 'EZ Lounge',  specification: 'EZ Lounge machine spare parts and components',     quantity: 0 },
      { name: 'EZ2 Lounge', specification: 'EZ2 Lounge machine spare parts and components',    quantity: 0 },
      { name: 'D27',        specification: 'D27 gaming machine spare parts and components',    quantity: 0 },
      { name: 'P43',        specification: 'P43 gaming machine spare parts and components',    quantity: 0 },
      { name: 'S27',        specification: 'S27 gaming machine spare parts and components',    quantity: 0 },
    ];
    for (const c of seedCats) {
      await db.run('INSERT INTO categories (name, specification, quantity) VALUES (?,?,?)',
        [c.name, c.specification, c.quantity]);
    }
    console.log(`[db] Seeded ${seedCats.length} categories.`);
  }

  // ── Seed suppliers ─────────────────────────────────────────────
  const supCnt = await db.scalar('SELECT COUNT(*) FROM suppliers');
  if (supCnt === 0) {
    const seedSuppliers = [
      { code: 'SUP-0001', name: 'TechSource Global',  contact_person: 'James Carter', role: 'Sales Manager',   email: 'james@techsource.com',  phone: '+1-555-0101', category: 'Electronics',  location: 'New York, USA',   status: 'Active'   },
      { code: 'SUP-0002', name: 'Office World Inc.',  contact_person: 'Maria Santos', role: 'Account Manager', email: 'maria@officeworld.com', phone: '+1-555-0102', category: 'Stationery',   location: 'Chicago, USA',    status: 'Active'   },
      { code: 'SUP-0003', name: 'FurniCraft Co.',     contact_person: 'David Lee',    role: 'Sales Director',  email: 'david@furnicraft.com',  phone: '+63-2-8888',  category: 'Furniture',    location: 'Manila, PH',      status: 'Active'   },
      { code: 'SUP-0004', name: 'Parts Depot PH',     contact_person: 'Ana Reyes',    role: 'Supply Officer',  email: 'ana@partsdepot.ph',     phone: '+63-2-7777',  category: 'Spare Parts',  location: 'Quezon City, PH', status: 'Pending'  },
      { code: 'SUP-0005', name: 'CleanPro Supplies',  contact_person: 'Robert Tan',   role: 'Key Account',     email: 'robert@cleanpro.com',   phone: '+63-2-6666',  category: 'Cleaning',     location: 'Makati, PH',      status: 'Inactive' },
    ];
    for (const s of seedSuppliers) {
      await db.run(
        'INSERT INTO suppliers (code, name, contact_person, role, email, phone, category, location, status) VALUES (?,?,?,?,?,?,?,?,?)',
        [s.code, s.name, s.contact_person, s.role, s.email, s.phone, s.category, s.location, s.status]
      );
    }
    console.log(`[db] Seeded ${seedSuppliers.length} suppliers.`);
  }

  // ── Seed purchase_orders ───────────────────────────────────────
  const poCnt = await db.scalar('SELECT COUNT(*) FROM purchase_orders');
  if (poCnt === 0) {
    const seedPOs = [
      { po_number: 'PO-2024-001', supplier: 'TechSource Global', order_date: '2024-01-15', status: 'Completed', total_amount: 5249.75 },
      { po_number: 'PO-2024-002', supplier: 'Office World Inc.',  order_date: '2024-02-10', status: 'Completed', total_amount: 1870.50 },
      { po_number: 'PO-2024-003', supplier: 'FurniCraft Co.',     order_date: '2024-03-05', status: 'Pending',   total_amount: 3599.95 },
      { po_number: 'PO-2024-004', supplier: 'Parts Depot PH',     order_date: '2024-03-20', status: 'Pending',   total_amount: 2100.00 },
      { po_number: 'PO-2024-005', supplier: 'TechSource Global',  order_date: '2024-04-01', status: 'Cancelled', total_amount: 980.00  },
      { po_number: 'PO-2024-006', supplier: 'Office World Inc.',  order_date: '2024-04-15', status: 'Completed', total_amount: 450.25  },
    ];
    for (const p of seedPOs) {
      await db.run(
        'INSERT INTO purchase_orders (po_number, supplier, order_date, status, total_amount) VALUES (?,?,?,?,?)',
        [p.po_number, p.supplier, p.order_date, p.status, p.total_amount]
      );
    }
    console.log(`[db] Seeded ${seedPOs.length} purchase orders.`);
  }

  // goods_received seed removed — no sample data injected

  // ── Seed users ─────────────────────────────────────────────────
  const userCnt = await db.scalar('SELECT COUNT(*) FROM users');
  if (userCnt === 0) {
    await db.run("INSERT INTO users (name, email, role, password, status) VALUES (?,?,?,?,?)",
      ['Admin', 'admin@inventory.com', 'Admin', 'admin123', 'Active']);
    await db.run("INSERT INTO users (name, email, role, password, status) VALUES (?,?,?,?,?)",
      ['Rogen Hallarsis', 'rogen.hallarsis29@gmail.com', 'Admin', '063013', 'Active']);
    console.log('[db] Seeded default admin users.');
  }

  // ── Ensure Rogen's account always exists (idempotent) ──────────
  const rogenExists = await db.getOne(
    "SELECT id FROM users WHERE LOWER(email) = 'rogen.hallarsis29@gmail.com'"
  );
  if (!rogenExists) {
    await db.run("INSERT INTO users (name, email, role, password, status) VALUES (?,?,?,?,?)",
      ['Rogen Hallarsis', 'rogen.hallarsis29@gmail.com', 'Admin', '063013', 'Active']);
    console.log('[db] Inserted Rogen Hallarsis admin account.');
  }

  // ── Seed machine_monitoring ────────────────────────────────────
  const mmCnt = await db.scalar('SELECT COUNT(*) FROM machine_monitoring');
  if (!mmCnt) {
    const mmSeed = [
      ['One North',               'Pampanga SP', 45, 0, 0,  25, 0,  0 ],
      ['Marquee',                 'Pampanga SP', 13, 0, 14, 0,  41, 0 ],
      ['MB - SM Sta. Rosa',       'Group 2',     30, 0, 0,  0,  35, 0 ],
      ['Bingo King',              'Pampanga SP', 48, 0, 12, 0,  0,  0 ],
      ['Gold Bingo',              'Pampanga SP', 50, 0, 0,  0,  0,  0 ],
      ['MB - San Pablo',          'Group 2',     46, 0, 0,  0,  0,  0 ],
      ['Mabiga',                  'Pampanga SP', 25, 0, 20, 0,  0,  0 ],
      ['Millennium - Pearl Drive','Group 3',     41, 0, 0,  0,  0,  0 ],
      ['Fields',                  'Pampanga SP', 31, 0, 6,  0,  0,  0 ],
      ['MB - Kamias',             'Group 3',     36, 0, 0,  0,  0,  0 ],
      ['Sindalan',                'Pampanga SP', 20, 6, 6,  0,  0,  0 ],
      ['Dolores',                 'Pampanga SP', 10, 0, 22, 0,  0,  0 ],
      ['JB - Zabarte',            'Group 3',     25, 6, 0,  0,  0,  0 ],
      ['BPC - KL Marilao',        'Group 1',     30, 0, 0,  0,  0,  0 ],
      ['MB - St. Augustine',      'Group 1',     20, 0, 10, 0,  0,  0 ],
      ['MB - Tayuman',            'Group 1',     30, 0, 0,  0,  0,  0 ],
      ['MB - Cabanatuan',         'Group 1',     21, 0, 6,  0,  0,  0 ],
      ['MB - Baliwag',            'Group 1',     18, 0, 7,  0,  0,  0 ],
      ['MB - Los Baños',          'Group 2',     10, 0, 10, 0,  0,  0 ],
      ['BP - Timog',              'Group 3',     0,  10, 0,  0,  0,  10],
      ['Easy Ebingo - Kai Mall',  'Group 3',     0,  10, 10, 0,  0,  0 ],
      ['ICBI - Intrepid',         'Group 3',     0,  10, 0,  0,  0,  10],
      ['San Isidro',              'Pampanga SP', 12, 4,  4,  0,  0,  0 ],
      ['Big Bang Don Boni',       'Pampanga SP', 10, 0,  10, 0,  0,  0 ],
      ['MCExcel-Fairview',        'Group 3',     12, 6,  0,  0,  0,  0 ],
      ['BPC - KL Meycauayan',     'Group 1',     17, 0,  0,  0,  0,  0 ],
      ['Anunas',                  'Pampanga SP', 20, 4,  4,  0,  0,  0 ],
    ];
    for (const [site, group_name, ez, br, ez2, ezl, lb, j_ark] of mmSeed) {
      const total = ez + br + ez2 + ezl + lb + j_ark;
      const area  = group_name === 'Pampanga SP' ? 'Pampanga Area' : 'Manila Area';
      await db.run(
        'INSERT INTO machine_monitoring (site, group_name, area, ez, br, ez2, ezl, lb, j_ark, total) VALUES (?,?,?,?,?,?,?,?,?,?)',
        [site, group_name, area, ez, br, ez2, ezl, lb, j_ark, total]
      );
    }
    console.log('[db] Seeded machine_monitoring rows.');
  }

  // ── Patch supplier emails (runs every boot, idempotent) ───────
  // Uses LIKE so partial/case-insensitive name matches work
  const supplierEmailPatches = [
    { keyword: 'finebend',        email: 'finebendsales109@gmail.com'          },
    { keyword: 'doin',            email: 'doinfurnituretrading@gmail.com'      },
    { keyword: 'pc express',      email: 'pcxglorietta@pcx.com.ph'             },
    { keyword: 'asus',            email: 'asusconceptstoreglorietta2@gmail.com'},
  ];
  try {
    // Ensure updated_at column exists (may be missing on older deployed DBs)
    await db.run(`ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW()`);
  } catch (_) {}
  for (const patch of supplierEmailPatches) {
    try {
      await db.run(
        `UPDATE suppliers SET email = ? WHERE LOWER(name) LIKE ? AND (email = '' OR email IS NULL)`,
        [patch.email, `%${patch.keyword}%`]
      );
    } catch (_) {}
  }
  console.log('[db] Supplier email patch applied.');

  // ── Audit log table ────────────────────────────────────────────
  await db.run(`
    CREATE TABLE IF NOT EXISTS audit_logs (
      id         SERIAL      PRIMARY KEY,
      user_name  TEXT        NOT NULL DEFAULT 'System',
      user_email TEXT        NOT NULL DEFAULT '',
      action     TEXT        NOT NULL DEFAULT '',
      entity     TEXT        NOT NULL DEFAULT '',
      entity_id  INTEGER,
      details    TEXT        NOT NULL DEFAULT '',
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  // ── Stock movements table ──────────────────────────────────────
  await db.run(`
    CREATE TABLE IF NOT EXISTS stock_movements (
      id           SERIAL      PRIMARY KEY,
      product_id   INTEGER     NOT NULL,
      product_name TEXT        NOT NULL,
      product_code TEXT        NOT NULL DEFAULT '',
      prev_qty     INTEGER     NOT NULL DEFAULT 0,
      new_qty      INTEGER     NOT NULL DEFAULT 0,
      change_qty   INTEGER     NOT NULL DEFAULT 0,
      reason       TEXT        NOT NULL DEFAULT 'Manual update',
      user_name    TEXT        NOT NULL DEFAULT 'System',
      created_at   TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  console.log('[db] PostgreSQL schema ready.');
  return { db, save: () => {} };
})();

// Prevent unhandled-rejection crash — log the error but keep the process alive
dbPromise.catch(err => {
  console.error('[db] FATAL init error:', err.message);
});

module.exports = { dbPromise, calcStatus };
