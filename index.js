'use strict';

var socketio = require('socket.io'),
	bunyan = require('bunyan'),
	urlLib = require('url'),
	_ = require('lodash'),
	config = require('config'),
	request = require('request'),
	dispatcher = require('skelenode-dispatcher'),
	log = bunyan.createLogger({name: '[SOCKET]'}),
	serverIP = null,
	restifyApp = null;

/**
 * when the socket connects we will listen to different
 * events
 *
 * @author Tim Golen 2014-12-25
 *
 * @param  {Object} socket
 *
 * @return {void}
 */
function connection(socket) {
	// We'll track our subscriptions in here so we can later unsubscribe them.
	var callbacks = {};
	socket.on('subscribe', subscribe);
	socket.on('unsubscribe', unsubscribe);
	socket.on('disconnect', disconnect);
	socket.on('api', api);

	/**
	 * Subscribes to a particular event.
	 * @param args A dictionary requiring two properties: where, and event. Example: { where: 'navbar', event: 'org_14301' }
	 */
	function subscribe(args) {
		if (!args || !args.where || !args.event) {
			return;
		}

		// attach our socket to our dispatcher
		if (!dispatcher.attached(socket)) {
			dispatcher.attach(socket);
		}

		var subscribeKey = args.where + '&&' + args.event;

		// don't allow duplicates
		if (callbacks[subscribeKey]) {
			return;
		}

		function fn() {
			socket.emit('message.published', args);
		}
		callbacks[subscribeKey] = fn;
		socket.dispatcher.subscribe(args.event, fn);
	}

	/**
	 * Unsubscribes from a particular event.
	 * @param args A dictionary requiring two properties: where, and event. Example: { where: 'navbar', event: 'org_14301' }
	 */
	function unsubscribe(args) {
		if (!args || !args.where || !args.event) {
			return;
		}
		var fn = callbacks[args.where + '&&' + args.event];
		if (dispatcher.attached(socket) && fn) {
			socket.dispatcher.unsubscribe(args.event, fn);
		}
	}

	/**
	 * When the socket disconnect, clean up after ourselves.
	 */
	function disconnect() {
		if (dispatcher.attached(socket)) {
			dispatcher.detach(socket);
		}
		callbacks = socket = null;
	}
	function api(args, fn) {
		log.info('api', args);

		if (!args || !args.url) {
			return;
		}

		var uri = 'http://' + config.get('host') + ':' + config.get('port') + args.url,
			method = args.method || 'get',
			options = {
				headers: socket.handshake.headers,
				url: uri,
				method: method.toLowerCase(),
				form: args.data
			},
			req = request(options, function(err, res, body) {
				res.fn = fn;
				socketParseResponse(err, res, body);
			});
	}
}

function socketParseResponse(err, res, body) {
	var response = {
			success: true,
			code: res.statusCode
		};

	if (err) {
		res.response.success = false;
		res.response.result = err;
		return res.fn && res.fn(res.response);
	}

	try {
		if (res.statusCode > 299) {
			response.success = false;
			response.code = res.statusCode;
			response.result = JSON.parse(body).message;
			return res.fn && res.fn(response);
		}

		response.result = JSON.parse(body).result;
	} catch (e) {}

	return res.fn && res.fn(response);
}
/**
 * constructor that setups up Socket.IO connection
 *
 * @author Tim Golen 2014-12-25
 *
 * @param  {Object} server Node HTTP Server
 *
 * @return {void}
 */
module.exports = function(app, redisPort, redisHost, redisPassword, debug) {
	var io = socketio.listen(app.server);
	restifyApp = app;
	io.on('connection', connection);
	log.info('socket.io started');
	dispatcher.start(redisPort, redisHost, redisPassword, debug);
	return io;
};