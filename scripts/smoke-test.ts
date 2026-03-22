/**
 * AgentForge — Production Smoke Test
 * Uses Firebase Anonymous Auth via REST API (no firebase-admin needed)
 */

const BASE = 'https://agentforge-api-46589761675.europe-north1.run.app';
const FIREBASE_API_KEY = 'AIzaSyCm3EeA6F7SCtE0Xlr4wpnfflrc8EyuzN0';

async function getFirebaseToken(): Promise<string> {
  // Sign up anonymously via Firebase REST API
  const res = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${FIREBASE_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ returnSecureToken: true }),
    }
  );
  const data = await res.json() as { idToken?: string; error?: { message: string } };
  if (!data.idToken) {
    throw new Error(`Firebase auth failed: ${data.error?.message ?? 'unknown'}`);
  }
  return data.idToken;
}

async function test(label: string, url: string, opts?: RequestInit): Promise<{ status: number; body: string }> {
  const res = await fetch(url, opts);
  const body = await res.text();
  const icon = res.ok ? '✅' : res.status === 401 ? '🔒' : '❌';
  console.log(`${icon} ${label} → ${res.status}`);
  console.log(`   ${body.slice(0, 200)}`);
  return { status: res.status, body };
}

async function main() {
  console.log(`\n🚀 AgentForge Smoke Test — ${BASE}\n`);
  console.log('══════ 1. UNAUTHENTICATED (health) ══════\n');

  await test('GET /health/live',  `${BASE}/api/v1/health/live`);
  await test('GET /health/ready', `${BASE}/api/v1/health/ready`);
  await test('GET /health',       `${BASE}/api/v1/health`);

  console.log('\n══════ 2. AUTH GUARD (expect 401) ══════\n');

  await test('GET /skills (no auth)',     `${BASE}/api/v1/skills`);
  await test('POST /tasks (no auth)',     `${BASE}/api/v1/tasks`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
  await test('GET /decisions (no auth)',  `${BASE}/api/v1/decisions`);

  console.log('\n══════ 3. AUTHENTICATED ══════\n');

  let token: string;
  try {
    token = await getFirebaseToken();
    console.log('✅ Firebase anonymous token obtained\n');
  } catch (err) {
    console.log(`⚠️  Could not get token: ${err}`);
    console.log('   Skipping authenticated tests.\n');
    return;
  }

  const headers = { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };

  await test('GET /skills',    `${BASE}/api/v1/skills`, { headers });
  await test('POST /tasks',    `${BASE}/api/v1/tasks`, { method: 'POST', headers, body: JSON.stringify({ task: 'Napisz cold email do restauracji' }) });
  await test('GET /decisions', `${BASE}/api/v1/decisions`, { headers });

  console.log('\n══════ SMOKE TEST COMPLETED ══════\n');
}

main().catch(console.error);
