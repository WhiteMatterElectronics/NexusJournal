export function parseIntelHex(data: string): Uint8Array {
  let highAddress = 0;
  let buf = new Uint8Array(8192);
  let bufLength = 0;

  const lines = data.split(/\r?\n/);

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    if (line[0] !== ":") throw new Error(`Invalid line ${i + 1}`);

    const byteCount = parseInt(line.substring(1, 3), 16);
    const address = parseInt(line.substring(3, 7), 16);
    const recordType = parseInt(line.substring(7, 9), 16);

    if (recordType === 0) {
      // Data
      const absoluteAddress = highAddress + address;
      if (absoluteAddress + byteCount > buf.length) {
        const newBuf = new Uint8Array((absoluteAddress + byteCount) * 2);
        newBuf.set(buf);
        buf = newBuf;
      }

      for (let j = 0; j < byteCount; j++) {
        const byte = parseInt(line.substring(9 + j * 2, 11 + j * 2), 16);
        buf[absoluteAddress + j] = byte;
      }
      bufLength = Math.max(bufLength, absoluteAddress + byteCount);
    } else if (recordType === 1) {
      // EOF
      break;
    } else if (recordType === 2) {
      // Extended Segment Address
      highAddress = parseInt(line.substring(9, 13), 16) << 4;
    } else if (recordType === 4) {
      // Extended Linear Address
      highAddress = parseInt(line.substring(9, 13), 16) << 16;
    }
  }

  return buf.slice(0, bufLength);
}
