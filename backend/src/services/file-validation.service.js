const { createReadStream } = require('node:fs');
const fs = require('node:fs/promises');
const path = require('node:path');
const { TextDecoder } = require('node:util');

async function isUtf8Text(filePath) {
  const decoder = new TextDecoder('utf-8', { fatal: true });

  try {
    for await (const chunk of createReadStream(filePath)) {
      if (chunk.includes(0)) return false;
      decoder.decode(chunk, { stream: true });
    }
    decoder.decode();
    return true;
  } catch {
    return false;
  }
}

async function hasExpectedContent(file) {
  const extension = path.extname(file.originalname).toLowerCase();

  if (extension === '.txt') return isUtf8Text(file.path);

  const handle = await fs.open(file.path, 'r');
  try {
    const fileStats = await handle.stat();
    const header = Buffer.alloc(Math.min(fileStats.size, 1024));
    const { bytesRead } = await handle.read(header, 0, header.length, 0);
    const prefix = header.subarray(0, bytesRead);

    if (extension === '.pdf') return prefix.includes(Buffer.from('%PDF-'));
    if (extension === '.doc') {
      return prefix.subarray(0, 8).equals(Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]));
    }
    if (extension === '.rtf') return prefix.subarray(0, 5).equals(Buffer.from('{\\rtf'));
    if (extension !== '.docx' || !prefix.subarray(0, 4).equals(Buffer.from('PK\x03\x04'))) {
      return false;
    }

    const tailSize = Math.min(fileStats.size, 65557);
    const tail = Buffer.alloc(tailSize);
    const tailRead = await handle.read(tail, 0, tailSize, fileStats.size - tailSize);
    const zipDirectory = tail.subarray(0, tailRead.bytesRead).toString('utf8');
    return zipDirectory.includes('[Content_Types].xml')
      && zipDirectory.includes('word/document.xml');
  } finally {
    await handle.close();
  }
}

module.exports = { hasExpectedContent };