import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envPath = path.resolve(__dirname, '..', '.env.local');

if (!fs.existsSync(envPath)) {
  console.error('File .env.local tidak ditemukan. Salin dari .env.example terlebih dahulu.');
  process.exit(1);
}

const env = {};
for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) continue;
  const idx = trimmed.indexOf('=');
  if (idx > 0) {
    env[trimmed.slice(0, idx).trim()] = trimmed.slice(idx + 1).trim().replace(/^["']|["']$/g, '');
  }
}

const { SUPABASE_URL, SUPABASE_SECRET_KEY, OWNER_EMAIL, OWNER_PASSWORD } = env;
if (!SUPABASE_URL || !SUPABASE_SECRET_KEY || !OWNER_EMAIL || !OWNER_PASSWORD) {
  console.error('Pastikan SUPABASE_URL, SUPABASE_SECRET_KEY, OWNER_EMAIL, dan OWNER_PASSWORD terisi di .env.local.');
  process.exit(1);
}

const headers = {
  apikey: SUPABASE_SECRET_KEY,
  Authorization: `Bearer ${SUPABASE_SECRET_KEY}`,
  'Content-Type': 'application/json',
};

const listRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users?page=1&per_page=100`, { headers });
const listData = await listRes.json();
const existing = (listData.users || []).find(
  (u) => u.email && u.email.toLowerCase() === OWNER_EMAIL.toLowerCase()
);

if (existing) {
  const updateRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${existing.id}`, {
    method: 'PUT',
    headers,
    body: JSON.stringify({
      password: OWNER_PASSWORD,
      email_confirm: true,
      user_metadata: { full_name: 'Owner Keripik Pisang Salee', role: 'admin' },
    }),
  });
  if (!updateRes.ok) throw new Error(await updateRes.text());
  console.log(`Akun Owner sudah ada (${existing.id}) — password diperbarui tanpa duplikat.`);
} else {
  const createRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      email: OWNER_EMAIL,
      password: OWNER_PASSWORD,
      email_confirm: true,
      user_metadata: { full_name: 'Owner Keripik Pisang Salee', role: 'admin' },
    }),
  });
  if (!createRes.ok) throw new Error(await createRes.text());
  const created = await createRes.json();
  console.log(`Akun Owner berhasil didaftarkan di Supabase Auth (${created.id}).`);
}
