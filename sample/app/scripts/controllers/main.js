'use strict';

angular.module('splitMyBillApp')
  .controller('MainCtrl', function ($scope, person) {
    $scope.awesomeThings = [
      'HTML5 Boilerplate',
      'AngularJS',
      'Karma'
    ];
    
    
    $scope.getSortIcon = function (value) {
      if (value === 1){
        return 'down';
      }
      else{
        return 'up';
      }
    };
    
    $scope.person = person;
    
    //create a list for all entities
    person.$list.add('all')
      .updateOn('add', 'delete');
    
    //default sorting
    person.$list.all.$sort.age = 1;
    
    //load the list
    person.$list.all.find();
    
    //create a filtered list
    person.$list.add('byAge')
      .updateOn('delete');
    
    
  });
