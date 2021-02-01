const ActiveTransport = require('./ActiveTransport.js');

class ActiveConsumerTransport extends ActiveTransport {
    constructor(consumerTransport) {
      super(consumerTransport);

      this.videoConsumer = null;
      this.audioConsumer = null;
    }

    addVideoConsumer(videoConsumer) {
        this.videoConsumer = videoConsumer;
        this.videoConsumer.on("transportclose", () => {
            this.videoConsumer.close();
            console.log("Closing Video Consumer in Consumer Transport " + this.transportId + "!");
        });
        
    }

    addAudioConsumer(audioConsumer) {
        this.audioConsumer = audioConsumer;
        this.audioConsumer.on("transportclose", () => {
            this.audioConsumer.close();
            console.log("Closing Audio Consumer in Consumer Transport " + this.transportId + "!");
        });
    }
}

module.exports = ActiveConsumerTransport;