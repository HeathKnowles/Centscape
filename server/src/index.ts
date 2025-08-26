import express from 'express';
import rateLimit from 'express-rate-limit';
import { previewHandler } from './preview.ts';

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

// JSON body parsing middleware
app.use(express.json());

// Rate limiting middleware - 10 requests per minute per IP
const limiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({ error: 'Too many requests' });
  },
});

app.use(limiter);

// POST /preview endpoint
app.post('/preview', (req, res) => {
  previewHandler(req, res);
});

// Health check endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'Centscape Preview API',
    status: 'running',
    timestamp: new Date().toISOString(),
    endpoints: ['/health', '/preview']
  });
});

app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Error handling middleware
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({
    error: 'Something went wrong!'
  });
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on http://0.0.0.0:${PORT}`);
  console.log(`Local access: http://localhost:${PORT}`);
});

export default app;
