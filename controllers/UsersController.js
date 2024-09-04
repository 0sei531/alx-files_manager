import { ObjectId } from 'mongodb';
import bcrypt from 'bcrypt';
import Queue from 'bull';
import dbClient from '../utils/db';
import userUtils from '../utils/user';

const userQueue = new Queue('userQueue');
const saltRounds = 10;

class UsersController {
  /**
   * Creates a user using email and password
   *
   * To create a user, you must specify an email and a password.
   * Returns appropriate error messages with status code 400 if missing
   * email or password, or if email already exists in DB.
   * Stores the hashed password in the DB (bcrypt used).
   * Returns the new user with only email and ID (status code 201).
   */
  static async postNew(request, response) {
    const { email, password } = request.body;

    // Validate email and password
    if (!email) return response.status(400).send({ error: 'Missing email' });
    if (!password) return response.status(400).send({ error: 'Missing password' });

    try {
      // Check if email already exists in DB
      const emailExists = await dbClient.usersCollection.findOne({ email });
      if (emailExists) return response.status(400).send({ error: 'Already exist' });

      // Hash the password using bcrypt
      const hashedPassword = await bcrypt.hash(password, saltRounds);

      // Insert new user into the DB
      const result = await dbClient.usersCollection.insertOne({
        email,
        password: hashedPassword,
      });

      const user = {
        id: result.insertedId,
        email,
      };

      // Add the user to the queue for further processing (e.g., background tasks)
      await userQueue.add({ userId: result.insertedId.toString() });

      return response.status(201).send(user);
    } catch (err) {
      console.error('Error creating user:', err);
      return response.status(500).send({ error: 'Error creating user' });
    }
  }

  /**
   * Retrieves the user based on the token
   *
   * If not found, returns error "Unauthorized" with status code 401.
   * Otherwise, returns the user object (email and id only).
   */
  static async getMe(request, response) {
    try {
      // Retrieve user ID from the token using userUtils
      const { userId } = await userUtils.getUserIdAndKey(request);

      // Fetch user data from DB
      const user = await userUtils.getUser({ _id: ObjectId(userId) });
      if (!user) return response.status(401).send({ error: 'Unauthorized' });

      // Prepare user object excluding sensitive fields
      const { _id, password, ...processedUser } = user;
      return response.status(200).send({ id: _id, ...processedUser });
    } catch (err) {
      console.error('Error retrieving user:', err);
      return response.status(500).send({ error: 'Error retrieving user' });
    }
  }
}

export default UsersController;
