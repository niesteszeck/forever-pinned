// TODO: drag and drop rearrange https://github.com/angular-ui/ui-sortable
// TODO: Icon
// TODO: Tests

var app = angular.module('app', []);

app.service("urlList", function ($q) {
  /**
   * Service that gets and sets the list of URLs that appears in the UI
   * @type {{list: Array, get: Function, remove: Function, add: Function, save: Function}}
   */
  var listService = {
    list: [],
    get: function () {
      var defer = $q.defer();
      chrome.storage.sync.get('items', function (data) {
        var items = [];
        items.push(data.items);
        listService.list = data.items;
        defer.resolve(data.items);
      });
      return defer.promise;
    },
    remove: function (itemToRemove) {
      for (var i = 0; i < this.list.length; i++) {
        if (this.list[i].url === itemToRemove.url) {
          this.list.splice(i, 1);
          this.save();
          return false;
        }
      }
    },
    add: function (itemToAdd) {
      this.list.push(itemToAdd);
      this.save();
    },
    save: function () {
      chrome.storage.sync.set({items: listService.list}, function () {
        console.log('saved');
      });
    }
  };
  return listService;
});

app.service('optionService', function ($q) {
  /**
   * Service that gets and sets the options section of the UI
   * @type {{options: {reopen: boolean, ignoreParams: false}, save: Function, setReopen: Function}, setIgnoreParams: Function}}
   */
  var option = {
    options:{
      reopen:false,
      ignoreParams:false
    },
    save:function(){
      chrome.storage.sync.set({options:option.options}, function(data){
        console.log('options updated');
      });
    },
    get:function(){
      var self = this;
      var defer = $q.defer();
      chrome.storage.sync.get('options', function (data) {
        defer.resolve(data.options);
        self.options = data.options
      });
      return defer.promise;
    },
    setReopen:function(value){
      this.options.reopen = value;
      this.save();
    },
    setIgnoreParams:function(value){
      this.options.ignoreParams = value;
      this.save();
    }
  };
  return option;
});

app.controller('optionsCtrl', function($scope, optionService){
  /**
   * Controller for the options form
   */
  optionService.get().then(function(data){
    $scope.reopen = optionService.options.reopen;
    $scope.ignoreParams = optionService.options.ignoreParams;
  });

  $scope.reopenChange = function(){
    optionService.setReopen(!$scope.reopen);
  }
  
  $scope.ignoreParamsChange = function(){
    optionService.setIgnoreParams(!$scope.ignoreParams);
  }
});
