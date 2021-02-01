const ActiveTransport = require('./ActiveTransport.js');

class ActiveProducerTransport extends ActiveTransport {
    constructor(producerTransport) {
        super(producerTransport);
        // Stores hashmap of 'destination producer transport id' -> 'destination consumer transport id'
        // this.producingToConsumerTransports = {};
        this.videoProducer = null;
        this.audioProducer = null;
    }

    // addConsumerTransportId(destUserName, consumerTransportId) {
    //     this.producingToConsumerTransports[destUserName] = consumerTransportId;
    // }

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