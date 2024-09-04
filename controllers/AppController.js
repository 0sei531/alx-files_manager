import redisClient from '../utils/redis';
import dbClient from '../utils/db';

class AppController {
  /**
   * Should return if Redis and DB are alive.
   * { "redis": true, "db": true } with a status code 200
   */
  static async getStatus(request, response) {
    try {
      const status = {
        redis: await redisClient.isAlive(),
        db: await dbClient.isAlive(),
      };
      response.status(200).send(status);
    } catch (error) {
      console.error('Error checking status:', error);
      response.status(500).send({ error: 'Internal Server Error' });
    }
  }

  /**
   * Should return the number of users and files in DB.
   * { "users": 12, "files": 1231 } with a status code 200
   */
  static async getStats(request, response) {
    try {
      const stats = {
        users: await dbClient.nbUsers(),
        files: await dbClient.nbFiles(),
      };
      response.status(200).send(stats);
    } catch (error) {
      console.error('Error fetching stats:', error);
      response.status(500).send({ error: 'Internal Server Error' });
    }
  }
}

export default AppController;
