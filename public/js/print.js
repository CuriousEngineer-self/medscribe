// ============ PRINT ============

async function printVisit(visitId) {
  try {
    const visit = await API.get(`/api/visits/${visitId}`);
    const pt = await API.get(`/api/patients/${visit.patient_id}`);
    const profile =
      AppState.doctorProfile || (await API.get("/api/doctor/profile"));

    const age = calcAge(pt.date_of_birth);
    const bmi = calcBMI(pt.height_cm, pt.weight_kg);
    const params = visit.parameters || [];

    const paramsTable = params.length
      ? `
      <div class="print-section">
        <div class="print-section-title">Clinical Parameters</div>
        <table class="print-params-table">
          <thead><tr>
            <th>Parameter</th><th>Value</th><th>Unit / Range</th>
          </tr></thead>
          <tbody>${params
            .map((p) => {
              const val =
                p.type === "numeric" ? p.numeric_value : p.descriptive_value;
              const range =
                p.type === "numeric" && p.min_value !== null
                  ? `${p.min_value}–${p.max_value}`
                  : "";
              const outOfRange =
                p.type === "numeric" &&
                p.min_value !== null &&
                (p.numeric_value < p.min_value ||
                  p.numeric_value > p.max_value);
              return `<tr>
              <td>${p.name}</td>
              <td style="${outOfRange ? "color:#c0392b;font-weight:bold" : ""}">${val ?? "—"}${outOfRange ? " ⚠" : ""}</td>
              <td>${p.unit || range || "—"}</td>
            </tr>`;
            })
            .join("")}</tbody>
        </table>
      </div>`
      : "";

    const html = `
      <div class="print-prescription">
        <div class="print-lh-header">
          <div>
            <div class="print-lh-name">${profile.name || "Doctor Name"}</div>
            <div class="print-lh-quals" style="color:#0d6e6e;font-family:'DM Sans',sans-serif;font-size:.82rem">${profile.qualifications || ""}</div>
            <div style="font-family:'DM Sans',sans-serif;font-size:.78rem;color:#6b6b8a">${profile.specialization || ""}</div>
          </div>
          <div style="text-align:right;font-family:'DM Sans',sans-serif;font-size:.78rem;color:#3d3d5c;line-height:1.7">
            <div style="font-weight:600">${profile.hospital_name || ""}</div>
            <div>${(profile.hospital_address || "").replace(/\n/g, "<br>")}</div>
            <div>📞 ${profile.phone || ""}</div>
            ${profile.emergency_contact ? `<div>🚨 Emergency: ${profile.emergency_contact}</div>` : ""}
            <div style="font-size:.7rem;color:#9999b0">Reg. No: ${profile.license_number || ""}</div>
          </div>
        </div>
        ${profile.signature_note ? `<div style="text-align:center;font-style:italic;font-size:.75rem;color:#9999b0;margin-bottom:1.25rem;font-family:'DM Sans',sans-serif">${profile.signature_note}</div>` : ""}

        <div class="print-patient-row">
          <div><strong>Patient:</strong> ${pt.first_name} ${pt.last_name}</div>
          <div><strong>Age:</strong> ${age} yrs</div>
          ${pt.gender ? `<div><strong>Gender:</strong> ${pt.gender}</div>` : ""}
          ${bmi ? `<div><strong>BMI:</strong> ${bmi} kg/m²</div>` : ""}
          <div><strong>Date:</strong> ${formatDate(visit.visit_date)}</div>
          ${visit.follow_up_date ? `<div><strong>Follow-up:</strong> ${formatDate(visit.follow_up_date)}</div>` : ""}
        </div>

        ${pt.drug_allergies ? `<div class="print-allergy-warn">⚠ DRUG ALLERGIES: ${pt.drug_allergies}</div>` : ""}

        ${visit.chief_complaint ? `<div class="print-section"><div class="print-section-title">Chief Complaint</div><div class="print-body">${visit.chief_complaint}</div></div>` : ""}
        ${visit.diagnosis ? `<div class="print-section"><div class="print-section-title">Diagnosis</div><div class="print-body" style="font-weight:600">${visit.diagnosis}</div></div>` : ""}



        ${visit.prescription ? `<div class="print-section"><div class="print-section-title">Prescription ℞</div><div class="print-body">${visit.prescription.replace(/\n/g, "<br>")}</div></div>` : ""}
        ${visit.advice ? `<div class="print-section"><div class="print-section-title">Advice & Instructions</div><div class="print-body">${visit.advice.replace(/\n/g, "<br>")}</div></div>` : ""}

        <div class="print-footer">
          <div>${profile.name || ""} · ${profile.specialization || ""}</div>
          <div>Signature: ________________________</div>
          <div>${profile.hospital_name || ""}</div>
        </div>
      </div>`;

    document.getElementById("print-area").innerHTML = html;
    window.print();
  } catch (e) {
    alert("Error generating prescription: " + e.message);
  }
}
