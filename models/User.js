const ActiveProducerTransport = require('./transports/ActiveProducerTransport.js');
const ActiveConsumerTransport = require('./transports/ActiveConsumerTransport.js');

class User {
    constructor(userName) {
        // Name of the user in call
        this.userName = userName;
        
        // Will store the producer transport associated with current user name
        this.associatedProducerTransport = null;

        // Will store the consumer transport associated with current user name
        this.associatedConsumerTransport = null;
    }

    addActiveProducerTransport(producerTransport) {
        this.associatedProducerTransport = new ActiveProducerTransport(producerTransport);
    }

    addActiveConsumerTransport(consumerTransport) {
        this.associatedConsumerTransport = new ActiveConsumerTransport(consumerTransport);
    }

    producerTransportConnect(params) {
        this.associatedProducerTransport.transport.connect(params);
    }

    consumerTransportConnect(params) {
        this.associatedConsumerTransport.transport.connect(params);
    }

    addActiveProducerToTransport(producer) {
        if (producer.kind === 'video') {
            this.associatedProducerTransport.addVideoProducer(producer);
        } else {
            this.associatedProducerTransport.addAudioProducer(producer);
        }
    }

    addActiveConsumerToTransport(sourceUserName, consumer) {
        if (consumer.kind === 'video') {
            this.associatedConsumerTransport.addVideoConsumer(sourceUserName, consumer);
        } else {
            this.associatedConsumerTransport.addAudioConsumer(sourceUserName, consumer);
        }
    }

    produce(params) {
        return this.associatedProducerTransport.transport.produce(params);
    }

    consume(params) {
        return  this.associatedConsumerTransport.transport.consume(params);
    }

    resume(sourceUserName, kind) {
        if (kind === 'video') {
            this.associatedConsumerTransport.videoConsumers[sourceUserName].resume();
        } else {
            this.associatedConsumerTransport.audioConsumers[sourceUserName].resume();
        }
    }

    removeConsumer(sourceUserName) {
        this.associatedConsumerTransport.removeVideoConsumer(sourceUserName);
        this.associatedConsumerTransport.removeAudioConsumer(sourceUserName);
    }

    closeActiveTransports() {
        // Close producer transport
        this.associatedProducerTransport.transport.close();

        // Close the consumer transport
        this.associatedConsumerTransport.transport.close();
    }
}

module.exports = User;