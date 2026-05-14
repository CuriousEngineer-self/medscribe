const express = require("express");
const router = express.Router();
const { query, run } = require("./db");
const { authMiddleware } = require("./auth");

function getOwnedPatient(patientId, doctorId) {
  const patients = query("SELECT id FROM patients WHERE id=? AND doctor_id=?", [
    patientId,
    doctorId,
  ]);
  return patients[0] || null;
}

function getOwnedVisit(visitId, doctorId) {
  const visits = query("SELECT * FROM visits WHERE id=? AND doctor_id=?", [
    visitId,
    doctorId,
  ]);
  return visits[0] || null;
}

function getOwnedParameterIds(parameterIds, doctorId) {
  if (!parameterIds.length) return new Set();
  const placeholders = parameterIds.map(() => "?").join(",");
  const rows = query(
    `SELECT id FROM parameter_schemas WHERE doctor_id=? AND id IN (${placeholders})`,
    [doctorId, ...parameterIds],
  );
  return new Set(rows.map((row) => Number(row.id)));
}

function normalizeVisitParameters(parameters, doctorId) {
  if (!parameters || !Array.isArray(parameters)) return [];

  const candidateParams = parameters.filter(
    (p) =>
      p &&
      p.parameter_id &&
      (p.numeric_value !== undefined || p.descriptive_value),
  );
  const ownedIds = getOwnedParameterIds(
    [...new Set(candidateParams.map((p) => Number(p.parameter_id)))],
    doctorId,
  );

  return candidateParams.filter((p) => ownedIds.has(Number(p.parameter_id)));
}

// Get all visits for doctor (dashboard/overview)
router.get("/patient/all", authMiddleware, (req, res) => {
  const visits = query(
    `
    SELECT v.*, p.first_name, p.last_name, p.phone, p.drug_allergies
    FROM visits v
    JOIN patients p ON v.patient_id = p.id AND p.doctor_id = v.doctor_id
    WHERE v.doctor_id=?
    ORDER BY v.visit_date DESC, v.id DESC
    LIMIT 200
  `,
    [req.doctor.id],
  );
  res.json(visits);
});

router.get("/", authMiddleware, (req, res) => {
  const visits = query(
    `
    SELECT v.*, p.first_name, p.last_name, p.phone, p.drug_allergies
    FROM visits v
    JOIN patients p ON v.patient_id = p.id AND p.doctor_id = v.doctor_id
    WHERE v.doctor_id=?
    ORDER BY v.visit_date DESC, v.id DESC
    LIMIT 200
  `,
    [req.doctor.id],
  );
  res.json(visits);
});

// Get visits for a patient
router.get("/patient/:patientId", authMiddleware, (req, res) => {
  const { from, to } = req.query;
  if (!getOwnedPatient(req.params.patientId, req.doctor.id)) {
    return res.status(404).json({ error: "Patient not found" });
  }

  let sql = "SELECT * FROM visits WHERE patient_id=? AND doctor_id=?";
  const params = [req.params.patientId, req.doctor.id];
  if (from) {
    sql += " AND visit_date >= ?";
    params.push(from);
  }
  if (to) {
    sql += " AND visit_date <= ?";
    params.push(to);
  }
  sql += " ORDER BY visit_date DESC";
  res.json(query(sql, params));
});

// Get single visit with parameters
router.get("/:id", authMiddleware, (req, res) => {
  const visit = getOwnedVisit(req.params.id, req.doctor.id);
  if (!visit) return res.status(404).json({ error: "Not found" });

  const params = query(
    `
    SELECT vp.*, ps.name, ps.type, ps.unit, ps.min_value, ps.max_value, ps.low_label, ps.mid_label, ps.high_label
    FROM visit_parameters vp
    JOIN parameter_schemas ps ON vp.parameter_id = ps.id
    WHERE vp.visit_id = ?
  `,
    [req.params.id],
  );

  res.json({ ...visit, parameters: params });
});

