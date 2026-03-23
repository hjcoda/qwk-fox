import { writeFileSync } from 'fs';
import { deflateSync, crc32 } from 'zlib';

const BUFFER_SIZE = 128;

function padRight(str, length) {
  return str.padEnd(length, ' ').slice(0, length);
}

function createControlDat() {
  const lines = [
    'Test BBS',                    // Line 1: BBS name
    'Test City, TS',              // Line 2: City and state
    '555-1234',                   // Line 3: Phone number
    'Test Sysop',                 // Line 4: Sysop name
    '00000,TESTBBS',              // Line 5: BBS ID
    '03-23-2026,12:00:00',       // Line 6: Creation time
    'TESTUSER',                   // Line 7: User name
    '',                           // Line 8: Unused
    '0',                          // Line 9: 0
    '0',                          // Line 10: 0
    '2',                          // Line 11: Number of conferences
    '0',                          // Line 12: 0
    '1',                          // Conference 1 ID
    'General',                    // Conference 1 name
    '2',                          // Conference 2 ID
    'Off-Topic',                  // Conference 2 name
    '254'                         // End marker
  ];
  return lines.join('\r\n') + '\r\n';
}

function createMessagesDat() {
  const records = [];
  
  // First record: copyright notice (128 bytes)
  const copyright = padRight('QWK format copyright 1987 Sparkware', BUFFER_SIZE);
  records.push(Buffer.from(copyright, 'ascii'));
  
  // Message 1
  const msg1Header = Buffer.alloc(BUFFER_SIZE, 0);
  msg1Header[0] = 0x20; // Status: public unread
  Buffer.from(padRight('000001', 6)).copy(msg1Header, 1);
  Buffer.from(padRight('03-23-26', 8)).copy(msg1Header, 8);
  Buffer.from(padRight('12:00 ', 5)).copy(msg1Header, 16);
  Buffer.from(padRight('ALL', 25)).copy(msg1Header, 21);
  Buffer.from(padRight('Sysop', 25)).copy(msg1Header, 46);
  Buffer.from(padRight('Welcome to QWK Fox!', 25)).copy(msg1Header, 71);
  Buffer.from(padRight('00000000', 8)).copy(msg1Header, 108);
  msg1Header.writeUInt16LE(1, 116); // Number of text chunks
  msg1Header.writeUInt16LE(1, 123); // Conference ID
  records.push(msg1Header);
  
  // Message 1 text
  const msg1Text = Buffer.alloc(BUFFER_SIZE, 0);
  Buffer.from(padRight('Welcome to QWK Fox! This is a test message.', BUFFER_SIZE)).copy(msg1Text);
  records.push(msg1Text);
  
  // Message 2
  const msg2Header = Buffer.alloc(BUFFER_SIZE, 0);
  msg2Header[0] = 0x20;
  Buffer.from(padRight('000002', 6)).copy(msg2Header, 1);
  Buffer.from(padRight('03-23-26', 8)).copy(msg2Header, 8);
  Buffer.from(padRight('12:01 ', 5)).copy(msg2Header, 16);
  Buffer.from(padRight('ALL', 25)).copy(msg2Header, 21);
  Buffer.from(padRight('TestUser', 25)).copy(msg2Header, 46);
  Buffer.from(padRight('Second Message', 25)).copy(msg2Header, 71);
  Buffer.from(padRight('00000000', 8)).copy(msg2Header, 108);
  msg2Header.writeUInt16LE(1, 116);
  msg2Header.writeUInt16LE(1, 123);
  records.push(msg2Header);
  
  const msg2Text = Buffer.alloc(BUFFER_SIZE, 0);
  Buffer.from(padRight('This is another test message in the General conference.', BUFFER_SIZE)).copy(msg2Text);
  records.push(msg2Text);
  
  // Message 3
  const msg3Header = Buffer.alloc(BUFFER_SIZE, 0);
  msg3Header[0] = 0x20;
  Buffer.from(padRight('000003', 6)).copy(msg3Header, 1);
  Buffer.from(padRight('03-23-26', 8)).copy(msg3Header, 8);
  Buffer.from(padRight('12:02 ', 5)).copy(msg3Header, 16);
  Buffer.from(padRight('ALL', 25)).copy(msg3Header, 21);
  Buffer.from(padRight('AnotherUser', 25)).copy(msg3Header, 46);
  Buffer.from(padRight('Off-Topic Post', 25)).copy(msg3Header, 71);
  Buffer.from(padRight('00000000', 8)).copy(msg3Header, 108);
  msg3Header.writeUInt16LE(1, 116);
  msg3Header.writeUInt16LE(2, 123); // Conference 2
  records.push(msg3Header);
  
  const msg3Text = Buffer.alloc(BUFFER_SIZE, 0);
  Buffer.from(padRight('This is a message in the Off-Topic conference.', BUFFER_SIZE)).copy(msg3Text);
  records.push(msg3Text);
  
  return Buffer.concat(records);
}

