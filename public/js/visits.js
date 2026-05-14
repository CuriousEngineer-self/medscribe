// ============ VISITS ============

async function loadAllVisits() {
  const list = document.getElementById("all-visits-list");
  list.innerHTML = '<div class="loading">Loading visits...</div>';
  try {
    const allVisits = await API.get("/api/visits");

    if (!allVisits.length) {
      list.innerHTML =
        '<div class="empty-state"><div class="es-icon">📋</div><p>No visits recorded yet.</p></div>';
      return;
    }

    list.innerHTML =
      '<div class="visits-list">' +
      allVisits
        .map((v) => {
          const d = new Date(v.visit_date);
          const day = d.getDate();
          const month = d.toLocaleString("en", { month: "short" });
          return `
        <div class="visit-item" onclick="openVisitDetail(${v.id})">
          <div class="visit-date-badge">
            <div class="vdb-day">${day}</div>
            <div class="vdb-month">${month} ${d.getFullYear()}</div>
          </div>
          <div class="visit-info">
            <div class="vi-title">${v.first_name} ${v.last_name}</div>
            <div class="vi-sub">${v.diagnosis || v.chief_complaint || "Visit"}${v.drug_allergies ? ' · <span class="allergy-badge">⚠ Allergies</span>' : ""}</div>
          </div>
          <div class="visit-actions">
            <button class="btn btn-secondary" style="font-size:0.8rem;padding:.35rem .75rem" onclick="event.stopPropagation();printVisit(${v.id})">🖨 Print</button>
            <button class="btn btn-secondary" style="font-size:0.8rem;padding:.35rem .75rem" onclick="event.stopPropagation();openPatientDetail(${v.patient_id})">View Patient</button>
          </div>
        </div>`;
        })
        .join("") +
      "</div>";
  } catch (e) {
    list.innerHTML = `<div class="empty-state"><p>${e.message}</p></div>`;
  }
}

async function openNewVisit() {
  // Pick a patient first
  const patients = await API.get("/api/patients");
  if (!patients.length) {
    openModal(
      "New Visit",
      '<p style="padding:1rem">Please add a patient first.</p>',
    );
    return;
  }
  openModal(
    "Select Patient for Visit",
    `
    <div class="form-group">
      <label>Choose Patient</label>
      <select id="visit-pt-sel" style="margin-bottom:1rem">
        <option value="">Select patient...</option>
        ${patients.map((p) => `<option value="${p.id}">${p.first_name} ${p.last_name} — ${p.phone}</option>`).join("")}
      </select>
    </div>
    <div style="display:flex;gap:.75rem;justify-content:flex-end">
      <button class="btn btn-secondary" onclick="closeModal()">Cancel</button>
      <button class="btn btn-primary" onclick="proceedNewVisit()">Continue</button>
    </div>`,
  );
}

function proceedNewVisit() {
  const sel = document.getElementById("visit-pt-sel");
  const ptId = sel.value;
  if (!ptId) return;
  AppState.currentPatientId = ptId;
  closeModal();
  openNewVisitForPatient();
}

async function openNewVisitForPatient() {
  const ptId = AppState.currentPatientId;
  if (!ptId) {
    openNewVisit();
    return;
  }
  const pt = await API.get(`/api/patients/${ptId}`);
  const today = new Date().toISOString().split("T")[0];
  openModal(
    `New Visit — ${pt.first_name} ${pt.last_name}`,
    visitFormHTML(null, ptId, today, pt),
    true,
  );
}

async function openVisitDetail(visitId) {
  try {
    const visit = await API.get(`/api/visits/${visitId}`);
    const pt = await API.get(`/api/patients/${visit.patient_id}`);
    openModal(
      `Visit — ${formatDate(visit.visit_date)}`,
      visitDetailHTML(visit, pt),
      true,
    );
  } catch (e) {
    alert(e.message);
  }
}

async function editVisit(visitId) {
  try {
    const visit = await API.get(`/api/visits/${visitId}`);
    const pt = await API.get(`/api/patients/${visit.patient_id}`);
    openModal(
      `Edit Visit — ${formatDate(visit.visit_date)}`,
      visitFormHTML(visit, visit.patient_id, visit.visit_date, pt),
      true,
    );
  } catch (e) {
    alert(e.message);
  }
}

