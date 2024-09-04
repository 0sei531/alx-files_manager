import redis from 'redis';
import { promisify } from 'util';

/**
 * RedisClient class for handling Redis operations
 */
class RedisClient {
  constructor() {
    this.client = redis.createClient();

    // Promisify Redis methods to allow use with async/await
    this.getAsync = promisify(this.client.get).bind(this.client);
    this.setAsync = promisify(this.client.setex).bind(this.client); // setex directly sets with expiration
    this.delAsync = promisify(this.client.del).bind(this.client);

    // Handle Redis connection errors
    this.client.on('error', (error) => {
      console.error(`Redis client not connected to the server: ${error.message}`);
    });
  }

  /**
   * Checks if the connection to Redis is alive.
   * @returns {boolean} True if Redis is connected, otherwise false.
   */
  isAlive() {
    return this.client.connected;
  }

  /**
   * Retrieves a value by key from Redis.
   * @param {string} key - The key to search for in Redis.
   * @returns {Promise<string | null>} The value associated with the key, or null if not found.
   */
  async get(key) {
    try {
      const value = await this.getAsync(key);
      return value;
    } catch (error) {
      console.error(`Error getting key "${key}" from Redis: ${error.message}`);
      return null;
    }
  }

  /**
   * Stores a key-value pair in Redis with a specified TTL (Time to Live).
   * @param {string} key - The key to be stored.
   * @param {string} value - The value to assign to the key.
   * @param {number} duration - The TTL for the key in seconds.
   * @returns {Promise<void>}
   */
  async set(key, value, duration) {
    try {
      await this.setAsync(key, duration, value);
    } catch (error) {
      console.error(`Error setting key "${key}" in Redis: ${error.message}`);
    }
  }

  /**
   * Deletes a key from Redis.
   * @param {string} key - The key to be deleted.
   * @returns {Promise<void>}
   */
  async del(key) {
    try {
      await this.delAsync(key);
    } catch (error) {
      console.error(`Error deleting key "${key}" from Redis: ${error.message}`);
    }
  }
}

// Export an instance of the RedisClient class
const redisClient = new RedisClient();
export default redisClient;
