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
	mongodb = require('mongodb'),
	MongoClient = mongodb.MongoClient,
	winston = require('winston'),
	services = {},
	dbDeferred = Q.defer(),
	mongoDB = dbDeferred.promise;

require('./winstonFix').fix();

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

//internal lucy utilities
lucy.util = {};

lucy.util.asPromise = function (obj, fnName) {
	var _original = obj[fnName];
	//validate input
	//if (typeof _original !== 'function') {
	//	throw new Error(fnName + ' is not a valid function : typeof is: ' + (typeof _original));
	//}
	obj[fnName] = Q.nbind(_original, obj);//Q.denodeify(_original);
};

/**
 * Enhances the db object to have 'promise' ready functions.
 */
lucy.util.enhanceDB = function (db) {
	
	//collection
	//lucy.asPromise(db, 'collection');

	return db;
};

/**
 * Enhances the collection object to have 'promise' ready functions.
 */
lucy.util.enhanceCollection = function (collection) {

	//insert
	lucy.util.asPromise(collection, 'insert');

	lucy.util.asPromise(collection, 'remove');

	lucy.util.asPromise(collection, 'findAndRemove');

	//return the enhanced collection
	return collection;
};



lucy.MongoDBService = function (dbPromise, collectionName) {

	var self = this,
		collection;

	//return the collection object for this service instance
	function getCollection() {
		if (collection) {
			return Q(collection);
		}
		//collection is not enhanced yet
		return dbPromise.then(function (db) {
			//logger.debug('MongoDBService -> getCollection() -> db ready. enhanceCollection: ', collectionName);
			try {
				//enhande the collection object
				return lucy.util.enhanceCollection(db.collection(collectionName));
			}
			catch (error) {
				logger.error('MongoDBService -> getCollection() -> error enhancing collection: ', collectionName, ' error: ', error);
				return Q.reject(error);
			}
		});
	}

	// Return all instances from this service
	self.find = function (args, resultFn) {

		logger.debug('find() function -> args: ', args);

		return getCollection().then(function (collection) {

			//logger.debug('self.add() -> will call -> collection.insert(data.doc) -> data.doc: ', data.doc);
			
			logger.debug('find() -> query: ', args.query, 'fields', args.fields, 'options', args.options, 'sort:', args.sort);

			var cursor = collection.find(args.query, args.fields, args.options);

			//sorting
			if (args.sort) {
				logger.debug('find() -> sorting: ', args.sort);

				cursor.sort(args.sort);
			}

			lucy.util.asPromise(cursor, 'toArray');

			return cursor.toArray().then(function (list) {
				resultFn(list);
				return list.length;//return the size of the list
			});
		});
	};

	//delete a document by the id
	self.delete = function (_id) {
		logger.debug('delete() -> _id: ', _id);
		//add a document to a collection
		return getCollection().then(function (collection) {
			return collection.remove({_id: new mongodb.ObjectID(_id)}).then(function (numberOfRemoved) {
				logger.debug('delete() -> number Of Removed docs: ', numberOfRemoved);
				return _id;
			});
		});
	};

	// create a new record
	self.add = function (data) {
		//add a document to a collection
		return getCollection().then(function (collection) {

			logger.debug('self.add() -> will call -> collection.insert(data.doc) -> data.doc: ', data.doc);
			
			return collection.insert(data.doc);
		});
	};
};

/**
 Map a MongoDB collection
 */
lucy.mapCollection = function (name) {
	services[name] = new lucy.MongoDBService(mongoDB, name);
	return lucy;
};

lucy.start = function (io, mongoDbURL) {

	//enhance the MongoClient.connect function
	lucy.util.asPromise(MongoClient, 'connect');

	//connect to mongo
	//and resolve the mongoDB promise
	dbDeferred.resolve(MongoClient.connect(mongoDbURL).then(
		function (db) {
			logger.info('lucy.start() -> MongoClient.connect()');

			if (db) {
								
				db = lucy.util.enhanceDB(db);

				logger.info('MongoDB Connected ! -> augmenting the db object with promise ready functions.');

				return db;
			}
			else {
				logger.error('MongoDB db is null !');
			}
		},
		function (error) {
			logger.log('error', 'Cound not connect to MongoDB error: ', error);
		}));

	io.sockets.on('connection', function (socket) {
		//io.sockets.emit('this', { will: 'be received by everyone'});

		console.log('sockets new connection!');

		//add a handler to a service function
		function mapHandler(service, impl, prop) {

			//event name
			var eventName = service + '::' + prop;

			logger.debug('mapping handler:', prop, ' eventName: ', eventName);

			socket.on(eventName, function (data, resultFn) {
				//logger.debug('socket event: ', eventName, 'data: ' + JSON.stringify(data));

				//regular expression used to replace :: with space in the name of
				//the events sent to the clients
				var re = new RegExp('::', 'g'),

					//service function
					serviceFn = impl[prop],

					//invoke the service
					result = serviceFn(data, resultFn);

				Q.when(result).then(
					function (result) {
						var responseSucessEventName = eventName.replace(re, ' ') + ' success';

						logger.debug('firing success response on event: %j', responseSucessEventName, 'result: ', result);

						//success response
						socket.emit(responseSucessEventName, result);
					},
					function (error) {
						var responseErrorEventName = eventName.replace(re, ' ') + ' error';

						logger.error('Error invoking service', service, prop, ' -> Error: ', error);

						//success response
						socket.emit(responseErrorEventName, {error: error});
					});
			});
		}

		//optmize this and use prototype, so no need to do it every time
		// a new client connects.

		//setup handlers for all services
		for (var service in services) {

			logger.debug('mapping service: ', service);

			var impl = services[service];

			for (var prop in impl) {
				if (typeof impl[prop] === 'function' && impl.hasOwnProperty(prop)) {
					mapHandler(service, impl, prop);
				}
			}
		}

		socket.on('disconnect', function () {
			logger.info('socket event: disconnect');
		});
	});

	logger.info('lucy started :-)');
};

module.exports = exports = lucy;