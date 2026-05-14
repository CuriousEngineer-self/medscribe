const express = require("express");
const router = express.Router();
const { query, run } = require("./db");
const { authMiddleware } = require("./auth");

// Get doctor profile
router.get("/profile", authMiddleware, (req, res) => {
  const docs = query(
    "SELECT id,email,name,qualifications,specialization,license_number,hospital_name,hospital_address,emergency_contact,phone,signature_note FROM doctors WHERE id=?",
    [req.doctor.id],
  );
  if (!docs.length) return res.status(404).json({ error: "Not found" });
  res.json(docs[0]);
});

// Update doctor profile
router.put("/profile", authMiddleware, (req, res) => {
  const {
    name,
    qualifications,
    specialization,
    license_number,
    hospital_name,
    hospital_address,
    emergency_contact,
    phone,
    signature_note,
  } = req.body;
  run(
    `UPDATE doctors SET name=?,qualifications=?,specialization=?,license_number=?,hospital_name=?,hospital_address=?,emergency_contact=?,phone=?,signature_note=? WHERE id=?`,
    [
      name,
      qualifications,
      specialization,
      license_number,
      hospital_name,
      hospital_address,
      emergency_contact,
      phone,
      signature_note,
      req.doctor.id,
    ],
  );
  res.json({ success: true });
});

// Get parameter schemas
router.get("/schemas", authMiddleware, (req, res) => {
  const schemas = query(
    "SELECT * FROM parameter_schemas WHERE doctor_id=? ORDER BY display_order, id",
    [req.doctor.id],
  );
  res.json(schemas);
});

// Create parameter schema
router.post("/schemas", authMiddleware, (req, res) => {
  const {
    name,
    type,
    unit,
    min_value,
    max_value,
    low_label,
    mid_label,
    high_label,
    description,
    display_order,
  } = req.body;
  if (!name || !type)
    return res.status(400).json({ error: "Name and type required" });
  const result = run(
    `INSERT INTO parameter_schemas (doctor_id,name,type,unit,min_value,max_value,low_label,mid_label,high_label,description,display_order) VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
    [
      req.doctor.id,
      name,
      type,
      unit || null,
      min_value || null,
      max_value || null,
      low_label || null,
      mid_label || null,
      high_label || null,
      description || null,
      display_order || 0,
    ],
  );
  res.json({ id: result.lastInsertRowid });
});

// Update parameter schema
router.put("/schemas/:id", authMiddleware, (req, res) => {
  const {
    name,
    type,
    unit,
    min_value,
    max_value,
    low_label,
    mid_label,
    high_label,
    description,
    display_order,
  } = req.body;
  run(
    `UPDATE parameter_schemas SET name=?,type=?,unit=?,min_value=?,max_value=?,low_label=?,mid_label=?,high_label=?,description=?,display_order=? WHERE id=? AND doctor_id=?`,
    [
      name,
      type,
      unit || null,
      min_value || null,
      max_value || null,
      low_label || null,
      mid_label || null,
      high_label || null,
      description || null,
      display_order || 0,
      req.params.id,
      req.doctor.id,
    ],
  );
  res.json({ success: true });
});

// Delete parameter schema
router.delete("/schemas/:id", authMiddleware, (req, res) => {
  const schemas = query(
    "SELECT id FROM parameter_schemas WHERE id=? AND doctor_id=?",
    [req.params.id, req.doctor.id],
  );
  if (!schemas.length) return res.status(404).json({ error: "Not found" });

  run("DELETE FROM visit_parameters WHERE parameter_id=?", [req.params.id]);
  run("DELETE FROM parameter_schemas WHERE id=? AND doctor_id=?", [
    req.params.id,
    req.doctor.id,
  ]);
  res.json({ success: true });
});

module.exports = router;
