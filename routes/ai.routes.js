// routes/ai.routes.js — Uses Groq (free) instead of Anthropic
import { Router } from 'express';
import Groq from 'groq-sdk';
import { supabase } from '../lib/supabase.js';
import { env } from '../config/env.js';
import { logger } from '../config/logger.js';

const router = Router();
const groq = new Groq({ apiKey: env.GROQ_API_KEY });

/* POST /api/ai/generate
   Body: { prompt, templateId?, projectName }
   Returns: { projectId, subdomain, htmlContent }
*/
router.post('/generate', async (req, res) => {
  try {
    const { prompt, templateId, projectName } = req.body;
    if (!prompt?.trim()) return res.status(400).json({ success: false, message: 'prompt required' });

    logger.info('AI generation started', { userId: req.userId, prompt: prompt.slice(0, 80) });

    // Generate website HTML with Groq (Llama 3.3 70B - free)
    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      max_tokens: 4096,
      temperature: 0.7,
      messages: [
        {
          role: 'system',
          content: `You are an expert web designer specializing in Indian small businesses.
You create complete, beautiful, mobile-first HTML websites.
Always return ONLY raw HTML — no markdown, no code fences, no explanation.
Start your response with <!DOCTYPE html> and end with </html>.`
        },
        {
          role: 'user',
          content: `Create a complete single-page HTML website for this business:

"${prompt}"

Requirements:
- Complete HTML file with embedded CSS (use Tailwind CDN) and minimal vanilla JS
- Mobile-first, fully responsive design
- Include these sections: Hero, Features/Services, Products/Menu grid (with emojis), Testimonial, CTA, Footer
- Use Indian business context: ₹ for currency, Indian names, Indian city references
- Tailwind CSS via CDN: <script src="https://cdn.tailwindcss.com"></script>
- Pick a color scheme that matches the business type
- Include a working WhatsApp contact button: https://wa.me/919999999999
- Footer: "© 2025 · Powered by pockethost.in"
- Make it look like a real, professional business website

Return ONLY the complete HTML starting with <!DOCTYPE html>`
        }
      ]
    });

    const htmlContent = completion.choices[0]?.message?.content?.trim();
    if (!htmlContent || !htmlContent.includes('<!DOCTYPE')) {
      throw new Error('AI returned invalid HTML. Please try again.');
    }

    // Generate subdomain from project name
    const base = (projectName || prompt.split(' ').slice(0,3).join('')).toLowerCase().replace(/[^a-z0-9]/g,'').slice(0,20) || 'mysite';
    let subdomain = base;
    let n = 1;
    while (true) {
      const { data } = await supabase.from('projects').select('id').eq('subdomain', subdomain).single();
      if (!data) break;
      subdomain = `${base}${n++}`;
    }

    // Save project
    const { data: project, error } = await supabase.from('projects').insert({
      user_id: req.userId,
      name: projectName || prompt.slice(0, 60),
      subdomain,
      template_id: templateId || null,
      html_content: htmlContent,
      is_live: true,
    }).select().single();

    if (error) throw error;

    logger.info('AI generation complete', { userId: req.userId, projectId: project.id, subdomain });

    res.json({
      success: true,
      data: {
        projectId: project.id,
        subdomain: project.subdomain,
        htmlContent: htmlContent,
        liveUrl: `https://${subdomain}.pockethost.in`,
      }
    });
  } catch (err) {
    logger.error('AI generation failed', { err: err.message });
    if (err.status === 429) {
      return res.status(429).json({ success: false, message: 'AI is busy right now. Please wait a minute and try again.' });
    }
    res.status(500).json({ success: false, message: 'Generation failed. Please try again.' });
  }
});

/* POST /api/ai/regenerate  — re-generate from existing project */
router.post('/regenerate/:projectId', async (req, res) => {
  try {
    const { projectId } = req.params;
    const { prompt } = req.body;

    const { data: project } = await supabase.from('projects')
      .select('*').eq('id', projectId).eq('user_id', req.userId).single();
    if (!project) return res.status(404).json({ success: false, message: 'Project not found' });

    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      max_tokens: 4096,
      messages: [
        { role: 'system', content: 'You are an expert web designer. Return ONLY raw HTML starting with <!DOCTYPE html>.' },
        { role: 'user', content: `Rebuild this website with these changes: "${prompt || 'improve the design'}". Business: ${project.name}. Return complete HTML only.` }
      ]
    });

    const htmlContent = completion.choices[0]?.message?.content?.trim();
    if (!htmlContent) throw new Error('AI returned empty response');

    await supabase.from('projects').update({ html_content: htmlContent }).eq('id', projectId);

    res.json({ success: true, data: { htmlContent } });
  } catch (err) {
    if (err.status === 429) {
      return res.status(429).json({ success: false, message: 'AI is busy. Wait a minute and try again.' });
    }
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
