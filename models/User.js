const ActiveProducerTransport = require('./transports/ActiveProducerTransport.js');
const ActiveConsumerTransport = require('./transports/ActiveConsumerTransport.js');

class User {
    constructor(userName) {
        this.userName = userName;
        this.associatedProducerTransport = null;
        this.receivingConsumerTransports = {};
    }

    // Handle producer stuff below
    addActiveProducerTransport(producerTransport) {
        this.associatedProducerTransport = new ActiveProducerTransport(producerTransport);
    }

    addActiveConsumerTransport(sourceUserName, consumerTransport) {
        this.receivingConsumerTransports[sourceUserName] = new ActiveConsumerTransport(consumerTransport);
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
            this.receivingConsumerTransports[sourceUserName].addVideoConsumer(consumer);
        } else {
            this.receivingConsumerTransports[sourceUserName].addAudioConsumer(consumer);
        }
    }

    getActiveConsumerTransport(sourceUserName) {
        return this.receivingConsumerTransports[sourceUserName];
    }

    produce(params) {
        return this.associatedProducerTransport.transport.produce(params);
    }

    producerConnect(params) {
        this.associatedProducerTransport.transport.connect(params);
    }

    consume(sourceUserName, params) {
        return this.receivingConsumerTransports[sourceUserName].transport.consume(params);
    }

    consumerConnect(sourceUserName, params) {
        this.receivingConsumerTransports[sourceUserName].transport.connect(params);
    }

    resume(userName, kind) {
        if (kind === 'video') {
            this.receivingConsumerTransports[userName].videoConsumer.resume();
        } else {
            this.receivingConsumerTransports[userName].audioConsumer.resume();
        }
    }

    removeActiveConsumerTransport(userName) {
        this.receivingConsumerTransports[userName].transport.close();
        delete this.receivingConsumerTransports[userName];
    }

    closeActiveTransports() {
        // Close producer transport
        this.associatedProducerTransport.transport.close();

        // Close the consumer transports
        for (let user of Object.keys(this.receivingConsumerTransports)) {
            this.receivingConsumerTransports[user].transport.close();
        }
    }
}

module.exports = User;