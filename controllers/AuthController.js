import sha1 from 'sha1';
import { v4 as uuidv4 } from 'uuid';
import DBClient from '../utils/db';
import RedisClient from '../utils/redis';
import userUtils from '../utils/user';

class AuthController {
  /**
   * Sign-in the user by generating a new authentication token.
   * Validates the user credentials using Basic Auth and returns a token on success.
   */
  static async getConnect(request, response) {
    try {
      // Retrieve and parse the Authorization header
      const authorization = request.header('Authorization') || '';
      if (!authorization.startsWith('Basic ')) return response.status(401).json({ error: 'Unauthorized' });

      const credentialsBase64 = authorization.replace('Basic ', '');
      const decodedCredentials = Buffer.from(credentialsBase64, 'base64').toString('utf-8');
      const [email, password] = decodedCredentials.split(':');

      if (!email || !password) return response.status(401).json({ error: 'Unauthorized' });

      // Hash the password using SHA1
      const hashedPassword = sha1(password);

      // Check if user exists in the database
      const user = await userUtils.getUser({ email, password: hashedPassword });
      if (!user) return response.status(401).json({ error: 'Unauthorized' });

      // Generate a token and store it in Redis
      const token = uuidv4();
      const key = `auth_${token}`;
      await RedisClient.set(key, user._id.toString(), 86400);  // Token expires in 24 hours

      return response.status(200).json({ token });
    } catch (error) {
      console.error('Error in getConnect:', error);
      return response.status(500).json({ error: 'Internal Server Error' });
    }
  }

  /**
   * Sign-out the user by invalidating the token stored in Redis.
   * If the token is valid, it will be deleted from Redis.
   */
  static async getDisconnect(request, response) {
    try {
      // Retrieve the token from the X-Token header
      const token = request.header('X-Token') || null;
      if (!token) return response.status(401).json({ error: 'Unauthorized' });

      // Verify the token exists in Redis
      const redisToken = await RedisClient.get(`auth_${token}`);
      if (!redisToken) return response.status(401).json({ error: 'Unauthorized' });

      // Delete the token from Redis
      await RedisClient.del(`auth_${token}`);
      return response.status(204).send();
    } catch (error) {
      console.error('Error in getDisconnect:', error);
      return response.status(500).json({ error: 'Internal Server Error' });
    }
  }
}

export default AuthController;
