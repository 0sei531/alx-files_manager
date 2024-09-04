import redisClient from '../utils/redis.js';
import dbClient from '../utils/db.js';

class AppController {
  static async getStatus(req, res) {
    try {
      const status = {
        redis: redisClient.isAlive(),
        db: dbClient.isAlive(),
      };
      res.status(200).json(status);
    } catch (error) {
      console.error('Error in getStatus:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  }

  static async getStats(req, res) {
    try {
      const stats = {
        users: await dbClient.nbUsers(),
        files: await dbClient.nbFiles(),
      };
      res.status(200).json(stats);
    } catch (error) {
      console.error('Error in getStats:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  }
}

export default AppController;
