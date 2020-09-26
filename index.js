const mediasoup = require("mediasoup");
const app = require('express')();
const server = require('http').createServer(app);
const options = { /* ... */ };
const io = require('socket.io')(server, options);
const config = require('./config.js');

let worker;
let webServer;
let socketServer;
let producer;
let consumer;
let producerTransport;
let consumerTransport;
let mediasoupRouter;


(async () => {
  try {
    // Start a mediasoup worker
    runMediasoupWorker();
    createIOServer();
  } catch (err) {
    console.error(err);
  }
})();

async function createIOServer() {
  io.on('connection', socket => { 
    console.log('Example app listening on port 3000!');
    
      // inform the client about existence of producer
      if (producer) {
        socket.emit('newProducer');
      }
  
      socket.on('disconnect', () => {
        console.log('client disconnected');
      });
  
      socket.on('connect_error', (err) => {
        console.error('client connection error', err);
      });
  
      socket.on('getRouterRtpCapabilities', () => {
        console.log('Retrieving RtpCapabilities...')
        socket.emit('rtpCapabilities', mediasoupRouter.rtpCapabilities);
      });
  
      socket.on('createProducerTransport', async () => {
        try {
          console.log('Creating Producer Transport...')
          const { transport, params } = await createWebRtcTransport();
          producerTransport = transport;
          socket.emit('producerTransportParameters', params);
        } catch (err) {
          console.error(err);
          socket.emit('producerTransportParameters', { error: err.message });
        }
      });
  
      socket.on('createConsumerTransport', async () => {
        try {
          const { transport, params } = await createWebRtcTransport();
          consumerTransport = transport;
          socket.emit('consumerTransportParameters', params);
        } catch (err) {
          console.error(err);
          socket.emit('consumerTransportParameters', { error: err.message });
        }
      });
  
      socket.on('connectProducerTransport', async (data) => {
        await producerTransport.connect({ dtlsParameters: data.dtlsParameters });
      });
  
      socket.on('connectConsumerTransport', async (data) => {
        await consumerTransport.connect({ dtlsParameters: data.dtlsParameters });
      });
  
      socket.on('produce', async (data) => {
        const {kind, rtpParameters} = data;
        producer = await producerTransport.produce({ kind, rtpParameters });
        socket.emit('producerId', { id: producer.id });
  
        // inform clients about new producer
        socket.broadcast.emit('newProducer');
      });
  
      socket.on('consume', async (data) => {
        socket.emit('newConsumer', await createConsumer(producer, data.rtpCapabilities));
      });
  
      socket.on('resume', async (data, callback) => {
        await consumer.resume();
        callback();
      });
   });
  
  server.listen(3000);
}


async function createConsumer(producer, rtpCapabilities) {
  if (!mediasoupRouter.canConsume(
    {
      producerId: producer.id,
      rtpCapabilities,
    })
  ) {
    console.error('can not consume');
    return;
  }
  try {
    consumer = await consumerTransport.consume({
      producerId: producer.id,
      rtpCapabilities,
      // paused: producer.kind === 'video',
      paused: false,
    });
  } catch (error) {
    console.error('consume failed', error);
    return;
  }

  if (consumer.type === 'simulcast') {
    await consumer.setPreferredLayers({ spatialLayer: 2, temporalLayer: 2 });
  }

  return {
    producerId: producer.id,
    id: consumer.id,
    kind: consumer.kind,
    rtpParameters: consumer.rtpParameters,
    type: consumer.type,
    producerPaused: consumer.producerPaused
  };
}

async function createWebRtcTransport() {
  const {
    maxIncomingBitrate,
    initialAvailableOutgoingBitrate
  } = config.mediasoup.webRtcTransport;

  const transport = await mediasoupRouter.createWebRtcTransport({
    listenIps: config.mediasoup.webRtcTransport.listenIps,
    enableUdp: true,
    enableTcp: true,
    preferUdp: true,
    initialAvailableOutgoingBitrate,
  });
  if (maxIncomingBitrate) {
    try {
      await transport.setMaxIncomingBitrate(maxIncomingBitrate);
    } catch (error) {
    }
  }
  return {
    transport,
    params: {
      id: transport.id,
      iceParameters: transport.iceParameters,
      iceCandidates: transport.iceCandidates,
      dtlsParameters: transport.dtlsParameters
    },
  };
}

async function runMediasoupWorker() {
  worker = await mediasoup.createWorker({
    logLevel: config.mediasoup.worker.logLevel,
    logTags: config.mediasoup.worker.logTags,
    rtcMinPort: config.mediasoup.worker.rtcMinPort,
    rtcMaxPort: config.mediasoup.worker.rtcMaxPort,
  });

  worker.on('died', () => {
    console.error('mediasoup worker died, exiting in 2 seconds... [pid:%d]', worker.pid);
    setTimeout(() => process.exit(1), 2000);
  });

  const mediaCodecs = config.mediasoup.router.mediaCodecs;
  mediasoupRouter = await worker.createRouter({ mediaCodecs });
}

