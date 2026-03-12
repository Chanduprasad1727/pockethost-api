// routes/project.routes.js
import { Router } from 'express';
import { supabase } from '../lib/supabase.js';
const router = Router();

router.get('/', async (req, res) => {
  const { data, error } = await supabase.from('projects')
    .select('*').eq('user_id', req.userId).order('created_at', { ascending: false });
  if (error) return res.status(500).json({ success: false, message: error.message });
  res.json({ success: true, data });
});

router.get('/:id', async (req, res) => {
  const { data, error } = await supabase.from('projects')
    .select('*').eq('id', req.params.id).eq('user_id', req.userId).single();
  if (error || !data) return res.status(404).json({ success: false, message: 'Project not found' });
  res.json({ success: true, data });
});

router.patch('/:id', async (req, res) => {
  const allowed = ['name','html_content','is_live','repo_url'];
  const updates = Object.fromEntries(Object.entries(req.body).filter(([k]) => allowed.includes(k)));
  const { data, error } = await supabase.from('projects')
    .update(updates).eq('id', req.params.id).eq('user_id', req.userId).select().single();
  if (error || !data) return res.status(404).json({ success: false, message: 'Project not found' });
  res.json({ success: true, data });
});

router.delete('/:id', async (req, res) => {
  const { error } = await supabase.from('projects')
    .delete().eq('id', req.params.id).eq('user_id', req.userId);
  if (error) return res.status(500).json({ success: false, message: error.message });
  res.json({ success: true, message: 'Deleted' });
});

export default router;
