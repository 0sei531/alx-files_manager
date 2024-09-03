import redisClient from '../utils/redis.js';
import dbClient from '../utils/db.js';

class AppController {
  /**
   * Returns the status of Redis and DB
   * { "redis": true, "db": true } with a status code 200
   */
  static getStatus(request, response) {
    const status = {
      redis: redisClient.isAlive(),
      db: dbClient.isAlive(),
    };
    response.status(200).send(status);
  }

  /**
   * Returns the number of users and files in the DB
   * { "users": <number>, "files": <number> } with a status code 200
   */
  static async getStats(request, response) {
    const stats = {
      users: await dbClient.nbUsers(),
      files: await dbClient.nbFiles(),
    };
    response.status(200).send(stats);
  }
}

export default AppController;
