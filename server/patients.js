const express = require("express");
const router = express.Router();
const { query, run } = require("./db");
const { authMiddleware } = require("./auth");

// List patients
router.get("/", authMiddleware, (req, res) => {
  const search = req.query.search || "";
  let patients;
  if (search) {
    patients = query(
      `SELECT * FROM patients WHERE doctor_id=? AND (first_name LIKE ? OR last_name LIKE ? OR phone LIKE ?) ORDER BY last_name,first_name`,
      [req.doctor.id, `%${search}%`, `%${search}%`, `%${search}%`],
    );
  } else {
    patients = query(
      "SELECT * FROM patients WHERE doctor_id=? ORDER BY last_name,first_name",
      [req.doctor.id],
    );
  }
  res.json(patients);
});

// Get single patient
router.get("/:id", authMiddleware, (req, res) => {
  const pts = query("SELECT * FROM patients WHERE id=? AND doctor_id=?", [
    req.params.id,
    req.doctor.id,
  ]);
  if (!pts.length) return res.status(404).json({ error: "Not found" });
  res.json(pts[0]);
});

// Create patient
router.post("/", authMiddleware, (req, res) => {
  const {
    first_name,
    last_name,
    date_of_birth,
    gender,
    height_cm,
    weight_kg,
    address,
    phone,
    email,
    drug_allergies,
    referred_by,
    medical_history,
    blood_group,
  } = req.body;
  if (!first_name || !last_name || !date_of_birth || !phone)
    return res.status(400).json({ error: "Required fields missing" });
  const result = run(
    `INSERT INTO patients (doctor_id,first_name,last_name,date_of_birth,gender,height_cm,weight_kg,address,phone,email,drug_allergies,referred_by,medical_history,blood_group) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [
      req.doctor.id,
      first_name,
      last_name,
      date_of_birth,
      gender || null,
      height_cm || null,
      weight_kg || null,
      address || null,
      phone,
      email || null,
      drug_allergies || null,
      referred_by || null,
      medical_history || null,
      blood_group || null,
    ],
  );
  res.json({ id: result.lastInsertRowid });
});

// Update patient
router.put("/:id", authMiddleware, (req, res) => {
  const {
    first_name,
    last_name,
    date_of_birth,
    gender,
    height_cm,
    weight_kg,
    address,
    phone,
    email,
    drug_allergies,
    referred_by,
    medical_history,
    blood_group,
  } = req.body;
  run(
    `UPDATE patients SET first_name=?,last_name=?,date_of_birth=?,gender=?,height_cm=?,weight_kg=?,address=?,phone=?,email=?,drug_allergies=?,referred_by=?,medical_history=?,blood_group=? WHERE id=? AND doctor_id=?`,
    [
      first_name,
      last_name,
      date_of_birth,
      gender || null,
      height_cm || null,
      weight_kg || null,
      address || null,
      phone,
      email || null,
      drug_allergies || null,
      referred_by || null,
      medical_history || null,
      blood_group || null,
      req.params.id,
      req.doctor.id,
    ],
  );
  res.json({ success: true });
});

// Delete patient
router.delete("/:id", authMiddleware, (req, res) => {
  const pts = query("SELECT id FROM patients WHERE id=? AND doctor_id=?", [
    req.params.id,
    req.doctor.id,
  ]);
  if (!pts.length) return res.status(404).json({ error: "Not found" });

  const visits = query(
    "SELECT id FROM visits WHERE patient_id=? AND doctor_id=?",
    [req.params.id, req.doctor.id],
  );
  for (const visit of visits) {
    run("DELETE FROM visit_parameters WHERE visit_id=?", [visit.id]);
  }
  run("DELETE FROM visits WHERE patient_id=? AND doctor_id=?", [
    req.params.id,
    req.doctor.id,
  ]);
  run("DELETE FROM patients WHERE id=? AND doctor_id=?", [
    req.params.id,
    req.doctor.id,
  ]);
  res.json({ success: true });
});

module.exports = router;
