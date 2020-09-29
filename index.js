// For debugging purposes
process.env.DEBUG = "mediasoup*"

const mediasoup = require("mediasoup");
const app = require('express')();
const server = require('http').createServer(app);
const options = { /* ... */ };
const io = require('socket.io')(server, options);
const config = require('./config.js');

const Room = require('./room.js');

let worker;
let webServer;
let socketServer;
// Will store the room id and a room object where the room id is the router id
let rooms = {};

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
  
      socket.on('disconnect', () => {
        console.log('client disconnected');
      });
  
      socket.on('connect_error', (err) => {
        console.error('client connection error', err);
      });
  
      socket.on('getRouterRtpCapabilities', (roomId) => {
        console.log('Retrieving RtpCapabilities...')
        socket.emit('rtpCapabilities', rooms[roomId].getRouter().rtpCapabilities);
      });
  
      socket.on('createProducerTransport', async (roomId) => {
        try {
          console.log('Creating Producer Transport...');
          const { transport, params } = await createWebRtcTransport(roomId);
          console.log('Created Producer Transport...');
          rooms[roomId].addProducerTransport(transport);
          socket.emit('producerTransportParameters', params);
        } catch (err) {
          console.error(err);
          socket.emit('producerTransportParameters', { error: err.message });
        }
      });
  
      socket.on('createConsumerTransport', async (roomId) => {
        try {
          console.log('Creating Consumer Transport...');
          const { transport, params } = await createWebRtcTransport(roomId);
          console.log('Created Consumer Transport...');
          rooms[roomId].addConsumerTransport(transport);
          socket.emit('consumerTransportParameters', params);
        } catch (err) {
          console.error(err);
          socket.emit('consumerTransportParameters', { error: err.message });
        }
      });
  
      socket.on('connectProducerTransport', async (data) => {
        console.log('Connecting Producer Transport');
        await rooms[data.roomId].getProducerTransport(data.transportId).connect({ dtlsParameters: data.dtlsParameters });
        console.log('Connecting Producer Transport');
      });
  
      socket.on('connectConsumerTransport', async (data) => {
        console.log('Connecting Consumer Transport');
        await rooms[data.roomId].getConsumerTransport(data.transportId).connect({ dtlsParameters: data.dtlsParameters });
        console.log('Connected Consumer Transport');
      });
  
      socket.on('produce', async (data) => {
        const {kind, rtpParameters} = data;
        const producer = await rooms[data.roomId].getProducerTransport(data.transportId).produce({ kind, rtpParameters });
        rooms[data.roomId].addParticipant({ id: producer.id });
        socket.emit('producerId', { id: producer.id });
  
        // inform clients about new producer
        socket.broadcast.emit('newProducer', { id: producer.id });
      });
  
      socket.on('consume', async (data) => {
        socket.emit('newConsumer', await createConsumer(data.producer, data.rtpCapabilities, data.transportId, data.roomId));
      });
  
      // socket.on('resume', async (data, callback) => {
      //   await consumer.resume();
      //   callback();
      // });

      socket.on('createRoom', async(data) => {
        const mediaCodecs = config.mediasoup.router.mediaCodecs;
        mediasoupRouter = await worker.createRouter({ mediaCodecs });
        // Might need to put below into database?
        rooms[mediasoupRouter.id] = new Room(mediasoupRouter.id, mediasoupRouter);
        socket.emit('roomId', mediasoupRouter.id);
      });

      socket.on('getParticipants', (roomId) => {
        socket.emit('currentParticipants', rooms[roomId].getParticipants());
      });
   });
  
  server.listen(3000);
}


async function createConsumer(producer, rtpCapabilities, consumerTransportId, roomId) {
  if (!rooms[roomId].getRouter().canConsume(
    {
      producerId: producer.id,
      rtpCapabilities,
    })
  ) {
    console.error('cannot consume');
    return;
  }
  try {
    consumer = await rooms[roomId].getConsumerTransport(consumerTransportId).consume({
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
    transportId: consumerTransportId,
    producerId: producer.id,
    id: consumer.id,
    kind: consumer.kind,
    rtpParameters: consumer.rtpParameters,
    type: consumer.type,
    producerPaused: consumer.producerPaused
  };
}

async function createWebRtcTransport(roomId) {
  const {
    maxIncomingBitrate,
    initialAvailableOutgoingBitrate
  } = config.mediasoup.webRtcTransport;

  const transport = await rooms[roomId].getRouter().createWebRtcTransport({
    listenIps: config.mediasoup.webRtcTransport.listenIps,
    enableUdp: true,
    enableTcp: true,
    preferUdp: true,
    initialAvailableOutgoingBitrate,
  });
  console.log('Created WebRtcTransport...')
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
}

