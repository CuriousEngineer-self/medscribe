// ============ PARAMETER SCHEMAS ============

async function renderSchemas() {
  await loadSchemas();
  const list = document.getElementById('schemas-list');
  if (!list) return;

  const schemas = AppState.schemas;
  if (!schemas.length) {
    list.innerHTML = `<div class="empty-state" style="padding:2rem">
      <div class="es-icon">⚙</div>
      <p>No parameters configured yet.<br>Add parameters to track clinical measurements across visits.</p>
    </div>`;
    return;
  }

  list.innerHTML = `<div class="schemas-grid">${schemas.map(s => schemaCard(s)).join('')}</div>`;
}

function schemaCard(s) {
  let details = '';
  if (s.type === 'numeric') {
    const range = (s.min_value !== null && s.max_value !== null) ? `Range: ${s.min_value} – ${s.max_value}` : 'No range set';
    details = `${range}${s.unit ? ' ' + s.unit : ''}`;
  } else {
    const labels = [s.low_label, s.mid_label, s.high_label].filter(Boolean).join(' / ');
    details = labels || 'Descriptive';
  }

  return `
    <div class="schema-item">
      <div class="schema-info">
        <div class="si-name">${s.name}</div>
        <div class="si-type"><span class="type-badge type-${s.type}">${s.type === 'numeric' ? '📊 Numeric' : '📝 Descriptive'}</span></div>
        <div class="si-details">${details}</div>
        ${s.description ? `<div class="si-details" style="color:var(--ink-faint);font-style:italic">${s.description}</div>` : ''}
      </div>
      <div style="display:flex;flex-direction:column;gap:.4rem">
        <button class="btn-icon" title="Edit" onclick="openSchemaModal(${s.id})">✏️</button>
        <button class="btn-icon" title="Delete" onclick="deleteSchema(${s.id})">🗑</button>
      </div>
    </div>`;
}

function openSchemaModal(id) {
  const existing = id ? AppState.schemas.find(s => s.id == id) : null;
  const s = existing || {};

  const html = `
    <div class="form-group">
      <label>Parameter Name *</label>
      <input type="text" id="sf-name" value="${s.name || ''}" placeholder="e.g. Systolic BP, Tremor Severity">
    </div>
    <div class="form-group">
      <label>Type *</label>
      <div class="radio-group">
        <label><input type="radio" name="sf-type" value="numeric" ${(!s.type || s.type === 'numeric') ? 'checked' : ''} onchange="toggleSchemaType()"> Numeric (measurable with numbers)</label>
        <label><input type="radio" name="sf-type" value="descriptive" ${s.type === 'descriptive' ? 'checked' : ''} onchange="toggleSchemaType()"> Descriptive (qualitative)</label>
      </div>
    </div>

    <div id="sf-numeric-fields" style="${s.type === 'descriptive' ? 'display:none' : ''}">
      <div class="form-grid">
        <div class="form-group">
          <label>Unit</label>
          <input type="text" id="sf-unit" value="${s.unit || ''}" placeholder="e.g. mmHg, bpm, mg/dL">
        </div>
        <div class="form-group"><!-- spacer --></div>
        <div class="form-group">
          <label>Min Value</label>
          <input type="number" id="sf-min" value="${s.min_value !== null && s.min_value !== undefined ? s.min_value : ''}" placeholder="e.g. 60" step="any">
        </div>
        <div class="form-group">
          <label>Max Value</label>
          <input type="number" id="sf-max" value="${s.max_value !== null && s.max_value !== undefined ? s.max_value : ''}" placeholder="e.g. 180" step="any">
        </div>
      </div>
    </div>

    <div id="sf-descriptive-fields" style="${s.type !== 'descriptive' ? 'display:none' : ''}">
      <div class="form-grid">
        <div class="form-group">
          <label>Low / Minimum Label</label>
          <input type="text" id="sf-low" value="${s.low_label || ''}" placeholder="e.g. Mild, Minimal, Absent">
        </div>
        <div class="form-group">
          <label>Mid / Typical Label</label>
          <input type="text" id="sf-mid" value="${s.mid_label || ''}" placeholder="e.g. Moderate, Typical, Present">
        </div>
        <div class="form-group span-2">
          <label>High / Maximum Label</label>
          <input type="text" id="sf-high" value="${s.high_label || ''}" placeholder="e.g. Severe, Maximum, Pronounced">
        </div>
      </div>
    </div>

    <div class="form-group">
      <label>Description / Notes</label>
      <input type="text" id="sf-description" value="${s.description || ''}" placeholder="Optional: brief description of this parameter">
    </div>
    <div class="form-group">
      <label>Display Order</label>
      <input type="number" id="sf-order" value="${s.display_order || 0}" min="0">
    </div>

    <div class="form-error" id="sf-error"></div>
    <div style="display:flex;gap:.75rem;justify-content:flex-end;margin-top:1.25rem">
      <button class="btn btn-secondary" onclick="closeModal()">Cancel</button>
      <button class="btn btn-primary" onclick="saveSchema(${id || 'null'})">${id ? 'Update' : 'Add Parameter'}</button>
    </div>`;

  openModal(id ? 'Edit Parameter' : 'Add Parameter', html);
}

function toggleSchemaType() {
  const type = document.querySelector('input[name="sf-type"]:checked').value;
  document.getElementById('sf-numeric-fields').style.display = type === 'numeric' ? '' : 'none';
  document.getElementById('sf-descriptive-fields').style.display = type === 'descriptive' ? '' : 'none';
}

async function saveSchema(id) {
  const name = document.getElementById('sf-name').value.trim();
  const type = document.querySelector('input[name="sf-type"]:checked').value;
  if (!name) { document.getElementById('sf-error').textContent = 'Name is required.'; return; }

  const data = {
    name,
    type,
    unit: document.getElementById('sf-unit')?.value.trim() || null,
    min_value: document.getElementById('sf-min')?.value !== '' ? parseFloat(document.getElementById('sf-min').value) : null,
    max_value: document.getElementById('sf-max')?.value !== '' ? parseFloat(document.getElementById('sf-max').value) : null,
    low_label: document.getElementById('sf-low')?.value.trim() || null,
    mid_label: document.getElementById('sf-mid')?.value.trim() || null,
    high_label: document.getElementById('sf-high')?.value.trim() || null,
    description: document.getElementById('sf-description').value.trim() || null,
    display_order: parseInt(document.getElementById('sf-order').value) || 0,
  };

  try {
    if (id) {
      await API.put(`/api/doctor/schemas/${id}`, data);
    } else {
      await API.post('/api/doctor/schemas', data);
    }
    closeModal();
    await loadSchemas();
    renderSchemas();
  } catch (e) {
    document.getElementById('sf-error').textContent = e.message;
  }
}

async function deleteSchema(id) {
  if (!confirm('Delete this parameter? This will also remove all recorded values for this parameter in visits.')) return;
  try {
    await API.delete(`/api/doctor/schemas/${id}`);
    await loadSchemas();
    renderSchemas();
  } catch (e) {
    alert(e.message);
  }
}
