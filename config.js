module.exports = {
      listenPort: 3000,
      mediasoup: {
        // Worker settings
        worker: {
          rtcMinPort: 10000,
          rtcMaxPort: 10100,
          logLevel: 'warn',
          logTags: [
            'info',
            'ice',
            'dtls',
            'rtp',
            'srtp',
            'rtcp',
          ],
        },
        // Router settings
        router: {
          mediaCodecs:
            [
              {
                kind: 'audio',
                mimeType: 'audio/opus',
                clockRate: 48000,
                channels: 2
              },
              {
                kind: 'video',
                mimeType: 'video/VP8',
                clockRate: 90000,
              },
            ]
        },
        // WebRtcTransport settings
        webRtcTransport: {
          listenIps: [
            {
              // ip: "0.0.0.0",
              // When the ports go public, we need to fill in the announcedIp with the public server domain
              ip: "192.168.83.129",
              announcedIp: null,
            }
          ],
          maxIncomingBitrate: 1500000,
          initialAvailableOutgoingBitrate: 1000000,
        }
      }
};
