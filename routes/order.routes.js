// routes/order.routes.js
import { Router } from 'express';
import { supabase } from '../lib/supabase.js';
const router = Router();

router.get('/', async (req, res) => {
  const { search, status, page = 1, limit = 50 } = req.query;
  let q = supabase.from('orders')
    .select('*, order_items(*)', { count: 'exact' })
    .eq('user_id', req.userId).order('created_at', { ascending: false })
    .range((page-1)*limit, page*limit-1);
  if (search) q = q.or(`customer_name.ilike.%${search}%,order_number.ilike.%${search}%`);
  if (status) q = q.eq('status', status);
  const { data, error, count } = await q;
  if (error) return res.status(500).json({ success: false, message: error.message });
  res.json({ success: true, data, pagination: { total: count, page: +page, limit: +limit } });
});

router.get('/analytics', async (req, res) => {
  const { data, error } = await supabase.rpc('get_order_analytics', { p_user_id: req.userId });
  if (error) {
    // fallback: manual aggregation
    const sixMonthsAgo = new Date(); sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    const { data: orders } = await supabase.from('orders')
      .select('total, status, created_at')
      .eq('user_id', req.userId)
      .gte('created_at', sixMonthsAgo.toISOString());

    const months = {};
    (orders || []).forEach(o => {
      const m = new Date(o.created_at).toLocaleString('default', { month: 'short' });
      if (!months[m]) months[m] = { month: m, revenue: 0, orders: 0 };
      if (o.status !== 'CANCELLED') { months[m].revenue += +o.total; months[m].orders++; }
    });

    return res.json({ success: true, data: Object.values(months) });
  }
  res.json({ success: true, data });
});

router.post('/', async (req, res) => {
  const { customer_name, customer_email, customer_phone, total, payment, notes, address, items } = req.body;
  if (!customer_name || !total) return res.status(400).json({ success: false, message: 'customer_name and total required' });

  const { data: order, error } = await supabase.from('orders')
    .insert({ user_id: req.userId, customer_name, customer_email, customer_phone, total, payment: payment||'UPI', notes, address })
    .select().single();
  if (error) return res.status(500).json({ success: false, message: error.message });

  if (items?.length) {
    await supabase.from('order_items').insert(
      items.map(i => ({ order_id: order.id, product_id: i.productId, product_name: i.name, quantity: i.quantity||1, price: i.price }))
    );
    // Decrement stock
    for (const item of items) {
      if (item.productId) {
        await supabase.rpc('decrement_stock', { p_product_id: item.productId, p_qty: item.quantity||1 });
      }
    }
  }
  res.status(201).json({ success: true, data: order });
});

router.patch('/:id', async (req, res) => {
  const allowed = ['status','notes','address','payment'];
  const updates = Object.fromEntries(Object.entries(req.body).filter(([k]) => allowed.includes(k)));
  const { data, error } = await supabase.from('orders')
    .update(updates).eq('id', req.params.id).eq('user_id', req.userId).select().single();
  if (error) return res.status(500).json({ success: false, message: error.message });
  if (!data) return res.status(404).json({ success: false, message: 'Order not found' });
  res.json({ success: true, data });
});

router.delete('/:id', async (req, res) => {
  const { error } = await supabase.from('orders').delete().eq('id', req.params.id).eq('user_id', req.userId);
  if (error) return res.status(500).json({ success: false, message: error.message });
  res.json({ success: true, message: 'Deleted' });
});

export default router;
