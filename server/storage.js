import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { config } from './config.js';

// Every user gets their own folder: <STORAGE_DIR>/<userId>/<random>.pdf
// Keys are generated server-side only, so user input never reaches a path.

function userDir(userId) {
  if (!/^[0-9a-f-]{36}$/i.test(userId)) throw new Error('Invalid user id');
  return path.join(config.storageDir, userId);
}

function resolveKey(userId, key) {
  if (!/^[0-9a-f]{32}\.(pdf|zip)$/.test(key)) throw new Error('Invalid storage key');
  return path.join(userDir(userId), key);
}

export async function saveFile(userId, buffer, ext = 'pdf') {
  const dir = userDir(userId);
  await fs.mkdir(dir, { recursive: true });
  const key = `${crypto.randomBytes(16).toString('hex')}.${ext}`;
  await fs.writeFile(path.join(dir, key), buffer);
  return key;
}

export function readFile(userId, key) {
  return fs.readFile(resolveKey(userId, key));
}

export function filePath(userId, key) {
  return resolveKey(userId, key);
}

export async function deleteFile(userId, key) {
  await fs.rm(resolveKey(userId, key), { force: true });
}
