// routes/product.routes.js
import { Router } from 'express';
import { supabase } from '../lib/supabase.js';
const router = Router();

router.get('/', async (req, res) => {
  const { search, category, status, page = 1, limit = 50 } = req.query;
  let q = supabase.from('products').select('*', { count: 'exact' })
    .eq('user_id', req.userId).order('created_at', { ascending: false })
    .range((page-1)*limit, page*limit-1);
  if (search) q = q.ilike('name', `%${search}%`);
  if (category) q = q.eq('category', category);
  if (status)   q = q.eq('status', status);
  const { data, error, count } = await q;
  if (error) return res.status(500).json({ success: false, message: error.message });
  res.json({ success: true, data, pagination: { total: count, page: +page, limit: +limit } });
});

router.post('/', async (req, res) => {
  const { name, description, price, category, stock, image, image_url, status } = req.body;
  if (!name || price == null) return res.status(400).json({ success: false, message: 'name and price required' });
  const { data, error } = await supabase.from('products')
    .insert({ user_id: req.userId, name, description, price, category, stock: stock||0, image: image||'📦', image_url, status: status||'ACTIVE' })
    .select().single();
  if (error) return res.status(500).json({ success: false, message: error.message });
  res.status(201).json({ success: true, data });
});

router.patch('/:id', async (req, res) => {
  const { data, error } = await supabase.from('products')
    .update(req.body).eq('id', req.params.id).eq('user_id', req.userId).select().single();
  if (error) return res.status(500).json({ success: false, message: error.message });
  if (!data) return res.status(404).json({ success: false, message: 'Product not found' });
  res.json({ success: true, data });
});

router.delete('/:id', async (req, res) => {
  const { error } = await supabase.from('products')
    .delete().eq('id', req.params.id).eq('user_id', req.userId);
  if (error) return res.status(500).json({ success: false, message: error.message });
  res.json({ success: true, message: 'Deleted' });
});

export default router;
