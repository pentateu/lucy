'use strict';

angular.module('splitMyBillApp')
  .controller('MainCtrl', function ($scope, person) {
    $scope.awesomeThings = [
      'HTML5 Boilerplate',
      'AngularJS',
      'Karma'
    ];
    
    
    $scope.person = person;
    
    //create a list for all entities
    person.$list.add('all')
      .updateOn('add', 'delete');
      
    //load the list
    person.$list.all.find().fire();
    
    //create a filtered list
    person.$list.add('byAge')
      .updateOn('delete');
    
    
  });