// Create visit
router.post("/", authMiddleware, (req, res) => {
  const {
    patient_id,
    visit_date,
    chief_complaint,
    diagnosis,
    prescription,
    advice,
    follow_up_date,
    notes,
    parameters,
  } = req.body;
  if (!patient_id || !visit_date)
    return res.status(400).json({ error: "Patient and date required" });
  if (!getOwnedPatient(patient_id, req.doctor.id)) {
    return res.status(404).json({ error: "Patient not found" });
  }

  const result = run(
    `INSERT INTO visits (patient_id,doctor_id,visit_date,chief_complaint,diagnosis,prescription,advice,follow_up_date,notes) VALUES (?,?,?,?,?,?,?,?,?)`,
    [
      patient_id,
      req.doctor.id,
      visit_date,
      chief_complaint || null,
      diagnosis || null,
      prescription || null,
      advice || null,
      follow_up_date || null,
      notes || null,
    ],
  );

  const visitId = result.lastInsertRowid;

  const safeParameters = normalizeVisitParameters(parameters, req.doctor.id);
  for (const p of safeParameters) {
    run(
      "INSERT INTO visit_parameters (visit_id,parameter_id,numeric_value,descriptive_value) VALUES (?,?,?,?)",
      [
        visitId,
        p.parameter_id,
        p.numeric_value ?? null,
        p.descriptive_value || null,
      ],
    );
  }

  res.json({ id: visitId });
});

// Update visit
router.put("/:id", authMiddleware, (req, res) => {
  const {
    visit_date,
    chief_complaint,
    diagnosis,
    prescription,
    advice,
    follow_up_date,
    notes,
    parameters,
  } = req.body;
  const visit = getOwnedVisit(req.params.id, req.doctor.id);
  if (!visit) return res.status(404).json({ error: "Not found" });

  run(
    `UPDATE visits SET visit_date=?,chief_complaint=?,diagnosis=?,prescription=?,advice=?,follow_up_date=?,notes=? WHERE id=? AND doctor_id=?`,
    [
      visit_date,
      chief_complaint || null,
      diagnosis || null,
      prescription || null,
      advice || null,
      follow_up_date || null,
      notes || null,
      req.params.id,
      req.doctor.id,
    ],
  );

  if (parameters && Array.isArray(parameters)) {
    run("DELETE FROM visit_parameters WHERE visit_id=?", [req.params.id]);
    const safeParameters = normalizeVisitParameters(parameters, req.doctor.id);
    for (const p of safeParameters) {
      run(
        "INSERT INTO visit_parameters (visit_id,parameter_id,numeric_value,descriptive_value) VALUES (?,?,?,?)",
        [
          req.params.id,
          p.parameter_id,
          p.numeric_value ?? null,
          p.descriptive_value || null,
        ],
      );
    }
  }

  res.json({ success: true });
});

// Delete visit
router.delete("/:id", authMiddleware, (req, res) => {
  const visit = getOwnedVisit(req.params.id, req.doctor.id);
  if (!visit) return res.status(404).json({ error: "Not found" });

  run("DELETE FROM visit_parameters WHERE visit_id=?", [req.params.id]);
  run("DELETE FROM visits WHERE id=? AND doctor_id=?", [
    req.params.id,
    req.doctor.id,
  ]);
  res.json({ success: true });
});

// Get parameter trend data for a patient
router.get("/trends/:patientId", authMiddleware, (req, res) => {
  const { parameter_id } = req.query;
  if (!getOwnedPatient(req.params.patientId, req.doctor.id)) {
    return res.status(404).json({ error: "Patient not found" });
  }
  if (
    !parameter_id ||
    !getOwnedParameterIds([Number(parameter_id)], req.doctor.id).has(
      Number(parameter_id),
    )
  ) {
    return res.status(404).json({ error: "Parameter not found" });
  }

  const data = query(
    `
    SELECT v.visit_date, vp.numeric_value, vp.descriptive_value, ps.name, ps.unit, ps.min_value, ps.max_value
    FROM visit_parameters vp
    JOIN visits v ON vp.visit_id = v.id
    JOIN parameter_schemas ps ON vp.parameter_id = ps.id
    WHERE v.patient_id=? AND v.doctor_id=? AND vp.parameter_id=?
    ORDER BY v.visit_date ASC
  `,
    [req.params.patientId, req.doctor.id, parameter_id],
  );
  res.json(data);
});

module.exports = router;
