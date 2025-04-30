const https = require('https');
const fs = require('fs');
const path = require('path');

const MODEL_URL = 'https://github.com/justadudewhohacks/face-api.js/tree/master/weights';
const MODEL_DIR = path.join(__dirname, '..', 'public', 'models');

const models = [
  'tiny_face_detector_model-weights_manifest.json',
  'tiny_face_detector_model-shard1',
  'face_landmark_68_model-weights_manifest.json',
  'face_landmark_68_model-shard1',
  'face_recognition_model-weights_manifest.json',
  'face_recognition_model-shard1',
  'face_recognition_model-shard2'
];

if (!fs.existsSync(MODEL_DIR)) {
  fs.mkdirSync(MODEL_DIR, { recursive: true });
}

async function downloadFile(fileName) {
  const filePath = path.join(MODEL_DIR, fileName);
  const file = fs.createWriteStream(filePath);

  return new Promise((resolve, reject) => {
    https.get(`${MODEL_URL}/${fileName}`, response => {
      response.pipe(file);
      file.on('finish', () => {
        file.close();
        console.log(`Downloaded: ${fileName}`);
        resolve();
      });
    }).on('error', err => {
      fs.unlink(filePath, () => {});
      reject(err);
    });
  });
}

async function downloadModels() {
  try {
    for (const model of models) {
      await downloadFile(model);
    }
    console.log('All models downloaded successfully!');
  } catch (error) {
    console.error('Error downloading models:', error);
  }
}

downloadModels();