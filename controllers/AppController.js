import redisClient from '../utils/redis';
import dbClient from '../utils/db';

class AppController {
  /**
   * Should return if Redis is alive and if the DB is alive too
   * by using the 2 utils created previously:
   * { "redis": true, "db": true } with a status code 200
   */
  static getStatus(request, response) {
    const status = {
      redis: redisClient.isAlive(),
      db: dbClient.isAlive(),
    };
    response.status(200).json(status);
  }

  /**
   * Should return the number of users and files in DB:
   * { "users": 12, "files": 1231 } with a status code 200
   */
  static async getStats(request, response) {
    try {
      const [usersCount, filesCount] = await Promise.all([
        dbClient.nbUsers(),
        dbClient.nbFiles(),
      ]);
      response.status(200).json({ users: usersCount, files: filesCount });
    } catch (error) {
      response.status(500).json({ error: 'Failed to retrieve stats' });
    }
  }
}

export default AppController;
