import express from 'express';
import helmet from 'helmet';
import compression from 'compression';
import cors from 'cors';
import initializeRoutes from './routes/index';

/**
 * This project is a summary of back-end concepts:
 * authentication, NodeJS, MongoDB, Redis,
 * pagination and background processing.
 *
 * The objective was to build a simple platform to upload and view files:
 *
 * User authentication via a token
 * List all files
 * Upload a new file
 * Change permission of a file
 * View a file
 * Generate thumbnails for images
 */

const app = express();
const port = process.env.PORT || 5000;

// Middleware for security, performance, and cross-origin handling
app.use(helmet());
app.use(compression());
app.use(cors());
app.use(express.json());

// Initialize routes
initializeRoutes(app);

// Start the server
app.listen(port, (err) => {
  if (err) {
    console.error(`Error starting server: ${err}`);
  } else {
    console.log(`Server running on port ${port}`);
  }
});

export default app;
