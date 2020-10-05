const ActiveTransport = require('./ActiveTransport.js');

class ActiveProducerTransport extends ActiveTransport {
    // Stores an array of active consumer transports connected to this producer transport
    childTransportIds = null;

    videoProducer = null;

    audioProducer = null;

    constructor(producerTransport) {
        super(producerTransport);
        this.childTransports = [];
    }

    addConsumerTransportId(consumerTransportId) {
        this.childTransports.push(consumerTransportId);
    }

    addVideoProducer(videoProducer) {
        this.videoProducer = videoProducer;
    }

    addAudioProducer(audioProducer) {
        this.audioProducer = audioProducer;
    }
}

module.exports = ActiveProducerTransport;