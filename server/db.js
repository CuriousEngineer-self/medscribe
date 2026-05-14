const initSqlJs = require("sql.js");
const fs = require("fs");
const path = require("path");

const DB_PATH =
  process.env.DB_PATH || path.join(__dirname, "../db/medscribe.sqlite");

let db = null;

async function getDb() {
  if (db) return db;

  const SQL = await initSqlJs();

  if (fs.existsSync(DB_PATH)) {
    const fileBuffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(fileBuffer);
  } else {
    db = new SQL.Database();
  }

  initSchema();
  return db;
}

function saveDb() {
  if (!db) return;
  const data = db.export();
  const buffer = Buffer.from(data);
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
  fs.writeFileSync(DB_PATH, buffer);
}

function initSchema() {
  db.run(`
    CREATE TABLE IF NOT EXISTS doctors (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      name TEXT,
      qualifications TEXT,
      specialization TEXT,
      license_number TEXT,
      hospital_name TEXT,
      hospital_address TEXT,
      emergency_contact TEXT,
      phone TEXT,
      signature_note TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS password_reset_tokens (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      doctor_id INTEGER NOT NULL,
      token TEXT NOT NULL,
      expires_at DATETIME NOT NULL,
      used INTEGER DEFAULT 0,
      FOREIGN KEY (doctor_id) REFERENCES doctors(id)
    );

    CREATE TABLE IF NOT EXISTS parameter_schemas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      doctor_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('numeric','descriptive')),
      unit TEXT,
      min_value REAL,
      max_value REAL,
      low_label TEXT,
      mid_label TEXT,
      high_label TEXT,
      description TEXT,
      display_order INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (doctor_id) REFERENCES doctors(id)
    );

    CREATE TABLE IF NOT EXISTS patients (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      doctor_id INTEGER NOT NULL,
      first_name TEXT NOT NULL,
      last_name TEXT NOT NULL,
      date_of_birth TEXT NOT NULL,
      gender TEXT,
      height_cm REAL,
      weight_kg REAL,
      address TEXT,
      phone TEXT NOT NULL,
      email TEXT,
      drug_allergies TEXT,
      referred_by TEXT,
      medical_history TEXT,
      blood_group TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (doctor_id) REFERENCES doctors(id)
    );

    CREATE TABLE IF NOT EXISTS visits (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      patient_id INTEGER NOT NULL,
      doctor_id INTEGER NOT NULL,
      visit_date TEXT NOT NULL,
      chief_complaint TEXT,
      diagnosis TEXT,
      prescription TEXT,
      advice TEXT,
      follow_up_date TEXT,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (patient_id) REFERENCES patients(id),
      FOREIGN KEY (doctor_id) REFERENCES doctors(id)
    );

    CREATE TABLE IF NOT EXISTS visit_parameters (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      visit_id INTEGER NOT NULL,
      parameter_id INTEGER NOT NULL,
      numeric_value REAL,
      descriptive_value TEXT,
      FOREIGN KEY (visit_id) REFERENCES visits(id),
      FOREIGN KEY (parameter_id) REFERENCES parameter_schemas(id)
    );
  `);
  saveDb();
}

function query(sql, params = []) {
  const stmt = db.prepare(sql);
  stmt.bind(params);
  const rows = [];
  while (stmt.step()) {
    const raw = stmt.getAsObject();
    // sql.js may return BigInt for INTEGER columns — normalize to Number
    const row = {};
    for (const [k, v] of Object.entries(raw)) {
      row[k] = typeof v === "bigint" ? Number(v) : v;
    }
    rows.push(row);
  }
  stmt.free();
  return rows;
}

function run(sql, params = []) {
  db.run(sql, params);
  // Get last insert rowid via a direct exec (same connection state)
  let lastId = 0;
  db.each("SELECT last_insert_rowid() as id", [], (row) => {
    const v = row.id;
    lastId = typeof v === "bigint" ? Number(v) : v || 0;
  });
  saveDb();
  return { lastInsertRowid: lastId };
}

module.exports = { getDb, saveDb, query, run };
