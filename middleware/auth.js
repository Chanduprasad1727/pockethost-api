import jwt from 'jsonwebtoken';

export async function requireAuth(req, res, next) {
  try {
    const auth = req.headers.authorization;

    if (!auth || !auth.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized',
      });
    }

    const token = auth.split(' ')[1];

    // decode only (Supabase already verifies)
    const decoded = jwt.decode(token);

    if (!decoded?.sub) {
      return res.status(401).json({
        success: false,
        message: 'Invalid token',
      });
    }

    req.user = {
      id: decoded.sub,
      email: decoded.email,
    };

    next();
  } catch (err) {
    return res.status(401).json({
      success: false,
      message: 'Auth failed',
    });
  }
}
