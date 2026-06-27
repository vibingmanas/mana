// End-to-end integration test against a running API + Postgres.
// Used by CI (.github/workflows/ci.yml integration job) and locally:
//   API_URL=http://localhost:4000 node apps/api/test/integration.e2e.mjs
const B = `${process.env.API_URL ?? 'http://localhost:4000'}/api`;
let failures = 0;
const ok = (cond, msg) => {
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${msg}`);
  if (!cond) failures++;
};
async function call(path, { method = 'GET', body, token } = {}) {
  const headers = { 'content-type': 'application/json' };
  if (token) headers.authorization = `Bearer ${token}`;
  const res = await fetch(`${B}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    /* ignore */
  }
  return { status: res.status, json };
}
const rnd = () => `+9190000${Math.floor(Math.random() * 90000 + 10000)}`;
const authAs = async (role) => {
  const phone = rnd();
  const code = (
    await call('/auth/otp/request', { method: 'POST', body: { phone, purpose: 'onboarding' } })
  ).json.devCode;
  return (
    await call('/auth/otp/verify', {
      method: 'POST',
      body: { phone, code, purpose: 'onboarding', role },
    })
  ).json.accessToken;
};

// health
ok((await call('/health')).json?.db === 'up', 'API health: db up');

// dealer onboarding -> T1
const dt = await authAs('DEALER_OWNER');
ok(!!dt, 'dealer authenticated');
await call('/onboarding/start', { method: 'POST', body: {}, token: dt });
const ec = (
  await call('/onboarding/email/request-otp', {
    method: 'POST',
    body: { email: 'ci@m.dev' },
    token: dt,
  })
).json.devCode;
await call('/onboarding/email/verify', {
  method: 'POST',
  body: { email: 'ci@m.dev', code: ec },
  token: dt,
});
await call('/onboarding/aadhaar', {
  method: 'POST',
  body: { aadhaarNumber: '123456789012' },
  token: dt,
});
const tier = (
  await call('/onboarding/pan', { method: 'POST', body: { pan: 'ABCDE1234F' }, token: dt })
).json.dealer.verificationTier;
ok(tier === 'T1', `dealer reached T1 (got ${tier})`);

// list + publish a car
const vid = (
  await call('/vehicles', { method: 'POST', body: { regNumber: 'MH12CI0001' }, token: dt })
).json.id;
await call(`/vehicles/${vid}/verify-rc`, { method: 'POST', token: dt });
await call(`/vehicles/${vid}`, {
  method: 'PATCH',
  body: {
    make: 'Maruti Suzuki',
    model: 'Swift',
    manufactureYear: 2020,
    odometerKm: 50000,
    price: 550000,
  },
  token: dt,
});
await call(`/vehicles/${vid}/media`, {
  method: 'POST',
  body: { type: 'PHOTO', url: 'http://e.com/p.jpg' },
  token: dt,
});
ok(
  (await call(`/vehicles/${vid}/publish`, { method: 'POST', token: dt })).json.status === 'LIVE',
  'car published LIVE',
);

// public listing visible
const detail = await call(`/listings/${vid}`);
ok(detail.status === 200, 'public listing visible');
ok(
  !!detail.json.riskBand &&
    !!detail.json.fairPriceLabel &&
    detail.json.fairDeviationPct === undefined,
  'listing exposes risk + fair-price label, hides admin-only deviation %',
);

// search (OpenSearch when configured, else Postgres) — free-text + filter
const searchRes = await call(`/listings?q=Swift&sort=recent`).then((r) => r.json);
ok(
  searchRes.items.some((i) => i.id === vid) && !!searchRes.backend,
  `search returns the listing (backend ${searchRes.backend})`,
);

// buyer lead
const bt = await authAs('BUYER');
ok(
  (
    await call('/buyer/leads', {
      method: 'POST',
      body: { vehicleId: vid, intent: 'TEST_DRIVE' },
      token: bt,
    })
  ).status === 201,
  'buyer created lead',
);

// dealer sees the lead in pipeline
ok((await call('/dealer/leads', { token: dt })).json.leads.length >= 1, 'lead in dealer pipeline');

// RBAC: buyer denied dealer endpoint
ok((await call('/vehicles', { token: bt })).status === 403, 'buyer denied dealer endpoint (403)');

// sell-your-car: estimate -> book inspection -> offers -> accept
const est = await call('/sell/estimate', {
  method: 'POST',
  body: {
    make: 'Hyundai',
    model: 'i20',
    manufactureYear: 2019,
    odometerKm: 60000,
    condition: 'good',
    city: 'Pune',
  },
  token: bt,
});
ok(
  est.status === 201 && est.json.estFair > 0,
  `sell estimate produced a range (fair ${est.json?.estFair})`,
);
const booked = await call(`/sell/${est.json.id}/book-inspection`, {
  method: 'POST',
  body: {},
  token: bt,
});
ok(
  booked.json.status === 'OFFERS_READY' && booked.json.offers.length === 3,
  `inspection booked -> 3 dealer offers`,
);
const best = booked.json.offers[0];
const accepted = await call(`/sell/${est.json.id}/offers/${best.id}/accept`, {
  method: 'POST',
  token: bt,
});
ok(
  accepted.json.status === 'ACCEPTED' &&
    accepted.json.offers.find((o) => o.id === best.id).status === 'ACCEPTED',
  'seller accepted an offer',
);

