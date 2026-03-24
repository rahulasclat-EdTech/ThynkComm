const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

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

  if (req.method === 'POST') {
    const { name, phone, email, tag, opt_in } = req.body;

    console.log('POST /api/contacts payload:', req.body);

    if (!name || !phone) {
      return res.status(400).json({ error: 'name and phone are required' });
    }

    const { data, error } = await supabase
      .from('contacts')
      .insert([{ name, phone, email, tag: tag || 'Lead', opt_in: opt_in ?? true }])
      .select();

    if (error) {
      console.error('POST contacts error:', error);
      return res.status(500).json({ error: error.message });
    }

    console.log('Contact inserted:', data);
    return res.status(201).json(data[0]);
  }

  return res.status(405).json({ error: 'Method not allowed' });
};
