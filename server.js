// For debugging purposes
process.env.DEBUG = "mediasoup*"

const mediasoup = require("mediasoup");
const express = require('express');
const app = express();
const fs = require('fs');
const options = {
	// key: fs.readFileSync('key.pem'),
	// cert: fs.readFileSync('cert.pem')
};
const server = require('http').createServer(options, app);
const optionsSocket = { /* ... */ };
const io = require('socket.io')(server, optionsSocket);
const config = require('./config.js');

const Room = require('./room.js');

const path = require('path');
app.use(express.static(__dirname + '/dist/WebRTC'));

const cors = require('cors')
// const corsOptions = {
//   origin: 'https://3.92.208.132:4200',
//   optionsSuccessStatus: 200
// }
app.use(cors())

	
// const path = require('path');
// app.use(express.static(__dirname + '/dist/WebRTC'));


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

// REST api here
app.get('/', function(req, res) {
  res.sendFile(path.join(__dirname + '/dist/WebRTC/index.html'));
});

app.get("/createRoom", async (req, res, next) => {
  const mediaCodecs = config.mediasoup.router.mediaCodecs;
  const mediasoupRouter = await worker.createRouter({ mediaCodecs });
  // Might need to put below into database?
  rooms[mediasoupRouter.id] = new Room(mediasoupRouter.id, mediasoupRouter);
  res.json({roomId: mediasoupRouter.id});
});

app.get("/roomExists", async (req, res, next) => {
  const roomId = req.query.roomId;
  res.json({ exists: roomId in rooms });
});

