// routes/auth.routes.js — Profile management (Supabase handles signup/login on frontend)
import { Router } from 'express';
import { supabase } from '../lib/supabase.js';
import { requireAuth } from '../middleware/auth.js';
const router = Router();

/* GET /api/auth/profile */
router.get('/profile', requireAuth, async (req, res) => {
  const { data, error } = await supabase.from('profiles')
    .select('*').eq('id', req.userId).single();
  if (error) return res.status(500).json({ success: false, message: error.message });
  res.json({ success: true, data });
});

/* PATCH /api/auth/profile */
router.patch('/profile', requireAuth, async (req, res) => {
  const allowed = ['name','avatar','store_name','subdomain'];
  const updates = Object.fromEntries(Object.entries(req.body).filter(([k]) => allowed.includes(k)));

  if (updates.subdomain) {
    const { data: existing } = await supabase.from('profiles')
      .select('id').eq('subdomain', updates.subdomain).neq('id', req.userId).single();
    if (existing) return res.status(409).json({ success: false, message: 'Subdomain already taken' });
  }

  const { data, error } = await supabase.from('profiles')
    .update(updates).eq('id', req.userId).select().single();
  if (error) return res.status(500).json({ success: false, message: error.message });
  res.json({ success: true, data });
});

/* GET /api/auth/check-subdomain/:name */
router.get('/check-subdomain/:name', async (req, res) => {
  const { data } = await supabase.from('profiles')
    .select('id').eq('subdomain', req.params.name).single();
  res.json({ success: true, available: !data });
});

export default router;
