// ============ PATIENTS ============

async function loadPatients(search = '') {
  const list = document.getElementById('patients-list');
  list.innerHTML = '<div class="loading">Loading patients...</div>';
  try {
    const url = search ? `/api/patients?search=${encodeURIComponent(search)}` : '/api/patients';
    const patients = await API.get(url);
    if (!patients.length) {
      list.innerHTML = `<div class="empty-state"><div class="es-icon">👤</div><p>No patients found.<br>Add your first patient to get started.</p></div>`;
      return;
    }
    list.innerHTML = patients.map(pt => patientCard(pt)).join('');
  } catch (e) {
    list.innerHTML = `<div class="empty-state"><p>Error loading patients: ${e.message}</p></div>`;
  }
}

function patientCard(pt) {
  const age = calcAge(pt.date_of_birth);
  const bmi = calcBMI(pt.height_cm, pt.weight_kg);
  return `
    <div class="patient-card" onclick="openPatientDetail(${pt.id})">
      <div class="pc-header">
        <div class="patient-avatar">${initials(pt.first_name, pt.last_name)}</div>
        <div>
          <div class="pc-name">${pt.first_name} ${pt.last_name}</div>
          <div class="pc-age">${age} yrs · ${pt.gender || ''}</div>
        </div>
      </div>
      <div class="pc-details">
        <div class="pc-detail">📞 ${pt.phone}</div>
        ${pt.blood_group ? `<div class="pc-detail">🩸 ${pt.blood_group}</div>` : ''}
        ${bmi ? `<div class="pc-detail">⚖ BMI: ${bmi}</div>` : ''}
        ${pt.drug_allergies ? `<div class="pc-detail"><span class="allergy-badge">⚠ DRUG ALLERGIES</span></div>` : ''}
      </div>
    </div>`;
}

let searchTimeout;
function searchPatients(val) {
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => loadPatients(val), 300);
}

async function openPatientDetail(patientId) {
  AppState.currentPatientId = patientId;
  document.querySelectorAll('.view').forEach(v => v.style.display = 'none');
  document.getElementById('view-patient-detail').style.display = '';

  try {
    const pt = await API.get(`/api/patients/${patientId}`);
    renderPatientDetail(pt);
    await loadPatientVisits();
    await populateTrendParams();
  } catch (e) {
    console.error(e);
  }
}

function renderPatientDetail(pt) {
  const age = calcAge(pt.date_of_birth);
  const bmi = calcBMI(pt.height_cm, pt.weight_kg);

  document.getElementById('pd-name').textContent = `${pt.first_name} ${pt.last_name}`;
  document.getElementById('pd-sub').textContent = `${age} years · ${pt.gender || ''} · ${pt.phone}`;

  const card = document.getElementById('pd-info-card');
  const allergyAlert = pt.drug_allergies
    ? `<div class="allergy-alert"><span class="alert-icon">⚠️</span><div class="alert-text"><strong>DRUG ALLERGIES:</strong> ${pt.drug_allergies}</div></div>`
    : '';

  const rows = [
    ['Date of Birth', formatDate(pt.date_of_birth)],
    ['Age', `${age} years`],
    ['Gender', pt.gender || '—'],
    ['Blood Group', pt.blood_group || '—'],
    ['Height', pt.height_cm ? `${pt.height_cm} cm` : '—'],
    ['Weight', pt.weight_kg ? `${pt.weight_kg} kg` : '—'],
    ['BMI', bmi ? `${bmi} kg/m²` : '—'],
    ['Phone', pt.phone],
    ['Email', pt.email || '—'],
    ['Address', pt.address || '—'],
    ['Referred By', pt.referred_by || '—'],
  ].map(([l, v]) => `<div class="info-row"><span class="label">${l}</span><span class="value">${v}</span></div>`).join('');

  card.innerHTML = `
    <h3>Patient Info</h3>
    ${allergyAlert}
    ${rows}
    ${pt.medical_history ? `<div style="margin-top:1rem"><div class="label" style="font-size:0.75rem;text-transform:uppercase;letter-spacing:.05em;color:var(--ink-light);margin-bottom:.4rem">Medical History</div><div style="font-size:0.85rem;line-height:1.6">${pt.medical_history}</div></div>` : ''}
  `;
}