function visitFormHTML(visit, patientId, date, pt) {
  const v = visit || {};
  const existingParams = {};
  (v.parameters || []).forEach((p) => {
    existingParams[p.parameter_id] = p;
  });

  const schemas = AppState.schemas;
  const paramRows = schemas.length
    ? schemas
        .map((s) => {
          const existing = existingParams[s.id];
          if (s.type === "numeric") {
            const val = existing ? existing.numeric_value : "";
            const hint =
              s.min_value !== null && s.max_value !== null
                ? `Range: ${s.min_value}–${s.max_value} ${s.unit || ""}`
                : "";
            return `
        <div class="param-input-row">
          <span class="param-label">${s.name}</span>
          <input type="number" id="param-${s.id}" value="${val !== null && val !== undefined ? val : ""}" placeholder="—" step="any" style="max-width:140px">
          <span class="param-unit">${s.unit || ""}</span>
          <span class="param-range-hint">${hint}</span>
        </div>`;
          } else {
            const val = existing ? existing.descriptive_value : "";
            const opts = [
              s.low_label || "Low",
              s.mid_label || "Normal",
              s.high_label || "High",
            ];
            return `
        <div class="param-input-row">
          <span class="param-label">${s.name}</span>
          <select id="param-${s.id}" style="max-width:180px">
            <option value="">Not recorded</option>
            ${opts.map((o) => `<option value="${o}" ${val === o ? "selected" : ""}>${o}</option>`).join("")}
          </select>
        </div>`;
          }
        })
        .join("")
    : '<p style="color:var(--ink-light);font-size:.85rem;padding:.5rem 0">No parameters configured. Go to Profile → Patient Parameters to add them.</p>';

  const allergyWarn =
    pt && pt.drug_allergies
      ? `<div class="allergy-alert"><span class="alert-icon">⚠️</span><div class="alert-text"><strong>DRUG ALLERGIES:</strong> ${pt.drug_allergies}</div></div>`
      : "";

  return `
    ${allergyWarn}
    <div class="form-grid" style="margin-bottom:1rem">
      <div class="form-group">
        <label>Visit Date *</label>
        <input type="date" id="vf-date" value="${date || ""}">
      </div>
      <div class="form-group">
        <label>Follow-up Date</label>
        <input type="date" id="vf-followup" value="${v.follow_up_date || ""}">
      </div>
      <div class="form-group span-2">
        <label>Chief Complaint</label>
        <input type="text" id="vf-complaint" value="${v.chief_complaint || ""}" placeholder="Main reason for visit">
      </div>
      <div class="form-group span-2">
        <label>Diagnosis</label>
        <input type="text" id="vf-diagnosis" value="${v.diagnosis || ""}" placeholder="Clinical diagnosis">
      </div>
    </div>

    ${schemas.length ? `<div style="margin-bottom:1.25rem"><div style="font-size:.78rem;font-weight:600;text-transform:uppercase;letter-spacing:.06em;color:var(--ink-light);margin-bottom:.5rem">Clinical Parameters</div>${paramRows}</div>` : paramRows}

    <div class="form-group">
      <label>Prescription</label>
      <textarea id="vf-prescription" rows="5" placeholder="Medications, dosage, duration...">${v.prescription || ""}</textarea>
    </div>
    <div class="form-group">
      <label>Advice / Instructions</label>
      <textarea id="vf-advice" rows="3" placeholder="Diet, lifestyle, activity advice...">${v.advice || ""}</textarea>
    </div>
    <div class="form-group">
      <label>Internal Notes (not printed)</label>
      <textarea id="vf-notes" rows="2" placeholder="Private clinical notes...">${v.notes || ""}</textarea>
    </div>
    <div class="form-error" id="vf-error"></div>
    <div style="display:flex;gap:.75rem;justify-content:flex-end;margin-top:1rem">
      <button class="btn btn-secondary" onclick="closeModal()">Cancel</button>
      <button class="btn btn-primary" onclick="saveVisit(${visit ? visit.id : "null"}, ${patientId})">${visit ? "Update Visit" : "Save Visit"}</button>
    </div>`;
}

