import express from 'express';
import path from 'path';
import cookieParser from 'cookie-parser';
import { createServer as createViteServer } from 'vite';

// Route imports
import authRoutes from './server/routes/auth.routes.js';
import categoriesRoutes from './server/routes/categories.routes.js';
import projectsRoutes from './server/routes/projects.routes.js';
import blogsRoutes from './server/routes/blogs.routes.js';
import certificationsRoutes from './server/routes/certifications.routes.js';
import skillsRoutes from './server/routes/skills.routes.js';
import mediaRoutes from './server/routes/media.routes.js';
import terminalRoutes from './server/routes/terminal.routes.js';
import networkRoutes from './server/routes/network.routes.js';
import contactRoutes from './server/routes/contact.routes.js';
import architectureRoutes from './server/routes/architecture.routes.js';
import { errorHandler } from './server/middlewares/error.middleware.js';

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Middlewares
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));
  app.use(cookieParser());

  // Health check endpoint
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'healthy',
      service: 'Systems Infrastructure Portfolio & CMS API',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    });
  });

  // Mount API Domain Routes
  app.use('/api/auth', authRoutes);
  app.use('/api/categories', categoriesRoutes);
  app.use('/api/projects', projectsRoutes);
  app.use('/api/blogs', blogsRoutes);
  app.use('/api/certifications', certificationsRoutes);
  app.use('/api/skills', skillsRoutes);
  app.use('/api/media', mediaRoutes);
  app.use('/api/terminal', terminalRoutes);
  app.use('/api/network', networkRoutes);
  app.use('/api/contact', contactRoutes);
  app.use('/api/architecture', architectureRoutes);

  // Global Error Handler for API
  app.use('/api', errorHandler);

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Systems Portfolio Server] Listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('[Server Boot Error]', err);
  process.exit(1);
});