async function loadPatientVisits() {
  const list = document.getElementById('patient-visits-list');
  list.innerHTML = '<div class="loading">Loading visits...</div>';
  const from = document.getElementById('visit-from').value;
  const to = document.getElementById('visit-to').value;
  let url = `/api/visits/patient/${AppState.currentPatientId}`;
  const params = [];
  if (from) params.push(`from=${from}`);
  if (to) params.push(`to=${to}`);
  if (params.length) url += '?' + params.join('&');

  try {
    const visits = await API.get(url);
    if (!visits.length) {
      list.innerHTML = '<div class="empty-state"><p>No visits recorded yet.</p></div>';
      return;
    }
    list.innerHTML = '<div class="visits-list">' + visits.map(v => visitItem(v)).join('') + '</div>';
  } catch (e) {
    list.innerHTML = `<div class="empty-state"><p>${e.message}</p></div>`;
  }
}

function visitItem(v) {
  const d = new Date(v.visit_date);
  const day = d.getDate();
  const month = d.toLocaleString('en', { month: 'short' });
  return `
    <div class="visit-item" onclick="openVisitDetail(${v.id})">
      <div class="visit-date-badge">
        <div class="vdb-day">${day}</div>
        <div class="vdb-month">${month} ${d.getFullYear()}</div>
      </div>
      <div class="visit-info">
        <div class="vi-title">${v.diagnosis || v.chief_complaint || 'Visit'}</div>
        <div class="vi-sub">${v.chief_complaint ? `CC: ${v.chief_complaint}` : ''}${v.follow_up_date ? ` · Follow-up: ${formatDate(v.follow_up_date)}` : ''}</div>
      </div>
      <div class="visit-actions">
        <button class="btn btn-secondary" style="font-size:0.8rem;padding:.35rem .75rem" onclick="event.stopPropagation();printVisit(${v.id})">🖨 Print</button>
        <button class="btn btn-secondary" style="font-size:0.8rem;padding:.35rem .75rem" onclick="event.stopPropagation();editVisit(${v.id})">✏ Edit</button>
      </div>
    </div>`;
}

function openNewPatient() {
  openModal('New Patient', patientFormHTML(null), true);
}

function openEditPatient() {
  API.get(`/api/patients/${AppState.currentPatientId}`).then(pt => {
    openModal('Edit Patient', patientFormHTML(pt), true);
  });
}

