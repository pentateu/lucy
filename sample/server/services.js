'use strict';
  
var io = require('socket.io').listen(8500),
    lucy = require('lucy');

io.configure('production', function(){
  io.set('log level', 1);
});

lucy.mapCollection('person');

lucy.start(io, 'mongodb://localhost/test');

