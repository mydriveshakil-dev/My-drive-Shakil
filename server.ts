import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API endpoints
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', app: 'Group Expense Tracker & Settlement', timestamp: new Date().toISOString() });
  });

  // Proxy endpoint for Google Sheets Sync Status
  app.get('/api/sheets/status', (req, res) => {
    res.json({
      connected: true,
      account: 'mydriveshakil@gmail.com',
      service: 'Google Drive / Google Sheets API v4',
      sharedAccountMode: true,
      realtimePollingIntervalMs: 10000,
    });
  });

  // Vite middleware for development vs static build for production
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
    console.log(`Group Expense Tracker server running on http://localhost:${PORT}`);
  });
}

startServer();
