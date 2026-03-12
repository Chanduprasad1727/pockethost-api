// routes/admin.routes.js
import { Router } from 'express';
import { supabase } from '../lib/supabase.js';
import { requireAdmin } from '../middleware/auth.js';
import { env } from '../config/env.js';
const router = Router();

/* GET /api/admin/config — public (landing page needs this) */
router.get('/config', async (_req, res) => {
  const { data, error } = await supabase.from('admin_config').select('key, value');
  if (error) return res.status(500).json({ success: false, message: error.message });
  const config = Object.fromEntries(data.map(r => [r.key, r.value]));
  res.json({ success: true, data: config });
});

/* PATCH /api/admin/config/:key — protected by admin secret */
router.patch('/config/:key', requireAdmin, async (req, res) => {
  const { data, error } = await supabase.from('admin_config')
    .upsert({ key: req.params.key, value: req.body.value, updated_at: new Date().toISOString() })
    .select().single();
  if (error) return res.status(500).json({ success: false, message: error.message });
  res.json({ success: true, data });
});

/* GET /api/admin/stats — protected */
router.get('/stats', requireAdmin, async (_req, res) => {
  const [users, products, orders, projects] = await Promise.all([
    supabase.from('profiles').select('id', { count: 'exact', head: true }),
    supabase.from('products').select('id', { count: 'exact', head: true }),
    supabase.from('orders').select('total'),
    supabase.from('projects').select('id', { count: 'exact', head: true }),
  ]);
  const revenue = (orders.data || []).reduce((s, o) => s + +o.total, 0);
  res.json({ success: true, data: {
    users: users.count, products: products.count,
    projects: projects.count, revenue,
  }});
});

export default router;
