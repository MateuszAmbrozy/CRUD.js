const multer = require('multer');
const path = require('node:path');
const fs = require('node:fs/promises');
const { randomUUID } = require('node:crypto');
const { HttpError } = require('./validation');
const directory = path.join(__dirname, '..', 'uploads');
const parser = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 2 * 1024 * 1024,
    files: 20,
    fields: 110,
    parts: 130,
    fieldSize: 10000,
    fieldNameSize: 100,
    fieldArrayIndexLimit: 19,
  },
  fileFilter(req, file, cb) {
    cb(
      ['image/png', 'image/jpeg', 'image/webp'].includes(file.mimetype)
        ? null
        : new HttpError(422, 'Only PNG, JPEG and WebP images are supported.'),
      true,
    );
  },
});
function extension(buffer) {
  if (
    buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
  )
    return 'png';
  if (buffer[0] === 255 && buffer[1] === 216 && buffer[2] === 255) return 'jpg';
  if (
    buffer.toString('ascii', 0, 4) === 'RIFF' &&
    buffer.toString('ascii', 8, 12) === 'WEBP'
  )
    return 'webp';
  throw new HttpError(422, 'Upload a PNG, JPEG or WebP image (maximum 2 MB).');
}
async function saveImage(file, created) {
  if (!file) return undefined;
  const name = `${randomUUID()}.${extension(file.buffer)}`;
  await fs.mkdir(directory, { recursive: true });
  await fs.writeFile(path.join(directory, name), file.buffer, { flag: 'wx' });
  created.push(name);
  return name;
}
async function removeImages(names) {
  for (const name of names.filter(Boolean)) {
    // Legacy filenames are supported, but stored paths may never escape uploads.
    if (path.basename(name) !== name) continue;
    try {
      await fs.unlink(path.join(directory, name));
    } catch (error) {
      if (error.code !== 'ENOENT')
        console.error('Image cleanup failed:', error.code);
    }
  }
}
const fields = Array.from({ length: 20 }, (_, i) => ({
  name: `ingredients[${i}][image]`,
  maxCount: 1,
}));
module.exports = {
  addUpload: parser.fields(fields),
  editUpload: parser.single('image'),
  saveImage,
  removeImages,
  extension,
  directory,
};
