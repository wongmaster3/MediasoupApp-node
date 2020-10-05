const ActiveProducerTransport = require('./models/transports/ActiveProducerTransport.js');
const ActiveConsumerTransport = require('./models/transports/ActiveConsumerTransport.js');

class Room {
    constructor(roomId, router) {
      // We use the router id as the room id
      this.roomId = roomId;
      this.routerObj = router;
      this.producerTransports = {};
      this.consumerTransports = {};
      this.consumers = {};
    }

    addActiveProducerTransport(producerTransport) {
        this.producerTransports[producerTransport.id] = new ActiveProducerTransport(producerTransport);
    }

    addActiveProducerToTransport(transportId, producer) {
        if (producer.kind === 'video') {
            this.producerTransports[transportId].addVideoProducer(producer);
        } else {
            this.producerTransports[transportId].addAudioProducer(producer);
        }
    }

    getActiveProducerTransport(producerTransportId) {
        return this.producerTransports[producerTransportId];
    }

    getActiveProducerTransports() {
        return this.producerTransports;
    }



    addActiveConsumerTransport(consumerTransport, parentProducerTransportId) {
        this.consumerTransports[consumerTransport.id] = new ActiveConsumerTransport(consumerTransport, parentProducerTransportId);
    }

    addActiveConsumerToTransport(transportId, consumer) {
        if (consumer.kind === 'video') {
            this.consumerTransports[transportId].addVideoConsumer(consumer);
        } else {
            this.consumerTransports[transportId].addAudioConsumer(consumer);
        }
    }

    getActiveConsumerTransport(consumerTransportId) {
        return this.consumerTransports[consumerTransportId];
    }

    getActiveConsumer(consumerTransportId, kind) {
        if (kind === 'video') {
            return this.consumerTransports[consumerTransportId].videoConsumer;
        } else {
            return this.consumerTransports[consumerTransportId].audioConsumer;
        }
    }

    getActiveConsumerTransports() {
        return this.consumerTransports;
    }

    

    getRouter() {
        return this.routerObj;
    }
}

module.exports = Room;