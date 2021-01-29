// Size of float pointer in C++ assuming i32 addressing
const BYTES_PER_POINTER = Uint32Array.BYTES_PER_ELEMENT;

// Byte per audio sample. (32 bit float)
const BYTES_PER_SAMPLE = Float32Array.BYTES_PER_ELEMENT;

// The max audio channel on Chrome is 32.
// const MAX_CHANNEL_COUNT = 32;

// WebAudio's render quantum size.
const SAMPLES_PER_CHANNEL = 128;

class HeapAudioBuffer {

  constructor(numChannels) {
    const channelByteSize = SAMPLES_PER_CHANNEL * BYTES_PER_SAMPLE;

    this._ptrOfPtr = Module._malloc(numChannels * BYTES_PER_POINTER);   
    // View the Heap as an unsigned int 32 array 
    this._channelsPtr = new Uint32Array(Module.HEAP8.buffer, this._ptrOfPtr, numChannels)

    this._startDataPtr = Module._malloc(numChannels*channelByteSize);

    this._channelData = [];
    
    for (var i = 0; i < numChannels; i++) {
      var startByteOffset = this._startDataPtr + i * channelByteSize;
      var endByteOffset = startByteOffset + channelByteSize;
      
      // console.log(startByteOffset);
      this._channelsPtr[i] = startByteOffset;

      // View the Heap as a Float32Array
      this._channelData[i] = new Float32Array(Module.HEAP8.buffer, startByteOffset, SAMPLES_PER_CHANNEL);
    }

    // >> is same as divide by 4
    // console.log(Module.HEAPU32.subarray(this._ptrOfPtr >> 2, (this._ptrOfPtr + numChannels * BYTES_PER_POINTER) >> 2));
    // console.log(tempPtrOfPtr);
  }

  getChannelData(channelIndex) {
    return this._channelData[channelIndex]; 
  }

  getHeapAddress() {
    return this._ptrOfPtr;
  }

  free() {
    Module._free(this._startDataPtr);
    Module._free(this._ptrOfPtr);
  }

}