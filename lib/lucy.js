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
	mongoDB = dbDeferred.promise;

var logger = new winston.Logger({
	transports: [new winston.transports.Console({
		handleExceptions: true,
		json: false,
		level: 'error'
	})]
});

logger.setLevels(winston.config.syslog.levels);
winston.addColors(winston.config.syslog.colors);

//setup Q to use long stack trace support for errors.
Q.longStackSupport = true;

/*
console.log('setup winston logger. level: ' + JSON.stringify(winston.config.syslog.levels));
logger.info('info', 'START OF: testing logging levels!');
for (var level in winston.config.syslog.levels) {
	logger[level]('testing loggin using level: ' + level);
}
logger.info('info', 'END OF: testing logging levels!');
*/

lucy.asPromise = function (obj, fnName) {

	var _original = obj[fnName];

	//validate input
	if (typeof _original !== 'function') {
		throw new Error(fnName + ' is not a valid function.');
	}

	//setup a new function that returns a promise
	obj[fnName] = function () {
		var deferred = Q.defer();

		var callbackFn = function (error, result) {

			if (error) {
				logger.debug('asPromise -> callbackFn -> rejecting promise with error: ' + error);

				deferred.reject(error);
				return;
			}

			logger.debug('asPromise -> callbackFn -> resolving promise with value: ' + result);

			deferred.resolve(result);
		};

		//add the callback to the list of arguments
		var newArgs = Array.prototype.slice.call(arguments, 0);
		newArgs.push(callbackFn);

		//logger.debug('asPromise -> fn: ' + fnName + ' called with arguments: ' + JSON.stringify(newArgs));

		//invoke the original function
		_original.apply(obj, newArgs);

		return deferred.promise;
	};
};

/**
 * Enhances the db object to have 'promise' ready functions.
 */
lucy.enhanceDB = function (db) {

	//collection
	lucy.asPromise(db, 'collection');


};

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
	
		//add a document to a collection
		return mongoDB.then(function (db) {

			return db.collection(collectionName).then(function (collection) {
				return collection.insert(data);
			});
/*
			logger.debug('add() -> getting collection: ', collectionName);

			var collection = null,
				promise = new Q();

			try {
				collection = db.collection(collectionName);
				logger.debug('add() -> collection exists');
			}
			catch (error) {
				logger.debug('add() -> collection: ', collectionName, ' does not exists. creating a new one! - error: ' + error);

				//create the collection and store the promise
				promise = Q.nfcall(db.createCollection, collectionName);
			}
			
			return promise.then(
				function () {
					logger.debug('add() -> trying to insert a doc into collection: ', collectionName);
					//insert the document into the collection
					return Q.nfcall(collection.insert, data).then(function (inserted) {
						logger.debug('add() -> inserted: ', inserted); //+ JSON.stringify(inserted));

						//return the document inserted
						return inserted;
					},
					function (errorInsert) {

						logger.error('Error inserting doc into collection: ', collectionName, ' error: ' + errorInsert);

						return errorInsert;
					});
				},
				function (errorCreateCollection) {
					logger.error('Error creating collection: ', collectionName, ' error: ', errorCreateCollection);
					return errorCreateCollection;
				});*/
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
				logger.info('MongoDB Connected ! -> augmenting the db object with promise ready functions.');

				db = lucy.enhanceDB(db);

				return db;
			}
			else {
				logger.error('MongoDB db is null !');
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