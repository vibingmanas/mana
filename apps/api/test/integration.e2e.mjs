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
ok((await call(`/listings/${vid}`)).status === 200, 'public listing visible');

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

console.log(`\n${failures === 0 ? 'ALL PASSED' : failures + ' FAILURE(S)'}`);
process.exit(failures === 0 ? 0 : 1);
