import fs from 'fs/promises';
import app from './src/index.js';
import { toSSG } from 'hono/ssg';

const main = async () => {
  try {
    const publicDir = './public';
    await fs.mkdir(publicDir, { recursive: true });
    console.log('Starting SSG process...');
    const result = await toSSG(app, fs, { dir: publicDir });
    if (result.success) {
      console.log('SSG process completed successfully!');
      console.log('Generated files:', result.files);
    } else {
      console.error('SSG process failed:', result.error);
    }
  } catch (e) {
    console.error('An unexpected error occurred:', e);
    process.exit(1);
  }
};

main();
