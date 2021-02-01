const ActiveProducerTransport = require('./transports/ActiveProducerTransport.js');
const ActiveConsumerTransport = require('./transports/ActiveConsumerTransport.js');

class User {
    constructor(userName) {
        // Name of the user in call
        this.userName = userName;
        
        // Will store the producer transport associated with current user name
        this.associatedProducerTransport = null;
        
        // Will store the user names and the associated consumer transports that this current user consumes media from
        this.receivingConsumerTransports = {};
    }

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

    resume(sourceUserName, kind) {
        if (kind === 'video') {
            this.receivingConsumerTransports[sourceUserName].videoConsumer.resume();
        } else {
            this.receivingConsumerTransports[sourceUserName].audioConsumer.resume();
        }
    }

    removeActiveConsumerTransport(sourceUserName) {
        this.receivingConsumerTransports[sourceUserName].transport.close();
        delete this.receivingConsumerTransports[sourceUserName];
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