function patientFormHTML(pt) {
  const v = pt || {};
  return `
    <div class="form-grid">
      <div class="form-group">
        <label>First Name *</label>
        <input type="text" id="pf-fname" value="${v.first_name || ''}" placeholder="First name">
      </div>
      <div class="form-group">
        <label>Last Name *</label>
        <input type="text" id="pf-lname" value="${v.last_name || ''}" placeholder="Last name">
      </div>
      <div class="form-group">
        <label>Date of Birth *</label>
        <input type="date" id="pf-dob" value="${v.date_of_birth || ''}">
      </div>
      <div class="form-group">
        <label>Gender</label>
        <select id="pf-gender">
          <option value="">Select...</option>
          <option value="Male" ${v.gender === 'Male' ? 'selected' : ''}>Male</option>
          <option value="Female" ${v.gender === 'Female' ? 'selected' : ''}>Female</option>
          <option value="Other" ${v.gender === 'Other' ? 'selected' : ''}>Other</option>
        </select>
      </div>
      <div class="form-group">
        <label>Height (cm)</label>
        <input type="number" id="pf-height" value="${v.height_cm || ''}" placeholder="e.g. 170">
      </div>
      <div class="form-group">
        <label>Weight (kg)</label>
        <input type="number" id="pf-weight" value="${v.weight_kg || ''}" placeholder="e.g. 70">
      </div>
      <div class="form-group">
        <label>Blood Group</label>
        <select id="pf-blood">
          <option value="">Unknown</option>
          ${['A+','A-','B+','B-','AB+','AB-','O+','O-'].map(bg => `<option value="${bg}" ${v.blood_group === bg ? 'selected' : ''}>${bg}</option>`).join('')}
        </select>
      </div>
      <div class="form-group">
        <label>Phone * (10 digits)</label>
        <input type="tel" id="pf-phone" value="${v.phone || ''}" placeholder="9876543210" maxlength="10">
      </div>
      <div class="form-group span-2">
        <label>Email</label>
        <input type="email" id="pf-email" value="${v.email || ''}" placeholder="patient@email.com">
      </div>
      <div class="form-group span-2">
        <label>Address</label>
        <textarea id="pf-address" rows="2">${v.address || ''}</textarea>
      </div>
      <div class="form-group span-2">
        <label>Drug Allergies ⚠</label>
        <input type="text" id="pf-allergies" value="${v.drug_allergies || ''}" placeholder="e.g. Penicillin, Sulfa drugs (leave blank if none)">
      </div>
      <div class="form-group span-2">
        <label>Referred By</label>
        <input type="text" id="pf-referred" value="${v.referred_by || ''}" placeholder="Dr. Referring Doctor or self-referral">
      </div>
      <div class="form-group span-2">
        <label>Past Medical History</label>
        <textarea id="pf-history" rows="3">${v.medical_history || ''}</textarea>
      </div>
    </div>
    <div class="form-error" id="pf-error"></div>
    <div style="display:flex;gap:.75rem;justify-content:flex-end;margin-top:1.25rem">
      <button class="btn btn-secondary" onclick="closeModal()">Cancel</button>
      <button class="btn btn-primary" onclick="savePatient(${pt ? pt.id : 'null'})">${pt ? 'Update Patient' : 'Add Patient'}</button>
    </div>`;
}

async function savePatient(id) {
  const phone = document.getElementById('pf-phone').value.trim();
  if (!/^\d{10}$/.test(phone)) {
    document.getElementById('pf-error').textContent = 'Phone must be exactly 10 digits.';
    return;
  }
  const data = {
    first_name: document.getElementById('pf-fname').value.trim(),
    last_name: document.getElementById('pf-lname').value.trim(),
    date_of_birth: document.getElementById('pf-dob').value,
    gender: document.getElementById('pf-gender').value,
    height_cm: parseFloat(document.getElementById('pf-height').value) || null,
    weight_kg: parseFloat(document.getElementById('pf-weight').value) || null,
    blood_group: document.getElementById('pf-blood').value,
    phone,
    email: document.getElementById('pf-email').value.trim(),
    address: document.getElementById('pf-address').value.trim(),
    drug_allergies: document.getElementById('pf-allergies').value.trim(),
    referred_by: document.getElementById('pf-referred').value.trim(),
    medical_history: document.getElementById('pf-history').value.trim(),
  };
  if (!data.first_name || !data.last_name || !data.date_of_birth) {
    document.getElementById('pf-error').textContent = 'First name, last name and date of birth are required.';
    return;
  }
  try {
    if (id) {
      await API.put(`/api/patients/${id}`, data);
      closeModal();
      openPatientDetail(id);
    } else {
      const res = await API.post('/api/patients', data);
      closeModal();
      openPatientDetail(res.id);
    }
  } catch (e) {
    document.getElementById('pf-error').textContent = e.message;
  }
}

async function populateTrendParams() {
  const sel = document.getElementById('trend-param-select');
  if (!sel) return;
  await loadSchemas();
  const numeric = AppState.schemas.filter(s => s.type === 'numeric');
  sel.innerHTML = '<option value="">Select parameter...</option>' +
    numeric.map(s => `<option value="${s.id}">${s.name}${s.unit ? ' (' + s.unit + ')' : ''}</option>`).join('');
}
