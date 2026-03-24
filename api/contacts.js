import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  // ── GET — fetch all contacts ──────────────────────────────────────
  if (req.method === 'GET') {
    const { data, error } = await supabase
      .from('contacts')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('GET contacts error:', error);
      return res.status(500).json({ error: error.message });
    }
    return res.status(200).json(data);
  }

  // ── POST — insert new contact ─────────────────────────────────────
  if (req.method === 'POST') {
    const { name, phone, email, tag, opt_in } = req.body;

    // Log incoming payload so you can debug in Vercel Function Logs
    console.log('POST /api/contacts payload:', req.body);

    if (!name || !phone) {
      return res.status(400).json({ error: 'name and phone are required' });
    }

    const { data, error } = await supabase
      .from('contacts')
      .insert([{ name, phone, email, tag: tag || 'Lead', opt_in: opt_in ?? true }])
      .select(); // ← .select() ensures inserted row is returned

    if (error) {
      console.error('POST contacts error:', error);
      return res.status(500).json({ error: error.message });
    }

    console.log('Contact inserted:', data);
    return res.status(201).json(data[0]);
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
```

---

### After deploying, check Vercel Function Logs

1. Go to **Vercel → your project → Functions tab**
2. Try adding a contact on your live site
3. Look for the `POST /api/contacts payload:` log line

This will tell us exactly what's being received — and if Supabase is returning a silent error.

---

### Also verify your env vars are live

In **Vercel → Settings → Environment Variables**, confirm both of these exist:
```
SUPABASE_URL
SUPABASE_ANON_KEY
