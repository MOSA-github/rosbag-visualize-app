class CdrReaderError extends Error {
  constructor(message, code, cause) {
    super(message, cause ? { cause } : undefined);
    this.name = 'CdrReaderError';
    this.code = code;
  }
}

function toBuffer(serializedData) {
  if (Buffer.isBuffer(serializedData)) {
    return serializedData;
  }

  if (serializedData instanceof Uint8Array) {
    return Buffer.from(
      serializedData.buffer,
      serializedData.byteOffset,
      serializedData.byteLength,
    );
  }

  if (serializedData instanceof ArrayBuffer) {
    return Buffer.from(serializedData);
  }

  throw new CdrReaderError(
    'CDRデータはUint8ArrayまたはArrayBufferで指定してください。',
    'INVALID_CDR_DATA',
  );
}

/**
 * ROS 2で使われるXCDR1の基本型を読み取る。
 */
class CdrReader {
  constructor(serializedData, { maxSequenceLength = 1_000_000 } = {}) {
    if (!Number.isInteger(maxSequenceLength) || maxSequenceLength < 1) {
      throw new CdrReaderError(
        'CDR配列の最大件数が不正です。',
        'INVALID_CDR_SEQUENCE_LIMIT',
      );
    }

    this.buffer = toBuffer(serializedData);
    this.maxSequenceLength = maxSequenceLength;
    this.payloadStart = 4;
    this.offset = 0;
    this.littleEndian = false;
    this.readEncapsulation();
  }

  get remainingBytes() {
    return this.buffer.length - this.offset;
  }

  readEncapsulation() {
    if (this.buffer.length < this.payloadStart) {
      throw new CdrReaderError(
        'CDRエンカプセレーションが不足しています。',
        'TRUNCATED_CDR_DATA',
      );
    }

    const kind = this.buffer.readUInt16BE(0);

    if (kind === 0x0000) {
      this.littleEndian = false;
    } else if (kind === 0x0001) {
      this.littleEndian = true;
    } else {
      throw new CdrReaderError(
        '未対応のCDRエンカプセレーションです。',
        'UNSUPPORTED_CDR_ENCAPSULATION',
      );
    }

    this.offset = this.payloadStart;
  }

  align(alignment) {
    const payloadOffset = this.offset - this.payloadStart;
    const padding = (alignment - (payloadOffset % alignment)) % alignment;

    this.ensureAvailable(padding);
    this.offset += padding;
  }

  ensureAvailable(length) {
    if (!Number.isInteger(length) || length < 0 || this.remainingBytes < length) {
      throw new CdrReaderError(
        'CDRデータが途中で終了しています。',
        'TRUNCATED_CDR_DATA',
      );
    }
  }

  readAt(alignment, size, read) {
    this.align(alignment);
    this.ensureAvailable(size);
    const value = read(this.buffer, this.offset, this.littleEndian);
    this.offset += size;
    return value;
  }

  readUint8() {
    this.ensureAvailable(1);
    const value = this.buffer.readUInt8(this.offset);
    this.offset += 1;
    return value;
  }

  readInt8() {
    this.ensureAvailable(1);
    const value = this.buffer.readInt8(this.offset);
    this.offset += 1;
    return value;
  }

  readBool() {
    return this.readUint8() !== 0;
  }

  readUint16() {
    return this.readAt(2, 2, (buffer, offset, littleEndian) => (
      littleEndian ? buffer.readUInt16LE(offset) : buffer.readUInt16BE(offset)
    ));
  }

  readInt16() {
    return this.readAt(2, 2, (buffer, offset, littleEndian) => (
      littleEndian ? buffer.readInt16LE(offset) : buffer.readInt16BE(offset)
    ));
  }

  readUint32() {
    return this.readAt(4, 4, (buffer, offset, littleEndian) => (
      littleEndian ? buffer.readUInt32LE(offset) : buffer.readUInt32BE(offset)
    ));
  }

  readInt32() {
    return this.readAt(4, 4, (buffer, offset, littleEndian) => (
      littleEndian ? buffer.readInt32LE(offset) : buffer.readInt32BE(offset)
    ));
  }

  readFloat32() {
    return this.readAt(4, 4, (buffer, offset, littleEndian) => (
      littleEndian ? buffer.readFloatLE(offset) : buffer.readFloatBE(offset)
    ));
  }

  readFloat64() {
    return this.readAt(8, 8, (buffer, offset, littleEndian) => (
      littleEndian ? buffer.readDoubleLE(offset) : buffer.readDoubleBE(offset)
    ));
  }

  readInt64() {
    return this.readAt(8, 8, (buffer, offset, littleEndian) => (
      littleEndian ? buffer.readBigInt64LE(offset) : buffer.readBigInt64BE(offset)
    ));
  }

  readString() {
    const length = this.readUint32();

    if (length === 0) {
      return '';
    }

    this.ensureAvailable(length);
    const bytes = this.buffer.subarray(this.offset, this.offset + length);
    this.offset += length;

    if (bytes[bytes.length - 1] !== 0) {
      throw new CdrReaderError(
        'CDR文字列の終端文字が不正です。',
        'INVALID_CDR_STRING_TERMINATOR',
      );
    }

    return bytes.subarray(0, -1).toString('utf8');
  }

  readByteSequence() {
    const length = this.readUint32();

    this.ensureAvailable(length);
    const bytes = this.buffer.subarray(this.offset, this.offset + length);
    this.offset += length;

    // Bufferではなく汎用のUint8Arrayとしてアプリ層へ渡す。
    return new Uint8Array(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  }

  readSequence(readElement) {
    const length = this.readUint32();

    if (length > this.maxSequenceLength) {
      throw new CdrReaderError(
        'CDR配列の要素数が上限を超えています。',
        'CDR_SEQUENCE_TOO_LARGE',
      );
    }

    const values = [];

    for (let index = 0; index < length; index += 1) {
      values.push(readElement());
    }

    return values;
  }

  readFixedArray(length, readElement) {
    if (!Number.isInteger(length) || length < 0) {
      throw new CdrReaderError(
        '固定長配列の要素数が不正です。',
        'INVALID_CDR_FIXED_ARRAY_LENGTH',
      );
    }

    const values = [];

    for (let index = 0; index < length; index += 1) {
      values.push(readElement());
    }

    return values;
  }
}

module.exports = { CdrReader, CdrReaderError };
