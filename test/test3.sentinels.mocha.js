/**
 * This file runs the tests for a sentinels layout
 * using the ioredis driver
 */

var http = require('http');
var crypto = require('crypto');
var _url = require('url');
var Bus = require('../lib/bus');
var tf = require('./test.functions');
var RedisSentinels = require('./helpers/redis-sentinels');


var redisUrls = ['redis://127.0.0.1:26279'];
var redisUrls2 = ['redis://127.0.0.1:26179'];

describe('BusMQ sentinels', function() {

  var redisSentinels = new RedisSentinels(6279);
  var redisSentinels2 = new RedisSentinels(6179);

  this.timeout(0);
  if (this.timeout() === 0) {
    this.enableTimeouts(false);
  }

  // start the redis servers
  before(function(done) {
    redisSentinels.start(function(err) {
      if (err) {
        return done(err);
      }
      redisSentinels2.start(done);
    });
  });

  // stop all redis servers
  after(function(done) {
    redisSentinels2.stop(function() {
      redisSentinels.stop(done);
    });
  });

  describe('bus connection', function() {

    it('should emit online event when connected and offline event after disconnecting', function(done) {
      var bus = Bus.create({driver: 'ioredis', layout: 'sentinels', redis: redisUrls, logger: console, logLevel: 'debug'});
      tf.onlineOffline(bus,done);
    });

    it('should emit error if calling connect twice', function(done) {
      var bus = Bus.create({driver: 'ioredis', layout: 'sentinels', redis: redisUrls, logger: console});
      tf.connectTwice(bus,done,26379);
    });

    it('should emit offline when the redises go down, and online when they are back again', function(done) {
      var bus = Bus.create({driver: 'ioredis', layout: 'sentinels', redis: redisUrls, logger: console});
      tf.downAndBack(bus, redisSentinels, done);
    });

    // it('should resume silently when redis turns into slave and turns back to master', function(done) {
    //   var bus = Bus.create({driver: 'ioredis', layout: 'sentinels', redis: redisUrls, logger: console});
    //   tf.resumeSilently(bus,redisSentinels, redisPorts[0], redisPorts[2], done);
    // });
  });

  describe('queues', function() {

    it('should receive attach/detach events', function(done) {
      var bus = Bus.create({driver: 'ioredis', layout: 'sentinels', redis: redisUrls, logger: console});
      tf.attachDetachEvents(bus,done);
    });

    it('queue should be found locally and not found after it expires', function(done) {
      var bus = Bus.create({driver: 'ioredis', layout: 'sentinels', redis: redisUrls, logger: console});
      tf.queueShouldBeFoundLocally(bus,done);
    });

    describe('pushing and consuming messages', function() {

      it('producer attach -> producer push -> consumer attach -> consumer receive', function(done) {
        var bus = Bus.create({driver: 'ioredis', layout: 'sentinels', redis: redisUrls, logger: console});
        tf.pAttachPPushCAttachCReceive(bus,done);
      });

      it('producer attach -> consumer attach -> producer push -> consumer receive', function(done) {
        var bus = Bus.create({driver: 'ioredis', layout: 'sentinels', redis: redisUrls, logger: console});
        tf.pAttachCAttachPPushCReceive(bus,done);
      });

      it('consumer attach -> producer attach -> producer push -> consumer receive', function(done) {
        var bus = Bus.create({driver: 'ioredis', layout: 'sentinels', redis: redisUrls, logger: console});
        tf.cAttachPAttachPPUshCReceive(bus,done);
      });

      it('producer attach -> producer push(5) -> consumer attach -> consumer receive(5)', function(done) {
        var bus = Bus.create({driver: 'ioredis', layout: 'sentinels', redis: redisUrls, logger: console});
        tf.pAttachPPush5CAttachCReceive5(bus,done);
      });

      it('producer push(5) -> producer attach -> consumer attach -> consumer receive(5)', function(done) {
        var bus = Bus.create({driver: 'ioredis', layout: 'sentinels', redis: redisUrls, logger: console});
        tf.pPUsh5PAttachCAttachCReceive5(bus,done);
      });

      it('queue should not expire if detaching and re-attaching before queue ttl passes', function(done) {
        var bus = Bus.create({driver: 'ioredis', layout: 'sentinels', redis: redisUrls, logger: console});
        tf.doNotExpireBeforeTTL(bus,done);
      });

      it('queue should expire: producer attach -> consumer attach -> producer push -> detach all', function(done) {
        var bus = Bus.create({driver: 'ioredis', layout: 'sentinels', redis: redisUrls, logger: console});
        tf.queueShouldExpire(bus,done);
      });

      it('produces and consumes 10 messages in 10 queues', function(done) {
        var bus = Bus.create({driver: 'ioredis', layout: 'sentinels', redis: redisUrls, logger: console});
        tf.testManyMessages(bus, 10, 10, done);
      });

      it('produces and consumes 100 messages in 10 queues', function(done) {
        var bus = Bus.create({driver: 'ioredis', layout: 'sentinels', redis: redisUrls, logger: console});
        tf.testManyMessages(bus, 100, 10, done);
      });

      it('produces and consumes 100 messages in 100 queues', function(done) {
        var bus = Bus.create({driver: 'ioredis', layout: 'sentinels', redis: redisUrls, logger: console});
        tf.testManyMessages(bus, 100, 100, done);
      });

    });

    it('consume max', function(done) {
      var bus = Bus.create({driver: 'ioredis', layout: 'sentinels', redis: redisUrls, logger: console});
      tf.queueConsumesMax(bus,done);
    });

    it('consume without removing', function(done) {
      var bus = Bus.create({driver: 'ioredis', layout: 'sentinels', redis: redisUrls, logger: console});
      tf.queueConsumeWithoutRemoving(bus,done);
    });

    it('count and flush messages', function(done) {
      var bus = Bus.create({driver: 'ioredis', layout: 'sentinels', redis: redisUrls, logger: console});
      tf.queueCountAndFlush(bus,done);
    });

    it('should not receive additional messages if stop was called', function(done) {
      var bus = Bus.create({driver: 'ioredis', layout: 'sentinels', redis: redisUrls, logger: console});
      tf.queueNotReceiveWhenStopped(bus,done);
    });

    it('consume reliable', function(done) {
      var bus = Bus.create({driver: 'ioredis', layout: 'sentinels', redis: redisUrls, logger: console});
      tf.queueConsumeReliable(bus,done);
    });

    it('should set and get arbitrary metadata', function(done) {
      var bus = Bus.create({driver: 'ioredis', layout: 'sentinels', redis: redisUrls, logger: console});
      tf.queueGetSetMatadata(bus,done);
    });

  });

  describe('channels', function() {

    it('server listens -> client connects', function(done) {
      var bus = Bus.create({driver: 'ioredis', layout: 'sentinels', redis: redisUrls, logger: console});
      tf.channelServerListensClientConnects(bus,done);
    });

    it('client connects -> server listens', function(done) {
      var bus = Bus.create({driver: 'ioredis', layout: 'sentinels', redis: redisUrls, logger: console});
      tf.channelClientConnectsServerListens(bus,done);
    });

    it('reliable channel', function(done) {
      var bus = Bus.create({driver: 'ioredis', layout: 'sentinels', redis: redisUrls, logger: console});
      tf.reliableChannel(bus,done);
    });
  });

  describe('persistency', function() {

    it('saves and loads an object', function(done) {
      var bus = Bus.create({driver: 'ioredis', layout: 'sentinels', redis: redisUrls, logger: console});
      tf.persistencySavesAndLoads(bus,done);
    });

    it('persists 10 objects', function(done) {
      var bus = Bus.create({driver: 'ioredis', layout: 'sentinels', redis: redisUrls, logger: console});
      tf.testManySavesAndLoades(bus, 10, done);
    });

    it('persists 100 objects', function(done) {
      var bus = Bus.create({driver: 'ioredis', layout: 'sentinels', redis: redisUrls, logger: console});
      tf.testManySavesAndLoades(bus, 100, done);
    });

    it('persists 1000 objects', function(done) {
      var bus = Bus.create({driver: 'ioredis', layout: 'sentinels', redis: redisUrls, logger: console});
      tf.testManySavesAndLoades(bus, 1000, done);
    });
  });

  describe('pubsub', function() {

    it('should receive subscribe/unsubscribe and message events', function(done) {
      var bus = Bus.create({driver: 'ioredis', layout: 'sentinels', redis: redisUrls, logger: console});
      tf.pubSubSubscribeUnsubscribe(bus,done);
    });

    it('subscriber should receive message events after going offline and online again', function(done) {
      var bus = Bus.create({driver: 'ioredis', layout: 'sentinels', redis: redisUrls, logger: console});
      tf.pubSubSubscriberGetsMessagesAfterOfflineOnline(bus, redisSentinels, done);
    });
  });

  describe('service', function() {
    
    it('should receive a request and return a reply', function(done) {
      var bus = Bus.create({driver: 'ioredis', layout: 'sentinels', redis: redisUrls, logger: console});
      tf.serviceServesRequesterPushes(bus,done);
    });

    it('should receive a request and return multiple replies', function(done) {
      var bus = Bus.create({driver: 'ioredis', layout: 'sentinels', redis: redisUrls, logger: console});
      tf.serviceServesRequesterPushesIntermediateReply(bus,done);
    });

    it('should handle a request without returning a reply', function(done) {
      var bus = Bus.create({driver: 'ioredis', layout: 'sentinels', redis: redisUrls, logger: console});
      tf.serviceServesRequesterPushesNoReply(bus,done);
    });

    it.only('should return timeout error on request timeout', function(done) {
      var bus = Bus.create({driver: 'ioredis', layout: 'sentinels', redis: redisUrls, logger: console});
      tf.serviceRequestTimeout(bus,done);
    });

    it('should serve only 1 request', function(done) {
      var bus = Bus.create({driver: 'ioredis', layout: 'sentinels', redis: redisUrls, logger: console});
      tf.serviceRequestConsumeMax(bus,done);
    });

    it('should garcefully shutdown', function(done) {
      var bus = Bus.create({driver: 'ioredis', layout: 'sentinels', redis: redisUrls, logger: console});
      tf.serviceGracefulShutdown(bus,done);
    });

  });


  describe('federation', function() {

    var fedserver;

    beforeEach(function(done) {
      fedserver = http.createServer();
      fedserver.listen(9777, function() {
        done();
      });
    });

    afterEach(function(done) {
      fedserver.on('error', function() {}); // ignore socket errors at this point
      setTimeout(function() {
        fedserver && fedserver.close();
        done();
      }, 100);
    });

    function fedBusCreator(federate, redis) {
      var options = {
        redis: redis || redisUrls,
        driver: 'ioredis',
        logger: console,
        layout: 'sentinels',
        federate: federate
      };
      return Bus.create(options);
    }

    it('federates queue events', function(done) {
      var bus = Bus.create({driver: 'ioredis', layout: 'sentinels', redis: redisUrls, federate: {server: fedserver, path: '/federate'}, logger: console});
      tf.fedFederateQueueEvents(bus, done, fedBusCreator);
    });

    it('federates channel events', function(done) {
      var bus = Bus.create({driver: 'ioredis', layout: 'sentinels', redis: redisUrls, federate: {server: fedserver}, logger: console});
      tf.fedFederateChannelEvents(bus, done, fedBusCreator);
    });

    it('federates persisted objects', function(done) {
      var bus = Bus.create({driver: 'ioredis', layout: 'sentinels', redis: redisUrls, federate: {server: fedserver}, logger: console});
      tf.fedFederatePersistedObjects(bus, done, fedBusCreator);
    });

    it('federate pubsub events', function(done) {
      var bus = Bus.create({driver: 'ioredis', layout: 'sentinels', redis: redisUrls, federate: {server: fedserver}, logger: console});
      tf.fedPubSubEvents(bus, done, fedBusCreator);
    });

    it('federation websocket of queue closes and reopens', function(done) {
      var fedserver = http.createServer();
      fedserver.listen(9758, function() {
        var bus = Bus.create({driver: 'ioredis', layout: 'sentinels', redis: redisUrls, federate: {server: fedserver, path: '/federate'}, logger: console});
        tf.fedWebsocketQueueClosesReopens(bus, fedBusCreator, fedserver, 9758, function(err, fedserver) {
          fedserver.close();
          setTimeout(function() {
            done(err);
          }, 100);
        });
      });
    });

    it('federation websocket of channel closes and reopens', function(done) {
      var fedserver = http.createServer();
      fedserver.listen(9759, function() {
        var bus = Bus.create({driver: 'ioredis', layout: 'sentinels', redis: redisUrls, federate: {server: fedserver, path: '/federate'}, logger: console});
        tf.fedWebsocketChannelClosesReopens(bus, fedBusCreator, fedserver, 9759, function(err, fedserver) {
          fedserver.close();
          setTimeout(function() {
            done(err);
          }, 100);
        });
      });
    });

    it('does not allow federation with wrong secret', function(done) {
      var bus = Bus.create({driver: 'ioredis', layout: 'sentinels', redis: redisUrls, federate: {server: fedserver, secret: 'thisisit'}, logger: console});
      tf.fedNotWithWrongSecret(bus, done, fedBusCreator);
    });

    it('allows federation with custom secret function', function(done) {
      var custom = {};
      var bus = Bus.create({driver: 'ioredis', layout: 'sentinels', redis: redisUrls, federate: {server: fedserver, secret: function(info) {
        custom.called = true;
        var parsed = _url.parse(info.req.url, true);
        return parsed.query && (parsed.query.secret === 'mycustomsecretfunction');
      }}, logger: console});
      tf.fedWithCustomSecretFunction(bus, done, fedBusCreator, custom);
    });

    it('does not allow federation with custom secret function', function(done) {
      var custom = {};
      var bus = Bus.create({driver: 'ioredis', layout: 'sentinels', redis: redisUrls, federate: {server: fedserver, secret: function(info) {
        custom.called = true;
        var parsed = _url.parse(info.req.url, true);
        return parsed.query && (parsed.query.secret === 'mycustomsecretfunction');
      }}, logger: console});
      tf.fedNotWithCustomSecretFunction(bus, done, fedBusCreator, custom);
    });

    it('produces and consumes 10 messages in 10 queues over federation', function(done) {
      var bus = Bus.create({driver: 'ioredis', layout: 'sentinels', redis: redisUrls, federate: {server: fedserver, path: '/federate'}, logger: console});
      tf.testManyMessagesOverFederation(bus, 10, 10, done, fedBusCreator);
    });

    it('produces and consumes 100 messages in 10 queues over federation', function(done) {
      var bus = Bus.create({driver: 'ioredis', layout: 'sentinels', redis: redisUrls, federate: {server: fedserver, path: '/federate'}, logger: console});
      tf.testManyMessagesOverFederation(bus, 100, 10, done, fedBusCreator);
    });

    it('produces and consumes 100 messages in 100 queues over federation', function(done) {
      var bus = Bus.create({driver: 'ioredis', layout: 'sentinels', redis: redisUrls, federate: {server: fedserver, path: '/federate'}, logger: console});
      tf.testManyMessagesOverFederation(bus, 100, 100, done, fedBusCreator);
    });

    it('persists 10 objects over federation', function(done) {
      var bus = Bus.create({driver: 'ioredis', layout: 'sentinels', redis: redisUrls, federate: {server: fedserver, path: '/federate'}, logger: console});
      tf.testManySavesAndLoadesOverFederation(bus, 10, done, fedBusCreator);
    });

    it('persists 100 objects over federation', function(done) {
      var bus = Bus.create({driver: 'ioredis', layout: 'sentinels', redis: redisUrls, federate: {server: fedserver, path: '/federate'}, logger: console});
      tf.testManySavesAndLoadesOverFederation(bus, 100, done, fedBusCreator);
    });

    it('persists 500 objects over federation', function(done) {
      var bus = Bus.create({driver: 'ioredis', layout: 'sentinels', redis: redisUrls, federate: {server: fedserver, path: '/federate'}, logger: console});
      tf.testManySavesAndLoadesOverFederation(bus, 500, done, fedBusCreator);
    });

    it('finds a discoverable queue', function(done) {
      var bus = Bus.create({driver: 'ioredis', layout: 'sentinels', redis: redisUrls, federate: {server: fedserver, path: '/federate'}, logger: console});
      tf.fedFindsDiscoverableQueue(bus, done, function(federate) {
        return fedBusCreator(federate, redisUrls2)
      });
    });
  });
});


