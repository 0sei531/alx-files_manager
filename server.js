import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import controllerRouting from './routes/index';

const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(express.json());
app.use(cors());
app.use(helmet());
app.use(compression());

// Routing
controllerRouting(app);

// Error Handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send({ error: 'Something went wrong!' });
});

// Server Startup with Graceful Shutdown
const server = app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});

process.on('SIGTERM', () => {
  server.close(() => {
    console.log('Process terminated');
  });
});

export default app;