function visitDetailHTML(visit, pt) {
  const params = visit.parameters || [];
  const paramTable = params.length
    ? `
    <div style="margin-bottom:1.25rem">
      <div style="font-size:.78rem;font-weight:600;text-transform:uppercase;letter-spacing:.06em;color:var(--ink-light);margin-bottom:.5rem">Clinical Parameters</div>
      <table style="width:100%;border-collapse:collapse;font-size:.88rem">
        <thead><tr style="background:var(--teal-pale)">
          <th style="padding:.4rem .6rem;text-align:left">Parameter</th>
          <th style="padding:.4rem .6rem;text-align:left">Value</th>
          <th style="padding:.4rem .6rem;text-align:left">Unit/Range</th>
        </tr></thead>
        <tbody>${params
          .map((p) => {
            const val =
              p.type === "numeric" ? p.numeric_value : p.descriptive_value;
            const range =
              p.type === "numeric" && p.min_value !== null
                ? `${p.min_value}–${p.max_value}`
                : "";
            return `<tr style="border-bottom:1px solid var(--border-light)">
            <td style="padding:.4rem .6rem">${p.name}</td>
            <td style="padding:.4rem .6rem;font-weight:500">${val ?? "—"}</td>
            <td style="padding:.4rem .6rem;color:var(--ink-light)">${p.unit || range || "—"}</td>
          </tr>`;
          })
          .join("")}</tbody>
      </table>
    </div>`
    : "";

  return `
    <div style="display:flex;justify-content:space-between;margin-bottom:1rem;flex-wrap:wrap;gap:.5rem">
      <div>
        <div style="font-size:1.1rem;font-weight:600">${pt.first_name} ${pt.last_name}</div>
        <div style="color:var(--ink-light);font-size:.85rem">Age: ${calcAge(pt.date_of_birth)} · ${pt.gender || ""}</div>
      </div>
      <div style="display:flex;gap:.5rem">
        <button class="btn btn-secondary" onclick="editVisit(${visit.id});closeModal()">✏ Edit</button>
        <button class="btn btn-primary" onclick="printVisit(${visit.id});closeModal()">🖨 Print</button>
      </div>
    </div>
    ${pt.drug_allergies ? `<div class="allergy-alert"><span class="alert-icon">⚠️</span><div class="alert-text"><strong>DRUG ALLERGIES:</strong> ${pt.drug_allergies}</div></div>` : ""}
    <div class="form-grid" style="margin-bottom:1rem">
      ${visit.chief_complaint ? `<div class="form-group"><label>Chief Complaint</label><div style="padding:.5rem 0;font-size:.92rem">${visit.chief_complaint}</div></div>` : ""}
      ${visit.diagnosis ? `<div class="form-group"><label>Diagnosis</label><div style="padding:.5rem 0;font-size:.92rem;font-weight:500">${visit.diagnosis}</div></div>` : ""}
      ${visit.follow_up_date ? `<div class="form-group"><label>Follow-up</label><div style="padding:.5rem 0">${formatDate(visit.follow_up_date)}</div></div>` : ""}
    </div>
    ${paramTable}
    ${visit.prescription ? `<div class="form-group"><label>Prescription</label><div style="padding:.5rem 0;font-size:.9rem;white-space:pre-line;line-height:1.7">${visit.prescription}</div></div>` : ""}
    ${visit.advice ? `<div class="form-group"><label>Advice</label><div style="padding:.5rem 0;font-size:.9rem;white-space:pre-line">${visit.advice}</div></div>` : ""}
  `;
}

async function saveVisit(id, patientId) {
  const date = document.getElementById("vf-date").value;
  if (!date) {
    document.getElementById("vf-error").textContent = "Visit date is required.";
    return;
  }

  const parameters = AppState.schemas
    .map((s) => {
      const el = document.getElementById(`param-${s.id}`);
      if (!el) return null;
      if (s.type === "numeric") {
        const val = el.value !== "" ? parseFloat(el.value) : null;
        return { parameter_id: s.id, numeric_value: val };
      } else {
        return { parameter_id: s.id, descriptive_value: el.value || null };
      }
    })
    .filter((p) => p && (p.numeric_value !== null || p.descriptive_value));

  const data = {
    patient_id: patientId,
    visit_date: date,
    chief_complaint: document.getElementById("vf-complaint").value.trim(),
    diagnosis: document.getElementById("vf-diagnosis").value.trim(),
    prescription: document.getElementById("vf-prescription").value.trim(),
    advice: document.getElementById("vf-advice").value.trim(),
    notes: document.getElementById("vf-notes").value.trim(),
    follow_up_date: document.getElementById("vf-followup").value || null,
    parameters,
  };

  try {
    if (id) {
      await API.put(`/api/visits/${id}`, data);
    } else {
      await API.post("/api/visits", data);
    }
    closeModal();
    if (AppState.currentPatientId == patientId) {
      await loadPatientVisits();
      await loadTrendChart();
    }
  } catch (e) {
    document.getElementById("vf-error").textContent = e.message;
  }
}
