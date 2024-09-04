import { MongoClient } from 'mongodb';

const host = process.env.DB_HOST || 'localhost';
const port = process.env.DB_PORT || 27017;
const database = process.env.DB_DATABASE || 'files_manager';
const url = `mongodb://${host}:${port}`;

class DBClient {
  constructor() {
    this.client = new MongoClient(url, { useUnifiedTopology: true });
    this.client.connect()
      .then((client) => {
        this.db = client.db(database);
        this.usersCollection = this.db.collection('users');
        this.filesCollection = this.db.collection('files');
        console.log('Successfully connected to MongoDB');
      })
      .catch((err) => {
        console.error(`Error connecting to MongoDB: ${err.message}`);
        this.db = null;
      });
  }

  /**
   * Checks if the MongoDB connection is alive.
   * @returns {boolean} True if the connection is established, false otherwise.
   */
  isAlive() {
    return !!this.db;
  }

  /**
   * Returns the number of documents in the 'users' collection.
   * @returns {Promise<number>} The number of users in the collection.
   */
  async nbUsers() {
    if (!this.isAlive()) return 0;
    return this.usersCollection.countDocuments();
  }

  /**
   * Returns the number of documents in the 'files' collection.
   * @returns {Promise<number>} The number of files in the collection.
   */
  async nbFiles() {
    if (!this.isAlive()) return 0;
    return this.filesCollection.countDocuments();
  }
}

const dbClient = new DBClient();
export default dbClient;