// admin ops: feature flag, blocklist, dispute, impersonation
const adminCode = (
  await call('/auth/otp/request', { method: 'POST', body: { phone: '+919000000001' } })
).json.devCode;
const at = (
  await call('/auth/otp/verify', {
    method: 'POST',
    body: { phone: '+919000000001', code: adminCode },
  })
).json.accessToken;
ok(!!at, 'admin authenticated (seeded)');

await call('/admin/feature-flags/sell_flow', { method: 'PUT', body: { enabled: true }, token: at });
ok((await call('/feature-flags')).json.sell_flow === true, 'feature flag set + exposed publicly');

const blockPhone = '+919000000002';
await call('/admin/blocklist', {
  method: 'POST',
  body: { kind: 'phone', value: blockPhone, reason: 'fraud' },
  token: at,
});
ok(
  (await call('/auth/otp/request', { method: 'POST', body: { phone: blockPhone } })).status === 403,
  'blocked phone rejected at OTP (403)',
);

const disp = await call('/disputes', {
  method: 'POST',
  body: { type: 'listing', message: 'wrong photos' },
  token: bt,
});
ok(disp.status === 201, 'buyer raised a dispute');
const resolved = await call(`/admin/disputes/${disp.json.id}/resolve`, {
  method: 'POST',
  body: { status: 'RESOLVED', resolution: 'updated' },
  token: at,
});
ok(resolved.json.status === 'RESOLVED', 'admin resolved the dispute');

const imp = await call(
  `/admin/impersonate/${(await call('/auth/me', { token: dt })).json.userId}`,
  { method: 'POST', token: at },
);
ok(!!imp.json.accessToken, 'admin minted an impersonation token');

// inspection workflow: dealer request -> admin assign -> inspector submit -> history
const inspCode = (
  await call('/auth/otp/request', { method: 'POST', body: { phone: '+919000000003' } })
).json.devCode;
const it = (
  await call('/auth/otp/verify', {
    method: 'POST',
    body: { phone: '+919000000003', code: inspCode },
  })
).json.accessToken;
const inspectorId = (await call('/auth/me', { token: it })).json.userId;
ok(!!it && !!inspectorId, 'inspector authenticated (seeded)');

const job = await call(`/vehicles/${vid}/inspection-request`, {
  method: 'POST',
  body: { location: 'Pune hub' },
  token: dt,
});
ok(job.status === 201, 'dealer requested a physical inspection');

const assigned = await call(`/inspections/jobs/${job.json.id}/assign`, {
  method: 'POST',
  body: { inspectorId },
  token: at,
});
ok(assigned.json.status === 'ASSIGNED', 'admin assigned job to inspector');

ok(
  (await call('/inspections/jobs', { token: it })).json.some((j) => j.id === job.json.id),
  'job in inspector worklist',
);
await call(`/inspections/jobs/${job.json.id}/start`, { method: 'POST', token: it });
const sections = {
  engine: 92,
  transmission: 90,
  electrical: 88,
  suspensionBrakes: 90,
  structureBody: 92,
  interior: 88,
  tyres: 86,
  ac: 90,
};
const sub = await call(`/inspections/jobs/${job.json.id}/submit`, {
  method: 'POST',
  body: { sectionScores: sections, odometerKm: 50000, clientRef: 'ci-ref-1' },
  token: it,
});
ok(
  sub.json.inspection?.grade === 'A' && !sub.json.replayed,
  'inspector submitted physical inspection (grade A)',
);

const replay = await call(`/inspections/jobs/${job.json.id}/submit`, {
  method: 'POST',
  body: { sectionScores: sections, clientRef: 'ci-ref-1' },
  token: it,
});
ok(replay.json.replayed === true, 'offline replay is idempotent (same clientRef)');

const hist = await call(`/vehicles/${vid}/history`).then((r) => r.json);
ok(
  hist.inspections.some((i) => i.type === 'PHYSICAL') &&
    hist.certification?.tier === 'MANA_INSPECTED',
  'vehicle-history shows physical inspection + MANA_INSPECTED cert',
);

ok(
  (await call('/inspections/jobs', { token: bt })).status === 403,
  'buyer denied inspector worklist (403)',
);

// dealer DMS: bulk upload, staff RBAC, syndication
const csv =
  'regNumber,make,model,manufactureYear,odometerKm,price\nMH12BULK01,Maruti,Baleno,2021,30000,650000\nMH12BULK02,Tata,Nexon,2022,15000,900000';