function createZip(controlDat, messagesDat) {
  const files = [
    { name: 'CONTROL.DAT', content: Buffer.from(controlDat, 'ascii') },
    { name: 'MESSAGES.DAT', content: messagesDat }
  ];
  
  const localHeaders = [];
  const centralDirectory = [];
  let offset = 0;
  
  for (const file of files) {
    const nameBuffer = Buffer.from(file.name, 'ascii');
    const compressed = deflateSync(file.content);
    const crc = crc32(file.content) >>> 0;
    
    // Local file header
    const localHeader = Buffer.alloc(30 + nameBuffer.length);
    localHeader.writeUInt32LE(0x04034b50, 0);
    localHeader.writeUInt16LE(20, 4);
    localHeader.writeUInt16LE(0, 6);
    localHeader.writeUInt16LE(8, 8);
    localHeader.writeUInt32LE(crc, 14);
    localHeader.writeUInt32LE(compressed.length, 18);
    localHeader.writeUInt32LE(file.content.length, 22);
    localHeader.writeUInt16LE(nameBuffer.length, 26);
    localHeader.writeUInt16LE(0, 28);
    nameBuffer.copy(localHeader, 30);
    
    localHeaders.push(Buffer.concat([localHeader, compressed]));
    
    // Central directory entry
    const cdEntry = Buffer.alloc(46 + nameBuffer.length);
    cdEntry.writeUInt32LE(0x02014b50, 0);
    cdEntry.writeUInt16LE(20, 4);
    cdEntry.writeUInt16LE(20, 6);
    cdEntry.writeUInt16LE(0, 8);
    cdEntry.writeUInt16LE(8, 10);
    cdEntry.writeUInt32LE(crc, 16);
    cdEntry.writeUInt32LE(compressed.length, 20);
    cdEntry.writeUInt32LE(file.content.length, 24);
    cdEntry.writeUInt16LE(nameBuffer.length, 28);
    cdEntry.writeUInt16LE(0, 30);
    cdEntry.writeUInt16LE(0, 32);
    cdEntry.writeUInt16LE(0, 34);
    cdEntry.writeUInt16LE(0, 36);
    cdEntry.writeUInt32LE(0, 38);
    cdEntry.writeUInt32LE(offset, 42);
    nameBuffer.copy(cdEntry, 46);
    
    centralDirectory.push(cdEntry);
    offset += localHeader.length + compressed.length;
  }
  
  // End of central directory
  const cd = Buffer.concat(centralDirectory);
  const cdOffset = offset;
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(0, 4);
  eocd.writeUInt16LE(0, 6);
  eocd.writeUInt16LE(files.length, 8);
  eocd.writeUInt16LE(files.length, 10);
  eocd.writeUInt32LE(cd.length, 12);
  eocd.writeUInt32LE(cdOffset, 16);
  eocd.writeUInt16LE(0, 20);
  
  return Buffer.concat([...localHeaders, cd, eocd]);
}

const controlDat = createControlDat();
const messagesDat = createMessagesDat();
const zip = createZip(controlDat, messagesDat);

writeFileSync('e2e/fixtures/sample.qwk', zip);
console.log('Created e2e/fixtures/sample.qwk');
