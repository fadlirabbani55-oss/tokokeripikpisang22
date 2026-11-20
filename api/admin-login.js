export default function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  const adminEmail = (process.env.EMAIL_ADMIN || process.env.OWNER_EMAIL || '').trim().toLowerCase();
  const adminPassword = process.env.PASSWORD_ADMIN || process.env.OWNER_PASSWORD || '';

  if (!adminEmail || !adminPassword) {
    return res.status(503).json({
      ok: false,
      error: 'Environment variables EMAIL_ADMIN dan PASSWORD_ADMIN belum diatur di server.',
    });
  }

  const { email, password } = req.body || {};
  const inputEmail = String(email || '').trim().toLowerCase();
  const inputPassword = String(password || '');

  if (inputEmail === adminEmail && inputPassword === adminPassword) {
    return res.status(200).json({
      ok: true,
      user: {
        id: 'usr-admin-owner',
        email: adminEmail,
        full_name: 'Owner Keripik Pisang Salee',
        phone: '',
        role: 'admin',
        localAdminVerified: true,
      },
    });
  }

  return res.status(401).json({
    ok: false,
    error: 'Email atau password Admin salah.',
  });
}
