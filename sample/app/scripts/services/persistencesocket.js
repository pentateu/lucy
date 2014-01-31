'use strict';

angular.module('splitMyBillApp')
  .service('persistenceSocket', function () {
    
    var socket = window.io.connect('http://localhost:8500/');
    
    return socket;
    
  });
