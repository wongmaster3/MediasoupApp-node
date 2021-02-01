// For debugging purposes
process.env.DEBUG = "mediasoup*"

const mediasoup = require("mediasoup");
const express = require('express');
const app = express();
const server = require('http').createServer(app);
const options = { /* ... */ };
const io = require('socket.io')(server, options);
const config = require('./config.js');

const Room = require('./room.js');


const cors = require('cors')
const corsOptions = {
  origin: 'http://localhost:4200',
  optionsSuccessStatus: 200
}
app.use(cors(corsOptions))

	
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
// app.get('/', function(req, res) {
//   res.sendFile(path.join(__dirname + '/dist/WebRTC/index.html'));
// });

app.get("/createRoom", async (req, res, next) => {
  const mediaCodecs = config.mediasoup.router.mediaCodecs;
  const mediasoupRouter = await worker.createRouter({ mediaCodecs });
  // Might need to put below into database?
  rooms[mediasoupRouter.id] = new Room(mediasoupRouter.id, mediasoupRouter);
  
  res.json({roomId: mediasoupRouter.id});
});

app.get("/validateRoomCredentials", async (req, res, next) => {
  const roomId = req.query.roomId;
  const userName = req.query.userName;

  var roomExists = false;
  var nameExists = true;
  roomExists = roomId in rooms;
  if (roomExists) {
    nameExists = rooms[roomId].hasUser(userName);
  }

  res.json({ roomExists: roomExists, nameExists: nameExists });
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
        rooms[data.roomId].addUser(data.userName);
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
  
      // Done with Changes
      socket.on('createProducerTransport', async (data) => {
        try {
          console.log('Creating Producer Transport...');
          const { transport, params } = await createWebRtcTransport(data.roomId);
          console.log('Created Producer Transport!');
          rooms[data.roomId].getUser(data.userName).addActiveProducerTransport(transport);
          socket.emit('producerTransportParameters', params);
        } catch (err) {
          console.error(err);
          socket.emit('producerTransportParameters', { error: err.message });
        }
      });
  

      // Done
      socket.on('createConsumerTransport', async (data) => {
        try {
          const roomId = data.roomId;
          const sourceUserName = data.sourceUserName;
          const destUserName = data.destUserName;
          console.log('Creating Consumer Transport...');
          const { transport, params } = await createWebRtcTransport(roomId);
          console.log('Created Consumer Transport!');
          rooms[roomId].getUser(destUserName).addActiveConsumerTransport(sourceUserName, transport);

          socket.emit('consumerTransportParameters', params);
        } catch (err) {
          console.error(err);
          socket.emit('consumerTransportParameters', { error: err.message });
        }
      });

      // Done with Changes
      socket.on('createBatchConsumerTransports', async (data) => {
        try {
          let allParams = [];
          const users = rooms[data.roomId].getUsers();
          for (let user of Object.keys(users)) {
            if (data.userName !== user) {
              const { transport, params } = await createWebRtcTransport(data.roomId);
              rooms[data.roomId].getUser(data.userName).addActiveConsumerTransport(user, transport);
              allParams.push({ transportParams: params, sourceUserName: user });
            }
          }
          socket.emit('batchConsumerTransportParameters', allParams);
        } catch (err) {
          console.error(err);
          socket.emit('batchConsumerTransportParameters', { error: err.message });
        }
      });

      // Done with Changes
      socket.on('connectProducerTransport', async (data) => {
        console.log('Connecting Producer Transport...');
        await rooms[data.roomId].getUser(data.userName).producerConnect({ dtlsParameters: data.dtlsParameters });
        console.log('Connected Producer Transport!');
      });
  
      // Done with Changes
      socket.on('connectConsumerTransport', async (data) => {
        console.log('Connecting Consumer Transport...');
        await rooms[data.roomId].getUser(data.destUserName).consumerConnect(data.sourceUserName, { dtlsParameters: data.dtlsParameters });
        console.log('Connected Consumer Transport!');
      });
  
      // Done
      socket.on('produce', async (data) => {
        const {kind, rtpParameters} = data;
        console.log('Creating Produce ' + kind + ' Stream...');
        const producer = await rooms[data.roomId].getUser(data.userName).produce({ kind, rtpParameters });
        rooms[data.roomId].getUser(data.userName).addActiveProducerToTransport(producer);
        console.log('Created Produce ' + kind + ' Stream!');

        socket.to(data.roomId).emit('newProducer', {sourceUserName: data.userName, producer: { id: producer.id, kind: kind }});
        socket.emit('producerId', { id: producer.id, kind: kind });
      });
  
      // Done
      socket.on('consume', async (data) => {
        console.log('Creating Consumer...');
        socket.emit('newConsumer', await createConsumer(data.sourceUserName, data.kind, data.rtpCapabilities, data.destUserName, data.roomId));
        console.log('Created Consumer!');
      });
  
      // Done
      socket.on('resume', async (data) => {
        await rooms[data.roomId].getUser(data.destUserName).resume(data.sourceUserName, data.kind);
      });

      // Done
      socket.on('cleanup', async (data) => {
        console.log("Cleaning up...");
        socket.to(data.roomId).emit('removedProducer', data);

        // Remove user from the room and close the transports
        rooms[data.roomId].removeUser(data.userName);

        // Have the user leave the room
        socket.leave(data.roomId);

        // If there is no more people in room, close it 
        // should be something to do with keys
        if (rooms[data.roomId].numberOfUsers() === 0) {
          rooms[data.roomId].getRouter().close();
          delete rooms[data.roomId];
          console.log("Room " + data.roomId + " has been closed!")
        }
      });

      // Done
      socket.on('removeConsumerTransport', async (data) => {
        // Remove consumer transport of the producer that was just removed
        console.log("Removing consumer transport...");
        rooms[data.roomId].getUser(data.userName).removeActiveConsumerTransport(data.removedUserName);
      });
   });
  
  server.listen(config.listenPort);
}


async function createConsumer(sourceUserName, kind, rtpCapabilities, destUserName, roomId) {
  const producerTransport = rooms[roomId].getUser(sourceUserName).associatedProducerTransport;
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
    consumer = await rooms[roomId].getUser(destUserName).consume(sourceUserName, {
      producerId: producer.id,
      rtpCapabilities,
      paused: producer.kind === 'video',
      // paused: false,
    });
    rooms[roomId].getUser(destUserName).addActiveConsumerToTransport(sourceUserName, consumer);
  } catch (error) {
    console.error('consume failed', error);
    return;
  }

  if (consumer.type === 'simulcast') {
    await consumer.setPreferredLayers({ spatialLayer: 2, temporalLayer: 2 });
  }

  return {
    producerId: producer.id,
    consumerId: consumer.id,
    sourceUserName,
    destUserName,
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

