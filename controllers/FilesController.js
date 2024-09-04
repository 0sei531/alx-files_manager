import { v4 as uuidv4 } from 'uuid';
import { ObjectId } from 'mongodb';
import fs from 'fs/promises';
import mime from 'mime-types';
import Bull from 'bull';
import RedisClient from '../utils/redis';
import DBClient from '../utils/db';

class FilesController {
  static async postUpload(req, res) {
    try {
      const fileQueue = new Bull('fileQueue');
      const token = req.header('X-Token');
      if (!token) return res.status(401).json({ error: 'Unauthorized' });

      const userId = await RedisClient.get(`auth_${token}`);
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });

      const user = await DBClient.db.collection('users').findOne({ _id: ObjectId(userId) });
      if (!user) return res.status(401).json({ error: 'Unauthorized' });

      const { name, type, data, isPublic, parentId = 0 } = req.body;

      if (!name) return res.status(400).json({ error: 'Missing name' });
      if (!type || !['folder', 'file', 'image'].includes(type)) return res.status(400).json({ error: 'Missing type' });
      if (!data && ['file', 'image'].includes(type)) return res.status(400).json({ error: 'Missing data' });

      if (parentId !== 0) {
        const parentFile = await DBClient.db.collection('files').findOne({ _id: ObjectId(parentId) });
        if (!parentFile) return res.status(400).json({ error: 'Parent not found' });
        if (parentFile.type !== 'folder') return res.status(400).json({ error: 'Parent is not a folder' });
      }

      const fileDocument = {
        userId: user._id,
        name,
        type,
        isPublic: isPublic || false,
        parentId,
      };

      if (type === 'folder') {
        const result = await DBClient.db.collection('files').insertOne(fileDocument);
        return res.status(201).json({
          id: result.insertedId,
          ...fileDocument,
        });
      }

      const folderPath = process.env.FOLDER_PATH || '/tmp/files_manager';
      const filename = uuidv4();
      const localPath = `${folderPath}/${filename}`;

      await fs.mkdir(folderPath, { recursive: true });
      await fs.writeFile(localPath, Buffer.from(data, 'base64'));

      fileDocument.localPath = localPath;
      const result = await DBClient.db.collection('files').insertOne(fileDocument);

      fileQueue.add({
        userId: fileDocument.userId,
        fileId: result.insertedId,
      });

      return res.status(201).json({
        id: result.insertedId,
        ...fileDocument,
      });
    } catch (error) {
      console.error('Error in postUpload:', error);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  }

  static async getShow(req, res) {
    try {
      const token = req.header('X-Token');
      if (!token) return res.status(401).json({ error: 'Unauthorized' });

      const userId = await RedisClient.get(`auth_${token}`);
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });

      const user = await DBClient.db.collection('users').findOne({ _id: ObjectId(userId) });
      if (!user) return res.status(401).json({ error: 'Unauthorized' });

      const fileId = req.params.id;
      const file = await DBClient.db.collection('files').findOne({ _id: ObjectId(fileId), userId: user._id });
      if (!file) return res.status(404).json({ error: 'Not found' });

      return res.json({
        id: file._id,
        userId: file.userId,
        name: file.name,
        type: file.type,
        isPublic: file.isPublic,
        parentId: file.parentId,
      });
    } catch (error) {
      console.error('Error in getShow:', error);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  }

  static async getIndex(req, res) {
    try {
      const token = req.header('X-Token');
      if (!token) return res.status(401).json({ error: 'Unauthorized' });

      const userId = await RedisClient.get(`auth_${token}`);
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });

      const user = await DBClient.db.collection('users').findOne({ _id: ObjectId(userId) });
      if (!user) return res.status(401).json({ error: 'Unauthorized' });

      const parentId = req.query.parentId || 0;
      const page = parseInt(req.query.page, 10) || 0;
      const pageSize = 20;

      const query = { userId: user._id };
      if (parentId !== 0) query.parentId = ObjectId(parentId);

      const files = await DBClient.db.collection('files')
        .find(query)
        .skip(page * pageSize)
        .limit(pageSize)
        .toArray();

      const filesArray = files.map((file) => ({
        id: file._id,
        userId: file.userId,
        name: file.name,
        type: file.type,
        isPublic: file.isPublic,
        parentId: file.parentId,
      }));

      return res.json(filesArray);
    } catch (error) {
      console.error('Error in getIndex:', error);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  }

  static async putPublish(req, res) {
    try {
      const token = req.header('X-Token');
      if (!token) return res.status(401).json({ error: 'Unauthorized' });

      const userId = await RedisClient.get(`auth_${token}`);
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });

      const user = await DBClient.db.collection('users').findOne({ _id: ObjectId(userId) });
      if (!user) return res.status(401).json({ error: 'Unauthorized' });

      const fileId = req.params.id;
      const file = await DBClient.db.collection('files').findOneAndUpdate(
        { _id: ObjectId(fileId), userId: user._id },
        { $set: { isPublic: true } },
        { returnOriginal: false },
      );

      if (!file.value) return res.status(404).json({ error: 'Not found' });

      return res.json({
        id: file.value._id,
        userId: file.value.userId,
        name: file.value.name,
        type: file.value.type,
        isPublic: file.value.isPublic,
        parentId: file.value.parentId,
      });
    } catch (error) {
      console.error('Error in putPublish:', error);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  }

  static async putUnpublish(req, res) {
    try {
      const token = req.header('X-Token');
      if (!token) return res.status(401).json({ error: 'Unauthorized' });

      const userId = await RedisClient.get(`auth_${token}`);
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });

      const user = await DBClient.db.collection('users').findOne({ _id: ObjectId(userId) });
      if (!user) return res.status(401).json({ error: 'Unauthorized' });

      const fileId = req.params.id;
      const file = await DBClient.db.collection('files').findOneAndUpdate(
        { _id: ObjectId(fileId), userId: user._id },
        { $set: { isPublic: false } },
        { returnOriginal: false },
      );

      if (!file.value) return res.status(404).json({ error: 'Not found' });

      return res.json({
        id: file.value._id,
        userId: file.value.userId,
        name: file.value.name,
        type: file.value.type,
        isPublic: file.value.isPublic,
        parentId: file.value.parentId,
      });
    } catch (error) {
      console.error('Error in putUnpublish:', error);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  }

  static async getFile(req, res) {
    try {
      const fileId = req.params.id;
      const size = req.query.size ? parseInt(req.query.size, 10) : 0;

      const file = await DBClient.db.collection('files').findOne({ _id: ObjectId(fileId) });
      if (!file) return res.status(404).json({ error: 'Not found' });

      if (!file.isPublic) {
        const token = req.header('X-Token');
        if (!token) return res.status(404).json({ error: 'Not found' });

        const userId = await RedisClient.get(`auth_${token}`);
        if (!userId || userId !== file.userId.toString()) {
          return res.status(404).json({ error: 'Not found' });
        }
      }

      if (file.type === 'folder') {
        return res.status(400).json({ error: "A folder doesn't have content" });
      }

      const path = size === 0 ? file.localPath : `${file.localPath}_${size}`;

      if (!fs.existsSync(path)) {
        return res.status(404).json({ error: 'Not found' });
      }

      const mimeType = mime.lookup(file.name);
      res.setHeader('Content-Type', mimeType);

      const fileStream = fs.createReadStream(path);
      fileStream.pipe(res);
    } catch (error) {
      console.error('Error in getFile:', error);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  }
}

export default FilesController;
