import dbClient from '../utils/db';
import userUtils from '../utils/user';
import fileUtils from '../utils/file';
import basicUtils from '../utils/basic';
import { ObjectId } from 'mongodb';
import { fileQueue } from '../worker';

// Middleware to authenticate users
const authenticateUser = async (req, res, next) => {
  try {
    const { userId } = await userUtils.getUserIdAndKey(req);
    if (!basicUtils.isValidId(userId)) return res.status(401).send({ error: 'Unauthorized' });
  
    const user = await userUtils.getUser({ _id: ObjectId(userId) });
    if (!user) return res.status(401).send({ error: 'Unauthorized' });
  
    req.user = user;
    next();
  } catch (error) {
    return res.status(500).send({ error: 'Server error' });
  }
};

class FilesController {
  /**
   * Uploads a file to the server
   * @param {Object} request - Express request object
   * @param {Object} response - Express response object
   * @returns {Object} - New file document
   */
  static async postUpload(request, response) {
    try {
      const { userId } = await userUtils.getUserIdAndKey(request);
      if (!basicUtils.isValidId(userId)) return response.status(401).send({ error: 'Unauthorized' });

      const { name, type, parentId, isPublic = false, data } = request.body;

      // Validate inputs
      if (!name) return response.status(400).send({ error: 'Missing name' });
      if (!type) return response.status(400).send({ error: 'Missing type' });
      if (!['folder', 'file', 'image'].includes(type)) return response.status(400).send({ error: 'Invalid type' });
      if (type !== 'folder' && !data) return response.status(400).send({ error: 'Missing data' });

      // Validate parentId if provided
      if (parentId && !basicUtils.isValidId(parentId)) return response.status(400).send({ error: 'Invalid parentId' });

      const parentFile = parentId ? await fileUtils.getFile({ _id: ObjectId(parentId) }) : null;
      if (parentId && (!parentFile || parentFile.type !== 'folder')) {
        return response.status(400).send({ error: 'Parent is not a folder' });
      }

      // Create and save the file
      const fileData = {
        userId: ObjectId(userId),
        name,
        type,
        isPublic,
        parentId: parentId ? ObjectId(parentId) : 0,
        localPath: type === 'folder' ? null : await fileUtils.saveFileContent(userId, data),
      };

      const newFile = await dbClient.files.insertOne(fileData);
      if (type !== 'folder') await fileQueue.add({ fileId: newFile.insertedId, userId });

      return response.status(201).send({
        id: newFile.insertedId,
        userId,
        ...fileData,
      });
    } catch (error) {
      return response.status(500).send({ error: 'Server error' });
    }
  }

  /**
   * Retrieves a file by its ID
   * @param {Object} request - Express request object
   * @param {Object} response - Express response object
   */
  static async getShow(request, response) {
    try {
      const { userId } = await userUtils.getUserIdAndKey(request);
      if (!basicUtils.isValidId(userId)) return response.status(401).send({ error: 'Unauthorized' });

      const fileId = request.params.id;
      if (!basicUtils.isValidId(fileId)) return response.status(400).send({ error: 'Invalid fileId' });

      const file = await fileUtils.getFile({ _id: ObjectId(fileId) });
      if (!file) return response.status(404).send({ error: 'Not found' });

      if (file.userId.toString() !== userId && !file.isPublic) {
        return response.status(403).send({ error: 'Unauthorized' });
      }

      return response.status(200).send(file);
    } catch (error) {
      return response.status(500).send({ error: 'Server error' });
    }
  }

  /**
   * Retrieves files for a specific user, supports pagination
   * @param {Object} request - Express request object
   * @param {Object} response - Express response object
   */
  static async getIndex(request, response) {
    try {
      const { userId } = await userUtils.getUserIdAndKey(request);
      if (!basicUtils.isValidId(userId)) return response.status(401).send({ error: 'Unauthorized' });

      const parentId = request.query.parentId || '0';
      const page = parseInt(request.query.page, 10) || 0;

      const query = { userId: ObjectId(userId), parentId: parentId === '0' ? '0' : ObjectId(parentId) };

      const fileList = await dbClient.files
        .find(query)
        .skip(page * 20)
        .limit(20)
        .toArray();

      const totalItems = await dbClient.files.countDocuments(query);

      return response.status(200).send({
        page,
        totalPages: Math.ceil(totalItems / 20),
        totalItems,
        data: fileList,
      });
    } catch (error) {
      return response.status(500).send({ error: 'Server error' });
    }
  }

  /**
   * Retrieves file content by file ID
   * @param {Object} request - Express request object
   * @param {Object} response - Express response object
   */
  static async getFile(request, response) {
    try {
      const { userId } = await userUtils.getUserIdAndKey(request);
      if (!basicUtils.isValidId(userId)) return response.status(401).send({ error: 'Unauthorized' });

      const fileId = request.params.id;
      if (!basicUtils.isValidId(fileId)) return response.status(400).send({ error: 'Invalid fileId' });

      const file = await fileUtils.getFile({ _id: ObjectId(fileId) });
      if (!file) return response.status(404).send({ error: 'Not found' });

      if (file.type === 'folder') return response.status(400).send({ error: 'A folder doesn’t have content' });

      if (file.userId.toString() !== userId && !file.isPublic) {
        return response.status(403).send({ error: 'Unauthorized' });
      }

      return response.sendFile(file.localPath);
    } catch (error) {
      return response.status(500).send({ error: 'Server error' });
    }
  }

  /**
   * Publishes a file, making it accessible publicly
   * @param {Object} request - Express request object
   * @param {Object} response - Express response object
   */
  static async putPublish(request, response) {
    try {
      const { userId } = await userUtils.getUserIdAndKey(request);
      if (!basicUtils.isValidId(userId)) return response.status(401).send({ error: 'Unauthorized' });

      const fileId = request.params.id;
      if (!basicUtils.isValidId(fileId)) return response.status(400).send({ error: 'Invalid fileId' });

      const file = await fileUtils.getFile({ _id: ObjectId(fileId) });
      if (!file) return response.status(404).send({ error: 'Not found' });

      if (file.userId.toString() !== userId) {
        return response.status(403).send({ error: 'Unauthorized' });
      }

      await dbClient.files.updateOne({ _id: ObjectId(fileId) }, { $set: { isPublic: true } });
      return response.status(200).send({ id: fileId, isPublic: true });
    } catch (error) {
      return response.status(500).send({ error: 'Server error' });
    }
  }

  /**
   * Unpublishes a file, making it private
   * @param {Object} request - Express request object
   * @param {Object} response - Express response object
   */
  static async putUnpublish(request, response) {
    try {
      const { userId } = await userUtils.getUserIdAndKey(request);
      if (!basicUtils.isValidId(userId)) return response.status(401).send({ error: 'Unauthorized' });

      const fileId = request.params.id;
      if (!basicUtils.isValidId(fileId)) return response.status(400).send({ error: 'Invalid fileId' });

      const file = await fileUtils.getFile({ _id: ObjectId(fileId) });
      if (!file) return response.status(404).send({ error: 'Not found' });

      if (file.userId.toString() !== userId) {
        return response.status(403).send({ error: 'Unauthorized' });
      }

      await dbClient.files.updateOne({ _id: ObjectId(fileId) }, { $set: { isPublic: false } });
      return response.status(200).send({ id: fileId, isPublic: false });
    } catch (error) {
      return response.status(500).send({ error: 'Server error' });
    }
  }
}

export default FilesController;
