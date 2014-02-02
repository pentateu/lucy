'use strict';

angular.module('splitMyBillApp')

  .service('clientStore', function() {
    return window.localStorage;
  })
  
  .service('updateAngular', function($rootScope) {
    return function (scope) {
      scope = scope || $rootScope;
      setTimeout(function () {
        try {
          scope.$digest();
        }
        catch(error) {
          //ignore
        }
      }, 1);//execute on the next loop ... so multiple sockets events will trigger just one digest
    };
  })

  .service('QueryCommand', function(persistenceSocket, $q, updateAngular) {
    
    var QueryCommand = function(entity, list, scope) {
      
      var self = this;
      
      
      /*
      self.setParameters = function (params) {
        params = Array.prototype.slice.call(params);
      
        angular.extend(self.params.query, params[0] || {});
        angular.extend(self.params.fields, params[1] || {});
        angular.extend(self.params.options, params[2] || {});
        angular.extend(self.params.sort, params[3] || {});
      };
      */
      
      //fire the query
      self.fire = function() {
        
        var deferred = $q.defer();
        
        //check if it is on-line
        if(!persistenceSocket.socket.connected){
          //use existing list
          deferred.resolve(list);
          updateAngular(scope);
        }
        
        var params = {
          query: list.$query || {},
          fields: list.$fields || {},
          options: list.$options || {},
          sort: {}
        };
        
        angular.copy(list.$sort, params.sort);
        
        //fire a request to the server to get the data
        persistenceSocket.emit(entity.name + '::find', params, function (newList) {
          if(list){
            list.length = 0;//clear the list
            angular.copy(newList, list);
            list.notifyUpdate();
          }
          deferred.resolve(newList);
          
          updateAngular(scope);
        });
        
        return deferred.promise;
      };
      
    };
    
    return QueryCommand;
  })

  .service('LocalEntity', function(persistenceSocket, clientStore, QueryCommand, updateAngular) {
    
    var LocalEntity = function(name, scope) {
      
      var self = this,
          noop = function () {};
      
      self.name = name;
      
      function ObjInstance(data){
        var entity = this;
        angular.copy(data, entity);
        entity.save = function() {
            //save the updates remotely
            persistenceSocket.emit(name + '::update', { doc: entity });
          };
      }

      function NewInstance(){
        var entity = this;
        entity.save = function() {
            //save the new instance remotely
            persistenceSocket.emit(name + '::add', { doc: entity });
          };
      }
      
      function removeItemFromList(_id, list){
        var idx = 0, found;
        for (; idx < list.length; idx++) {
          if (list[idx]._id === _id) {
            found = true;
            break;
          }
        }
        if (found) {
          list.splice(idx, 1);
        }
      }
      
      function addItemsToList(items, list) {
        items.forEach(function(item){
          //store in thje list
          list.push(new ObjInstance(item));
        });
      }
      
      function filteredList(list, notifyUpdate){
        
        list = list || [];
        
        //TODO Change this to a prototype
        list.$query   = {};
        list.$fields  = {};
        list.$options = {};
        list.$sort    = {
          fire: function (sortParams) {
            angular.extend(list.$sort, sortParams || {});
            list.command.fire();
          }
        };
        
        list.notifyUpdate = notifyUpdate || noop;
        
        list.command = new QueryCommand(self, list);
        
        //map the events when this list will be updated
        list.updateOn = function () {
          var events = Array.prototype.splice.call(arguments, 0);
          
          //delete event
          if( events.indexOf('delete') > -1 ) {
            //when an instance is deleted remove it from the list
            persistenceSocket.on(name + ' delete success', function(_id){
              removeItemFromList(_id, list);
            });
          }
          
          //add event
          if( events.indexOf('add') > -1 ) {
            //when an instance is added ... add it to the list
            persistenceSocket.on(name + ' add success', function(result){
              addItemsToList(result, list);
            });
          }
          
          return list;//return the list to allow for chained function calls
        };
        
        list.find = function() {
          return list.command.fire();
        };
        
        return list;
      }
      
      function FilteredLists(){
        var self = this;
        self.add = function(listName){
          if(!self[listName]){
            self[listName] = filteredList();
          }
          return self[listName];
        };
      }
      
      /*
      //local store and all property
      self.$all = clientStore.getItem(LocalEntity._localStorePrefix + name + '_$all');
      if(self.$all){
        self.$all = JSON.parse(self.$all);
      }
      
      self.$all = filteredList(self.$all, function(){
        //notifyUpdate -> function called when new data is added to the list
        //save the self.$all list the local storage
        clientStore.setItem(LocalEntity._localStorePrefix + name + '_$all', JSON.stringify(self.$all));
      });
      */
      
      //new object holder
      self.$new = new NewInstance();
      
      //list (container) of 'lists'
      self.$list = new FilteredLists();
      
      self.delete = function (instance) {
        persistenceSocket.emit(name + '::delete', instance._id);
      };
      
      //socket events
      persistenceSocket.on(name + ' find success', function(size){
        size = size;//to avoid lint errors
        updateAngular(scope);
      });
      
      persistenceSocket.on(name + ' add success', function(){
        //reset the $new obj
        self.$new = new NewInstance();
        
        //trigger angular digest
        updateAngular(scope);
      });
      
      persistenceSocket.on(name + ' delete success', function(){
        //trigger angular digest
        updateAngular(scope);
      });
    
    };
    
    LocalEntity._localStorePrefix = 'clientStore_';
    
    return LocalEntity;
  })
  
  .service('person', function(LocalEntity) {
    var person = new LocalEntity('person');
    return person;
  });