const bulk = await call('/dealer/inventory/bulk-csv', { method: 'POST', body: { csv }, token: dt });
ok(bulk.json.created === 2 && bulk.json.skipped === 0, 'bulk CSV upload created 2 draft vehicles');
const reupload = await call('/dealer/inventory/bulk-csv', {
  method: 'POST',
  body: { csv },
  token: dt,
});
ok(
  reupload.json.created === 0 && reupload.json.skipped === 2,
  'bulk upload dedupes existing reg numbers',
);

const staffPhone = '+919100' + Math.floor(Math.random() * 900000 + 100000);
const added = await call('/dealer/staff', {
  method: 'POST',
  body: { phone: staffPhone, role: 'SALES' },
  token: dt,
});
ok(added.status === 201, 'owner added a sales staff member');
const staffCode = (await call('/auth/otp/request', { method: 'POST', body: { phone: staffPhone } }))
  .json.devCode;
const st = (
  await call('/auth/otp/verify', { method: 'POST', body: { phone: staffPhone, code: staffCode } })
).json.accessToken;
ok(
  (await call('/dealer/dashboard', { token: st })).json.dealer?.id === added.json.dealerId,
  'staff sees the owner dealer dashboard',
);
ok(
  (await call('/dealer/staff', { token: st })).status === 403,
  'sales staff denied staff roster (owner-only)',
);

await call('/dealer/syndication/OLX', { method: 'PUT', body: { enabled: true }, token: dt });
const feed = await call('/dealer/syndication/feed', { token: dt }).then((r) => r.json);
ok(
  feed.channels.includes('OLX') && feed.listings.some((l) => l.id === vid),
  'syndication feed lists live cars on enabled channels',
);

// Aadhaar via DigiLocker consent/redirect (mock when DIGILOCKER_CLIENT_ID unset)
const dg = await authAs('DEALER_OWNER');
await call('/onboarding/start', { method: 'POST', body: {}, token: dg });
const dgEc = (
  await call('/onboarding/email/request-otp', {
    method: 'POST',
    body: { email: 'dg@m.dev' },
    token: dg,
  })
).json.devCode;
await call('/onboarding/email/verify', {
  method: 'POST',
  body: { email: 'dg@m.dev', code: dgEc },
  token: dg,
});
const init = await call('/onboarding/aadhaar/digilocker/initiate', { method: 'POST', token: dg });
ok(
  init.json.consentUrl.includes('state=') && init.json.live === false,
  'digilocker initiate returns a (mock) consent url',
);
const consentUrl = new URL(init.json.consentUrl);
const cb = await call('/onboarding/aadhaar/digilocker/callback', {
  method: 'POST',
  body: { code: consentUrl.searchParams.get('code'), state: init.json.state },
  token: dg,
});
ok(cb.json.completedSteps?.includes('aadhaar'), 'digilocker callback verified Aadhaar');

const other = await authAs('DEALER_OWNER');
await call('/onboarding/start', { method: 'POST', body: {}, token: other });
const csrf = await call('/onboarding/aadhaar/digilocker/callback', {
  method: 'POST',
  body: { code: 'mock-x', state: init.json.state },
  token: other,
});
ok(csrf.status === 400, 'digilocker rejects a state bound to another user (CSRF)');

// consumer finance: apply -> eSign -> disbursed
const app = await call('/finance/applications', {
  method: 'POST',
  body: { vehicleId: vid, amount: 500000, downPayment: 100000, tenureMonths: 48 },
  token: bt,
});
ok(app.status === 201 && app.json.status === 'APPROVED', 'finance application approved');
const esign = await call(`/finance/applications/${app.json.id}/esign`, {
  method: 'POST',
  token: bt,
});
ok(!!esign.json.ref && esign.json.live === false, 'eSign request created (mock)');
const signed = await call(`/finance/applications/${app.json.id}/esign/complete`, {
  method: 'POST',
  body: { ref: esign.json.ref },
  token: bt,
});
ok(signed.json.status === 'DISBURSED', 'eSign completed -> loan disbursed');

// dealer floor-plan: request -> drawdown -> repay
const fp = await call('/dealer/floor-plan/request', {
  method: 'POST',
  body: { requestedLimit: 2000000 },
  token: dt,
});
ok(fp.json.status === 'ACTIVE' && fp.json.creditLimit === 2000000, 'floor-plan facility activated');
const draw = await call('/dealer/floor-plan/drawdown', {
  method: 'POST',
  body: { vehicleId: vid, principal: 400000 },
  token: dt,
});
ok(draw.status === 201, 'drawdown against facility');
ok(
  (await call('/dealer/floor-plan', { token: dt })).json.available === 1600000,
  'available credit reduced by drawdown',
);
const repaid = await call(`/dealer/floor-plan/drawdowns/${draw.json.id}/repay`, {
  method: 'POST',
  token: dt,
});
ok(
  repaid.json.status === 'REPAID' && repaid.json.interestCharged >= 0,
  'drawdown repaid with interest',
);
ok(
  (await call('/dealer/floor-plan', { token: dt })).json.available === 2000000,
  'credit restored after repayment',
);

console.log(`\n${failures === 0 ? 'ALL PASSED' : failures + ' FAILURE(S)'}`);
process.exit(failures === 0 ? 0 : 1);
