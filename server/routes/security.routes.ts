import { Router } from 'express';

import { env } from '../config/env.js';
import { issueCsrfToken } from '../security/csrf.js';

const router = Router();

router.get('/csrf', (request, response) => {
  const token = issueCsrfToken(request, response, env.NODE_ENV === 'production');
  response.setHeader('Cache-Control', 'no-store');
  response.json({ success: true, data: { token } });
});

export default router;
