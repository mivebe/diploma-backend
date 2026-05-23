import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { initSchema } from './db/database';
import authRoutes from './routes/auth';
import eventsRoutes from './routes/events';
import reservationsRoutes from './routes/reservations';

const app = express();
app.use(cors());
app.use(express.json());

app.get('/', (_req, res) => res.json({ ok: true, name: 'gatherly-backend', version: '1.0.0' }));

app.use('/api/auth', authRoutes);
app.use('/api/events', eventsRoutes);
app.use('/api/reservations', reservationsRoutes);

app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  res.status(500).json({ error: 'INTERNAL', message: err.message });
});

const PORT = Number(process.env.PORT) || 4000;
const HOST = process.env.HOST || '0.0.0.0';

(async () => {
  await initSchema();
  app.listen(PORT, HOST, () => {
    console.log(`🚀 API listens on http://${HOST}:${PORT}`);
  });
})();
