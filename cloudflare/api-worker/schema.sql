-- D1 database "mini-shop-orders" (binding DB). Already created; kept here for reference.
CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,            -- e.g. MS268420, shown to the customer
  token TEXT NOT NULL,            -- secret the customer's device keeps, needed to look the order up
  created_at TEXT NOT NULL,       -- ISO time
  status TEXT NOT NULL DEFAULT 'pending',  -- pending | confirmed | shipped | delivered | cancelled
  customer_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  address TEXT NOT NULL,
  lat REAL,
  lng REAL,
  note TEXT NOT NULL DEFAULT '',
  ship_id TEXT NOT NULL,
  pay_method TEXT NOT NULL,
  subtotal REAL NOT NULL,
  shipping REAL NOT NULL,
  total REAL NOT NULL,
  items TEXT NOT NULL             -- JSON: [{productId, name, price, qty, variant}]
);
CREATE INDEX IF NOT EXISTS orders_created ON orders (created_at DESC);
