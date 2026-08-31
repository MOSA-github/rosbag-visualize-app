class CdrWriter {
  constructor({ littleEndian = true } = {}) {
    this.littleEndian = littleEndian;
    this.chunks = [Buffer.from([0x00, littleEndian ? 0x01 : 0x00, 0x00, 0x00])];
    this.payloadOffset = 0;
  }

  align(alignment) {
    const padding = (alignment - (this.payloadOffset % alignment)) % alignment;

    if (padding > 0) {
      this.writeRaw(Buffer.alloc(padding));
    }
  }

  writeRaw(bytes) {
    const buffer = Buffer.from(bytes);

    this.chunks.push(buffer);
    this.payloadOffset += buffer.length;
  }

  writeNumber(alignment, size, write) {
    this.align(alignment);
    const buffer = Buffer.alloc(size);

    write(buffer);
    this.writeRaw(buffer);
  }

  writeUint8(value) {
    this.writeNumber(1, 1, (buffer) => buffer.writeUInt8(value));
  }

  writeBool(value) {
    this.writeUint8(value ? 1 : 0);
  }

  writeUint32(value) {
    this.writeNumber(4, 4, (buffer) => (
      this.littleEndian ? buffer.writeUInt32LE(value) : buffer.writeUInt32BE(value)
    ));
  }

  writeInt32(value) {
    this.writeNumber(4, 4, (buffer) => (
      this.littleEndian ? buffer.writeInt32LE(value) : buffer.writeInt32BE(value)
    ));
  }

  writeInt64(value) {
    this.writeNumber(8, 8, (buffer) => (
      this.littleEndian ? buffer.writeBigInt64LE(BigInt(value)) : buffer.writeBigInt64BE(BigInt(value))
    ));
  }

  writeFloat64(value) {
    this.writeNumber(8, 8, (buffer) => (
      this.littleEndian ? buffer.writeDoubleLE(value) : buffer.writeDoubleBE(value)
    ));
  }

  writeString(value) {
    const bytes = Buffer.from(`${value}\0`, 'utf8');

    this.writeUint32(bytes.length);
    this.writeRaw(bytes);
  }

  writeByteSequence(values) {
    this.writeUint32(values.length);
    this.writeRaw(values);
  }

  writeSequence(values, writeElement) {
    this.writeUint32(values.length);
    values.forEach((value) => writeElement(value));
  }

  writeFixedArray(values, writeElement) {
    values.forEach((value) => writeElement(value));
  }

  toBuffer() {
    return Buffer.concat(this.chunks);
  }
}

module.exports = { CdrWriter };
