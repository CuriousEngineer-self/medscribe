const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const express = require('express');

process.env.JWT_SECRET = 'test-secret';
process.env.DB_PATH = path.join(os.tmpdir(), `medscribe-test-${process.pid}-${Date.now()}.sqlite`);

const { getDb, query } = require('../server/db');
const { router: authRouter } = require('../server/auth');
const doctorRouter = require('../server/doctor');
const patientRouter = require('../server/patients');
const visitRouter = require('../server/visits');

let server;
let baseUrl;

async function request(method, url, body, token) {
  const res = await fetch(`${baseUrl}${url}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const data = await res.json().catch(() => ({}));
  return { res, data };
}

test.before(async () => {
  await getDb();
  const app = express();
  app.use(express.json());
  app.use('/api/auth', authRouter);
  app.use('/api/doctor', doctorRouter);
  app.use('/api/patients', patientRouter);
  app.use('/api/visits', visitRouter);

  await new Promise(resolve => {
    server = app.listen(0, '127.0.0.1', resolve);
  });
  const address = server.address();
  baseUrl = `http://127.0.0.1:${address.port}`;
});

test.after(async () => {
  if (server) await new Promise(resolve => server.close(resolve));
  fs.rmSync(process.env.DB_PATH, { force: true });
});

test('doctor can register, create patient/schema/visit, and fetch all visits', async () => {
  const reg = await request('POST', '/api/auth/register', {
    email: 'doctor@example.com',
    password: 'password123',
    name: 'Dr Test',
  });
  assert.equal(reg.res.status, 200);
  assert.ok(reg.data.token);

  const token = reg.data.token;

  const patient = await request('POST', '/api/patients', {
    first_name: 'Jane',
    last_name: 'Patient',
    date_of_birth: '1990-01-01',
    phone: '9876543210',
  }, token);
  assert.equal(patient.res.status, 200);
  assert.ok(patient.data.id);

  const schema = await request('POST', '/api/doctor/schemas', {
    name: 'Pulse',
    type: 'numeric',
    unit: 'bpm',
    min_value: 60,
    max_value: 100,
  }, token);
  assert.equal(schema.res.status, 200);
  assert.ok(schema.data.id);

  const visit = await request('POST', '/api/visits', {
    patient_id: patient.data.id,
    visit_date: '2025-01-01',
    diagnosis: 'Checkup',
    parameters: [{ parameter_id: schema.data.id, numeric_value: 72 }],
  }, token);
  assert.equal(visit.res.status, 200);
  assert.ok(visit.data.id);

  const allVisits = await request('GET', '/api/visits', null, token);
  assert.equal(allVisits.res.status, 200);
  assert.equal(allVisits.data.length, 1);
  assert.equal(allVisits.data[0].first_name, 'Jane');

  const trend = await request('GET', `/api/visits/trends/${patient.data.id}?parameter_id=${schema.data.id}`, null, token);
  assert.equal(trend.res.status, 200);
  assert.equal(trend.data.length, 1);
  assert.equal(trend.data[0].numeric_value, 72);
});

test('patient deletion removes dependent visits and visit parameters', async () => {
  const token = (await request('POST', '/api/auth/register', {
    email: 'cleanup@example.com',
    password: 'password123',
    name: 'Dr Cleanup',
  })).data.token;

  const patient = await request('POST', '/api/patients', {
    first_name: 'Delete',
    last_name: 'Me',
    date_of_birth: '1980-01-01',
    phone: '9876543211',
  }, token);

  const schema = await request('POST', '/api/doctor/schemas', {
    name: 'Weight',
    type: 'numeric',
    unit: 'kg',
  }, token);

  const visit = await request('POST', '/api/visits', {
    patient_id: patient.data.id,
    visit_date: '2025-01-02',
    parameters: [{ parameter_id: schema.data.id, numeric_value: 80 }],
  }, token);

  const del = await request('DELETE', `/api/patients/${patient.data.id}`, null, token);
  assert.equal(del.res.status, 200);

  assert.equal(query('SELECT id FROM visits WHERE id=?', [visit.data.id]).length, 0);
  assert.equal(query('SELECT id FROM visit_parameters WHERE visit_id=?', [visit.data.id]).length, 0);
});

test('schema deletion removes recorded parameter values', async () => {
  const token = (await request('POST', '/api/auth/register', {
    email: 'schema-delete@example.com',
    password: 'password123',
    name: 'Dr Schema',
  })).data.token;

  const patient = await request('POST', '/api/patients', {
    first_name: 'Param',
    last_name: 'Patient',
    date_of_birth: '1970-01-01',
    phone: '9876543212',
  }, token);

  const schema = await request('POST', '/api/doctor/schemas', {
    name: 'Temp',
    type: 'numeric',
    unit: 'C',
  }, token);

  await request('POST', '/api/visits', {
    patient_id: patient.data.id,
    visit_date: '2025-01-03',
    parameters: [{ parameter_id: schema.data.id, numeric_value: 37 }],
  }, token);

  const before = query('SELECT id FROM visit_parameters WHERE parameter_id=?', [schema.data.id]);
  assert.equal(before.length, 1);

  const del = await request('DELETE', `/api/doctor/schemas/${schema.data.id}`, null, token);
  assert.equal(del.res.status, 200);

  const after = query('SELECT id FROM visit_parameters WHERE parameter_id=?', [schema.data.id]);
  assert.equal(after.length, 0);
});

test('visit creation rejects patients owned by another doctor', async () => {
  const tokenA = (await request('POST', '/api/auth/register', {
    email: 'owner-a@example.com',
    password: 'password123',
  })).data.token;
  const tokenB = (await request('POST', '/api/auth/register', {
    email: 'owner-b@example.com',
    password: 'password123',
  })).data.token;

  const patientA = await request('POST', '/api/patients', {
    first_name: 'Owned',
    last_name: 'ByA',
    date_of_birth: '1999-01-01',
    phone: '9876543213',
  }, tokenA);

  const blocked = await request('POST', '/api/visits', {
    patient_id: patientA.data.id,
    visit_date: '2025-01-04',
  }, tokenB);

  assert.equal(blocked.res.status, 404);
});
