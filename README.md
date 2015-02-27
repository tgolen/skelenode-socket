# Skelenode Socket
This is a Skelenode component to allow socket connections to the server. It also allows you to call the RESTful API through the socket connections

# Requirements
* You must have a [Skelenode server](https://github.com/tgolen/skelenode) running
* You must also have a [Redis server](http://redis.io/) that you can connect to

# Installation
```
npm install skelenode-socket
```

# Usage
```
var skelenodeSocket = require('skelenode-socket');

// app is a restify or an express server instance
skelenodeSocket(app, redisPort, redisHost, redisPassword);
```

To connect to the Skelenode RESTful API from a web client, you should use [skelenode-api](https://github.com/tgolen/skelenode-api)

# Contributing
Open a pull request with plenty of well-written instructions on what you are submitting and why you are submitting it
