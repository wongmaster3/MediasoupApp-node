const ActiveTransport = require('./ActiveTransport.js');

class ActiveConsumerTransport extends ActiveTransport {
    constructor(consumerTransport) {
      super(consumerTransport);

      this.videoConsumers = {};
      this.audioConsumers = {};
    }

    addVideoConsumer(userName, videoConsumer) {
        this.videoConsumers[userName] = videoConsumer;
        this.videoConsumers[userName].on("transportclose", () => {
            this.videoConsumers[userName].close();
            console.log("Closing Video Consumer in Consumer Transport " + this.transportId + "!");
        });
        
    }

    addAudioConsumer(userName, audioConsumer) {
        this.audioConsumers[userName] = audioConsumer;
        this.audioConsumers[userName].on("transportclose", () => {
            this.audioConsumers[userName].close();
            console.log("Closing Audio Consumer in Consumer Transport " + this.transportId + "!");
        });
    }

    removeVideoConsumer(userName) {
        this.videoConsumers[userName].close();
        delete this.videoConsumers[userName];
    }

    removeAudioConsumer(userName) {
        this.audioConsumers[userName].close();
        delete this.audioConsumers[userName];
    }
}

module.exports = ActiveConsumerTransport;