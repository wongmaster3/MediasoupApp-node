// Worklet will convert stream into float array and use rs3d to transform audio
class SpatialProcessor extends AudioWorkletProcessor {
    // Number of objects that are in the input: (number of people in the call) - 1
    currentNumInputs = null;

    // Maximum number of objects that can be in the call
    maxNumInputs = null;

    // Audio sample rate
    sampleRate = null;

    // Audio sample block
    sampleBlock = 128;

    // Create a shared buffer between js and emscripten for mono input
    // It will be a 2D array where each element is an array of the person's audio samples
    // Length will be maximum number of people in the call
    _heapInputBuffer = null;

    // Create a shared buffer between js and emscripten for stereo output
    // It will be a 2D array where each element is an array of the combined and transformed input samples
    // Length will be 2 (stereo output has two channels)
    _heapOutputBuffer = null;

    constructor(options) {
        super();
        // console.log(Module);

        this.currentNumInputs = options.processorOptions.currentNumberOfInputs;

        this.maxNumInputs = options.numberOfInputs;

        this.sampleRate = options.processorOptions.sampleRate;

        // Load icb inline method
        Module.__Z10initializeii(this.sampleRate, this.sampleBlock);
        
        this._heapInputBuffer = new HeapAudioBuffer(this.maxNumInputs);

        this._heapOutputBuffer = new HeapAudioBuffer(2);

        // Used to update the audio settings for processing
        this.port.onmessage = (event) => {
            var obj = event.data;
            if (obj.type === "audio_settings") {
                Module.__Z16updateObjectInfolffff(obj.index, obj.volume, obj.position.x, obj.position.y, obj.position.z);
            } else if (obj.type === "head_orientation_settings") {
                Module.__Z21updateHeadOrientationfff(obj.x, obj.y, obj.z)
            } else if (obj.type === "audio_node_settings") {
                this.currentNumInputs = obj.currentNumberOfInputs;
            } else {
                console.log("ERROR: INVALID SETTING")
            }
        }
    }

    process (inputs, outputs, parameters) {       
        // MIGHT BE BUG: For some reason, the number of channels for input audio is 2 not 1 for each person since mic might be stereo
        // Length of channel will always be 128, but MDN says it could change later on to be varying

        // Fill in each channel in the shared input buffer to be the incoming audio inputs for each person
        for (var inputNum = 0; inputNum < this.currentNumInputs; inputNum++) {
            // Since the 'inputs' parameter currently has two channels per input and they are the same, we will only grab the first channel
            this._heapInputBuffer.getChannelData(inputNum).set(inputs[inputNum][0]);
        }

        // Call the wasm process method to transform the input audio to be spatial stereo audio
        Module.__Z7processPPfS0_i(this._heapInputBuffer.getHeapAddress(), this._heapOutputBuffer.getHeapAddress(), this.currentNumInputs);
        
        // Copy the transformed audio from the shared buffer to the actual output that the process function will return
        outputs[0][0].set(this._heapOutputBuffer.getChannelData(0));
        outputs[0][1].set(this._heapOutputBuffer.getChannelData(1));

        return true;
        
    }
}

registerProcessor("spatial-processor", SpatialProcessor);