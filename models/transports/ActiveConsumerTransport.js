const ActiveTransport = require('./ActiveTransport.js');

class ActiveConsumerTransport extends ActiveTransport {
    // The producer transportId that is producing to this consumer transport
    parentTransportId = null;

    videoConsumer = null;

    audioConsumer = null;

    constructor(consumerTransport, parentProducerTransportId) {
      // We use the router id as the room id
      super(consumerTransport);
      this.parentTransportId = parentProducerTransportId;
    }

    addVideoConsumer(videoProducer) {
        this.videoConsumer = videoProducer;
    }

    addAudioConsumer(audioProducer) {
        this.audioConsumer = audioProducer;
    }
}

module.exports = ActiveConsumerTransport;