const ActiveTransport = require('./ActiveTransport.js');

class ActiveProducerTransport extends ActiveTransport {
    // Stores an array of active consumer transports connected to this producer transport
    childTransportIds = null;

    videoProducer = null;

    audioProducer = null;

    constructor(producerTransport) {
        super(producerTransport);
        this.childTransportIds = {};
    }

    addConsumerTransportId(associatedProducerTransportId, consumerTransportId) {
        this.childTransportIds[associatedProducerTransportId] = consumerTransportId;
    }

    addVideoProducer(videoProducer) {
        this.videoProducer = videoProducer;
        this.videoProducer.on("transportclose", () => {
            this.videoProducer.close();
            console.log("Closing Video Producer in Producer Transport " + this.transportId + "!");
        });  
    }

    addAudioProducer(audioProducer) {
        this.audioProducer = audioProducer;
        this.audioProducer.on("transportclose", () => {
            this.audioProducer.close();
            console.log("Closing Audio Producer in Producer Transport " + this.transportId + "!");
        });   
    } 
}

module.exports = ActiveProducerTransport;