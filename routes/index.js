import express from 'express';
import AppController from '../controllers/AppController';
import UsersController from '../controllers/UsersController';
import AuthController from '../controllers/AuthController';
import FilesController from '../controllers/FilesController';
import asyncHandler from '../utils/asyncHandler';
import { check, validationResult } from 'express-validator';

function controllerRouting(app) {
  const router = express.Router();
  app.use('/', router);

  // App Controller
  router.get('/status', asyncHandler(AppController.getStatus));
  router.get('/stats', asyncHandler(AppController.getStats));

  // User Controller
  router.post('/users', [
    check('email').isEmail(),
    check('password').isLength({ min: 6 }),
  ], asyncHandler((req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    UsersController.postNew(req, res);
  }));

  router.get('/users/me', asyncHandler(UsersController.getMe));

  // Auth Controller
  router.post('/connect', asyncHandler(AuthController.getConnect));
  router.post('/disconnect', asyncHandler(AuthController.getDisconnect));

  // Files Controller
  router.post('/files', asyncHandler(FilesController.postUpload));
  router.get('/files/:id', asyncHandler(FilesController.getShow));
  router.get('/files', asyncHandler(FilesController.getIndex));
  router.put('/files/:id/publish', asyncHandler(FilesController.putPublish));
  router.put('/files/:id/unpublish', asyncHandler(FilesController.putUnpublish));
  router.get('/files/:id/data', asyncHandler(FilesController.getFile));
}

export default controllerRouting;
