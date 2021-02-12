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

    // Create socket io server
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
        try {
          console.log('requesting: [getRouterRtpCapabilities]');
          socket.emit('rtpCapabilities', rooms[roomId].getRouter().rtpCapabilities);
          console.log('request succeeded: [getRouterRtpCapabilities]');
        } catch (error) {
          console.log("RoomId: " + roomId);
          console.log("RoomIdObj: " + rooms[roomId]);
          console.log("Rooms: " + rooms);
          console.log(error);
        }
      });
  
      socket.on('createProducerTransport', async (data) => {
        try {
          console.log('requesting: [createProducerTransport]');
          const { transport, params } = await createWebRtcTransport(data.roomId);
          rooms[data.roomId].getUser(data.userName).addActiveProducerTransport(transport);
          socket.emit('producerTransportParameters', params);
          console.log('request succeeded: [createProducerTransport]');
        } catch (err) {
          console.error(err);
          socket.emit('producerTransportParameters', { error: err.message });
        }
      });
  
      socket.on('createConsumerTransport', async (data) => {
        try {
          console.log('requesting: [createConsumerTransport]');
          const { transport, params } = await createWebRtcTransport(data.roomId);
          rooms[data.roomId].getUser(data.userName).addActiveConsumerTransport(transport);
          socket.emit('consumerTransportParameters', params);
          console.log('request succeeded: [createConsumerTransport]');
        } catch (err) {
          console.error(err);
          socket.emit('consumerTransportParameters', { error: err.message });
        }
      });

      socket.on('connectProducerTransport', async (data) => {
        console.log('requesting: [connectProducerTransport]');
        await rooms[data.roomId].getUser(data.userName).producerTransportConnect({ dtlsParameters: data.dtlsParameters });
        console.log('request succeeded: [createProducerTransport]');
      });
  
      socket.on('connectConsumerTransport', async (data) => {
        console.log('requesting: [connectConsumerTransport]');
        await rooms[data.roomId].getUser(data.userName).consumerTransportConnect({ dtlsParameters: data.dtlsParameters });
        console.log('request succeeded: [createConsumerTransport]');
      });

      socket.on('createProducer', async (data) => {
        const {kind, rtpParameters} = data;
        console.log('requesting: [createProducer, kind: ' + kind + ']');
        const producer = await rooms[data.roomId].getUser(data.userName).produce({ kind, rtpParameters });
        rooms[data.roomId].getUser(data.userName).addActiveProducerToTransport(producer);
        console.log('request succeeded: [createProducer, kind: ' + kind + ']');

        socket.emit('producerId', { id: producer.id, kind: kind });
        socket.to(data.roomId).emit('newProducer', {sourceUserName: data.userName, producer: { id: producer.id, kind: kind }});
      });
  
      socket.on('createConsumer', async (data) => {
        console.log('requesting: [createConsumer, kind: ' + data.kind + ']');
        socket.emit('newConsumers', [await createConsumer(data.sourceUserName, data.kind, data.rtpCapabilities, data.destUserName, data.roomId)]);
        console.log('request succeeded: [createConsumer, kind: ' + data.kind + ']');
      });

      socket.on('createBatchConsumers', async (data) => {
        try {
          console.log('requesting: [createBatchConsumers, kind: ' + data.kind + ']');
          let allParams = [];
          const users = rooms[data.roomId].getUsers();
          for (let user of Object.keys(users)) {
            if (data.userName !== user && rooms[data.roomId].getUser(user).associatedProducerTransport != null) {
              if (data.kind === 'video') {
                if (rooms[data.roomId].getUser(user).associatedProducerTransport.videoProducer != null) {
                  const newConsumer = await createConsumer(user, data.kind, data.rtpCapabilities, data.userName, data.roomId)
                  allParams.push(newConsumer);
                }
              } else {
                if (data.kind === 'audio') {
                  if (rooms[data.roomId].getUser(user).associatedProducerTransport.audioProducer != null) {
                    const newConsumer = await createConsumer(user, data.kind, data.rtpCapabilities, data.userName, data.roomId)
                    allParams.push(newConsumer);
                  }
                }
              }
            }
          }
          socket.emit('newConsumers', allParams);
          console.log('request succeeded: [createBatchConsumers, kind: ' + data.kind + ']');
        } catch (err) {
          console.error(err);
          socket.emit('newConsumers', { error: err.message });
        }
      });
  
      socket.on('resumeConsumer', async (data) => {
        console.log('requesting: [resumeConsumer, kind: ' + data.kind + ']');
        await rooms[data.roomId].getUser(data.destUserName).resume(data.sourceUserName, data.kind);
        console.log('request succeeded: [resumeConsumer, kind: ' + data.kind + ']');
      });

      socket.on('cleanup', async (data) => {
        console.log('requesting: [cleanup, user: ' + data.userName + ']');
        socket.to(data.roomId).emit('removedProducer', data);

        // Remove user from the room and close the transports
        rooms[data.roomId].removeUser(data.userName);

        // Have the user leave the room
        socket.leave(data.roomId);

        // If there is no more people in room, close it
        if (rooms[data.roomId].numberOfUsers() === 0) {
          rooms[data.roomId].getRouter().close();
          delete rooms[data.roomId];
          console.log('request succeeded: [roomClosed, room: ' + data.roomId + ']');
        }
        console.log('request succeeded: [cleanup, user: ' + data.userName + ']');
      });

      socket.on('removeConsumer', async (data) => {
        // Remove consumer transport of the producer that was just removed
        console.log('requesting: [removeConsumer, user: ' + data.removedUserName + ']');
        rooms[data.roomId].getUser(data.userName).removeConsumer(data.removedUserName);
        console.log('request succeeded: [removeConsumer, user: ' + data.removedUserName + ']');
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
    consumer = await rooms[roomId].getUser(destUserName).consume({
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

