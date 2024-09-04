import Queue from 'bull';
import { ObjectId } from 'mongodb';
import { promises as fsPromises } from 'fs';
import fileUtils from './utils/file';
import userUtils from './utils/user';
import basicUtils from './utils/basic';
import imageThumbnail from 'image-thumbnail';

const fileQueue = new Queue('fileQueue');
const userQueue = new Queue('userQueue');

fileQueue.process(async (job) => {
  const { fileId, userId } = job.data;

  if (!userId) {
    console.error('Missing userId');
    throw new Error('Missing userId');
  }

  if (!fileId) {
    console.error('Missing fileId');
    throw new Error('Missing fileId');
  }

  if (!basicUtils.isValidId(fileId) || !basicUtils.isValidId(userId)) {
    console.error(`Invalid IDs: fileId: ${fileId}, userId: ${userId}`);
    throw new Error('File not found');
  }

  const file = await fileUtils.getFile({
    _id: ObjectId(fileId),
    userId: ObjectId(userId),
  });

  if (!file) {
    console.error('File not found');
    throw new Error('File not found');
  }

  const { localPath } = file;
  const options = {};
  const widths = [500, 250, 100];

  for (const width of widths) {
    options.width = width;
    try {
      const thumbnail = await imageThumbnail(localPath, options);
      await fsPromises.writeFile(`${localPath}_${width}`, thumbnail);
      console.log(`Thumbnail created for width ${width} at ${localPath}_${width}`);
    } catch (err) {
      console.error(`Error creating thumbnail for width ${width}: ${err.message}`);
    }
  }
});

userQueue.process(async (job) => {
  const { userId } = job.data;

  if (!userId) {
    console.error('Missing userId');
    throw new Error('Missing userId');
  }

  if (!basicUtils.isValidId(userId)) {
    console.error(`Invalid userId: ${userId}`);
    throw new Error('User not found');
  }

  const user = await userUtils.getUser({ _id: ObjectId(userId) });

  if (!user) {
    console.error('User not found');
    throw new Error('User not found');
  }

  console.log(`Welcome ${user.email}!`);
});
