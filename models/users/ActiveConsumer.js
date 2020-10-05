class ActiveConsumer extends ActiveUser {
    // The associated producer transport Id that this consumer is consuming from
    parentTransportId = null;

    constructor(producerId, kind, parentTransportId) {
        super(producerId, kind);
        this.parentTransportId = parentTransportId;
    }
}

module.exports = ActiveConsumer;