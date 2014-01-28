/*
 * lucy
 * https://github.com/pentateu/lucy
 *
 * Copyright (c) 2014 Rafael Almeida
 * Licensed under the MIT license.
 */

'use strict';

var lucy = {},
	Q = require('Q'),
	MongoClient = require('mongodb').MongoClient,
	winston = require('winston'),
	services = {},
	dbDeferred = Q.defer(),
	mongoDB = dbDeferred.promise,
	logger = new winston.Logger({transports: [new (winston.transports.Console)()]});

logger.setLevels(winston.config.syslog.levels);

//setup Q to use long stack trace support for errors.
Q.longStackSupport = true;

lucy.MongoDBService = function (collectionName) {

	var self = this;
	self.list = [];

	//mongoDB.then(function (db) {
	//	self.collection = db.collection(collectionName);
	//});
	

	collectionName = collectionName;//to avoid warnings 

	// Return all instances from this service
	self.find = function (params, callback) {

		logger.info('add function -> params: ' + JSON.stringify(params));

		callback(null, self.list);
	};

	// Create a new Todo with the given data
	self.add = function (data) {
		
		logger.debug('add() -> data: ', data); //+ JSON.stringify(data));

		return mongoDB.then(function (db) {

			logger.debug('add() -> getting collection: ', collectionName);

			var collection = db.collection(collectionName);

			logger.debug('add() -> collection ok -> ', collectionName);

			return Q.nfcall(collection.insert, data).then(function (inserted) {
				logger.log('debug', 'add() -> inserted : %j', inserted); //+ JSON.stringify(inserted));
				return inserted;
			});
		});

	};
};

/**
 Map a MongoDB collection
 */
lucy.mapCollection = function (name) {
	services[name] = new lucy.MongoDBService(name);
	return lucy;
};

lucy.start = function (io, mongoDbURL) {

	//connect to mongo
	//and resolve the mongoDB promise
	dbDeferred.resolve(Q.nfcall(MongoClient.connect, mongoDbURL).then(
		function (db) {
			if (db) {
				logger.info('MongoDB Connected !');
			}
		},
		function (error) {
			logger.log('error', 'Cound not connect to MongoDB error: ' + error);
		}));

	io.sockets.on('connection', function (socket) {
		//io.sockets.emit('this', { will: 'be received by everyone'});

		console.log('sockets new connection!');

		//add a handler to a service function
		function mapHandler(service, impl, prop) {

			//event name
			var eventName = service + '::' + prop;

			console.log('mapping handler: ' + prop + ' eventName: ' + eventName);

			socket.on(eventName, function (data) {
				console.log('socket event: ' + eventName);

				var re = new RegExp('::', 'g'),
					serviceFn = impl[prop],
					//invoke the service
					result = serviceFn(data);

				Q.when(result).then(
					function (result) {
						var responseSucessEventName = eventName.replace(re, ' ') + ' success';

						console.log('firing success response on event: ' + responseSucessEventName);

						//success response
						socket.emit(responseSucessEventName, {instance: result});
					},
					function (error) {
						var responseErrorEventName = eventName.replace(re, ' ') + ' error';

						logger.error('Error invoking service', service, ' ', prop, ' error: ', error);
						logger.debug('firing error response on event: ', responseErrorEventName, ' error: ', error);

						//success response
						socket.emit(responseErrorEventName, {error: error});
					});
			});
		}

		//setup handlers for all services
		for (var service in services) {

			console.log('mapping service: ' + service);

			var impl = services[service];

			for (var prop in impl) {
				if (typeof impl[prop] === 'function' && impl.hasOwnProperty(prop)) {
					mapHandler(service, impl, prop);
				}
			}
		}

		socket.on('disconnect', function () {
			console.log('socket event: disconnect');
		});
	});

	console.log('lucy started :-)');
};

module.exports = exports = lucy;