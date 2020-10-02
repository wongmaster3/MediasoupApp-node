class Room {
    constructor(roomId, router) {
      // We use the router id as the room id
      this.roomId = roomId;
      this.routerObj = router;
      this.producerIds = [];
      this.producerTransports = {};
      this.consumerTransports = {};
      this.consumers = {};
    }

    addProducerTransport(producerTransport) {
        this.producerTransports[producerTransport.id] = producerTransport;
    }

    getProducerTransport(producerTransportId) {
        return this.producerTransports[producerTransportId];
    }

    getProducerTransports() {
        return this.producerTransports;
    }

    addConsumerTransport(consumerTransport) {
        this.consumerTransports[consumerTransport.id] = consumerTransport;
    }

    getConsumerTransport(consumerTransportId) {
        return this.consumerTransports[consumerTransportId];
    }

    getConsumerTransports() {
        return this.consumerTransports;
    }

    addConsumer(consumer) {
        this.consumers[consumer.id] = consumer;
    }

    getConsumer(consumerId) {
        return this.consumers[consumerId];
    }

    addParticipant(participant) {
        this.producerIds.push(participant);
    }

    getParticipants() {
        return this.producerIds;
    }

    getRouter() {
        return this.routerObj;
    }
}

module.exports = Room;