// Socket IO routes here
async function createIOServer() {
  const roomNamespace = io.of('/rooms');
  roomNamespace.on('connection', socket => { 
      console.log('Example app listening on port ' + config.listenPort + '!');

      socket.on('roomExists', async (data) => {
        socket.emit('validRoom', data in rooms);
      });

      socket.on('joinRoom', (data) => {
        socket.join(data.roomId);
      });

      socket.on('disconnect', (data) => {
        console.log('client disconnected');
      });
  
      socket.on('connect_error', (err) => {
        console.error('client connection error', err);
      });
  
      socket.on('getRouterRtpCapabilities', (roomId) => {
        console.log('Retrieving RtpCapabilities...')
        try {
          socket.emit('rtpCapabilities', rooms[roomId].getRouter().rtpCapabilities);
        } catch (error) {
          console.log("RoomId: " + roomId);
          console.log("RoomIdObj: " + rooms[roomId]);
          console.log("Rooms: " + rooms);
          console.log(error);
        }
      });
  
      socket.on('createProducerTransport', async (roomId) => {
        try {
          console.log('Creating Producer Transport...');
          const { transport, params } = await createWebRtcTransport(roomId);
          console.log('Created Producer Transport!');
          rooms[roomId].addActiveProducerTransport(transport);
          socket.emit('producerTransportParameters', params);
        } catch (err) {
          console.error(err);
          socket.emit('producerTransportParameters', { error: err.message });
        }
      });
  
      socket.on('createConsumerTransport', async (data) => {
        try {
          const roomId = data.roomId;
          const producerTransportId = data.producerTransportId;
          console.log('Creating Consumer Transport...');
          const { transport, params } = await createWebRtcTransport(roomId);
          console.log('Created Consumer Transport!');
          rooms[roomId].addActiveConsumerTransport(transport, producerTransportId, data.parentProducerTransportId);
          console.log('Current consumer Ids: ' + Object.keys(rooms[roomId].consumerTransports));
          console.log('Just Created Id: ' + params.id);
          socket.emit('consumerTransportParameters', params);
        } catch (err) {
          console.error(err);
          socket.emit('consumerTransportParameters', { error: err.message });
        }
      });

      socket.on('createBatchConsumerTransports', async (data) => {
        try {
          let allParams = [];
          const producerTransports = rooms[data.roomId].getActiveProducerTransports();
          for (let producerTransportId of Object.keys(producerTransports)) {
            if (data.originId !== producerTransportId) {
              const { transport, params } = await createWebRtcTransport(data.roomId);
              // consumer transport, current requester transport id, parent of consumer transport
              rooms[data.roomId].addActiveConsumerTransport(transport, data.originId, producerTransportId);
              allParams.push({ transportParams: params, originId: producerTransportId });
            }
          }
          socket.emit('batchConsumerTransportParameters', allParams);
        } catch (err) {
          console.error(err);
          socket.emit('batchConsumerTransportParameters', { error: err.message });
        }
      });

      socket.on('connectProducerTransport', async (data) => {
        console.log('Connecting Producer Transport...');
        await rooms[data.roomId].getActiveProducerTransport(data.transportId).transport.connect({ dtlsParameters: data.dtlsParameters });
        console.log('Connected Producer Transport!');
      });
  
      socket.on('connectConsumerTransport', async (data) => {
        console.log('Connecting Consumer Transport...');
        await rooms[data.roomId].getActiveConsumerTransport(data.transportId).transport.connect({ dtlsParameters: data.dtlsParameters });
        console.log('Connected Consumer Transport!');
      });
  
      socket.on('produce', async (data) => {
        const {kind, rtpParameters} = data;
        console.log('Creating Produce ' + kind + ' Stream...');
        const producer = await rooms[data.roomId].getActiveProducerTransport(data.producerTransportId).transport.produce({ kind, rtpParameters });
        rooms[data.roomId].addActiveProducerToTransport(data.producerTransportId, producer);
        console.log('Created Produce ' + kind + ' Stream!');

        socket.to(data.roomId).emit('newProducer', {originTransportId: data.producerTransportId, producer: { id: producer.id, kind: kind }});
        socket.emit('producerId', { id: producer.id, kind: kind });
      });
  
      socket.on('consume', async (data) => {
        console.log('Creating Consumer...');
        socket.emit('newConsumer', await createConsumer(data.producerTransportId, data.kind, data.rtpCapabilities, data.transportId, data.roomId));
        console.log('Created Consumer!');
      });
  
      socket.on('resume', async (data) => {
        console.log("Resuming Track...");
        await rooms[data.roomId].getActiveConsumer(data.transportId, data.kind).resume();
        console.log("Resumed");
      });

      socket.on('cleanup', async (data) => {
        console.log("Cleaning up...");
        socket.to(data.roomId).emit('removedProducer', data);
        const childPairs = rooms[data.roomId].getActiveProducerTransport(data.producerId).childTransportIds;
        console.log("In cleanup childPairs keys: " + Object.keys(childPairs));
        console.log("In cleanup childPairs values: " + Object.values(childPairs));
        rooms[data.roomId].removeActiveProducerTransport(data.producerId);
        for (let producerTransportId of Object.keys(childPairs)) {
          rooms[data.roomId].removeActiveConsumerTransport(childPairs[producerTransportId]);
        }

        // Have the user leave the room
        socket.leave(data.roomId);

        // If there is no more people in room, close it 
        // should be something to do with keys
        const producerLength = Object.keys(rooms[data.roomId].getActiveProducerTransports());
        const consumerLength = Object.keys(rooms[data.roomId].getActiveConsumerTransports());
        if (producerLength == 0 && consumerLength == 0) {
          rooms[data.roomId].routerObj.close();
          delete rooms[data.roomId];
          console.log("Room " + data.roomId + " has been closed!")
        }
      });

      socket.on('removeConsumerTransport', async (data) => {
        // Remove consumer transport of the producer that was just removed
        console.log("Removing consumer transport...");
        const childPairs = rooms[data.roomId].getActiveProducerTransport(data.producerId).childTransportIds;
        rooms[data.roomId].removeActiveConsumerTransport(childPairs[data.removedProducerId]);
        delete childPairs[data.removedProducerId];
      });
   });
  
  server.listen(config.listenPort);
}


async function createConsumer(producerTransportId, kind, rtpCapabilities, consumerTransportId, roomId) {
  console.log("In createConsumer...");
  console.log(Object.keys(rooms[roomId].getActiveConsumerTransports()));
  console.log(consumerTransportId);
  const producerTransport = rooms[roomId].getActiveProducerTransport(producerTransportId);
  var producer = kind === "video" ? producerTransport.videoProducer : producerTransport.audioProducer;
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
    const consumer = await rooms[roomId].getActiveConsumerTransport(consumerTransportId).transport.consume({
      producerId: producer.id,
      rtpCapabilities,
      paused: producer.kind === 'video',
      // paused: false,
    });
    rooms[roomId].addActiveConsumerToTransport(consumerTransportId, consumer);

    // if (consumer.type === 'simulcast') {
    //   await consumer.setPreferredLayers({ spatialLayer: 2, temporalLayer: 2 });
    // }

    return {
      producerId: producer.id,
      producerTransportId: producerTransportId,
      id: consumer.id,
      consumerTransportId: consumerTransportId,
      kind: consumer.kind,
      rtpParameters: consumer.rtpParameters,
      type: consumer.type,
      producerPaused: consumer.producerPaused
    };
  } catch (error) {
    console.error('consume failed', error);
    return;
  }
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
    preferTcp: true,
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

