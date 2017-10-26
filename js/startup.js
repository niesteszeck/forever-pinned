// TODO: Clean up code
// TODO: close process after run if option is not selected
const CREATE_FOLDER_ERROR_MSG = 'Please create a bookmark folder called "Forever pinned" to put your pinned tabs there as bookmarks pages and put it anywhere';
var buildTabs = {
  list:[],
  createSyncItems:function(){
    /**
     * have the sync items already been create aka has the plugin
     * been run before or is this it's first run
     */
    var deferOptions = Q.defer();

    chrome.storage.sync.get('options', function(data){
      if(typeof(data.options) === "undefined"){
        chrome.storage.sync.set({options:{}}, function(data){
          deferOptions.resolve();
        });
      }else{
        deferOptions.resolve();
      }
    });

    return [deferOptions.promise];
  },
  get:function(){
    /**
     * get list of URL to open from bookmarks
     * @type {buildTabs}
     */
    var self = this;
    var defer = Q.defer();
    defer.resolve('done');
    self.getUrls(self.removeDups.bind(self));
    return defer.promise;
    
  },
  getUrls: function(callback) {
    var defer = Q.defer();
    var self = this;
    chrome.bookmarks.getTree(function(bookmarks){
        var folder = searchForeverPinedFolder(bookmarks);
        if(folder===-1) {
            alert('"Forever pinned" folder not founded.' + CREATE_FOLDER_ERROR_MSG);
            return;
        }
        if(!folder.children) {
            alert('Founded a bookmark with name "Forever pinned", but is not a folder. ' + CREATE_FOLDER_ERROR_MSG);
        }
        var urlList =  folder.children.map(function(fpFolder, index){
            if(fpFolder.children) {
                return {};
            }
            return {
                url: fpFolder.url
            }
        });
        callback(urlList);
    });
    return defer.promise;
  },
  init:function(){
    /**
     * kick it off
     */
    var self = this;
     var createSyncItemsPromise = this.createSyncItems();
     Q.all(createSyncItemsPromise).then(function(){
     self.closeDups();
     });
  },
  create:function(){
    /**
     * Creates new tabs from this.list
     */
    for(var i = 0; i < this.list.length; i++){
      chrome.tabs.create({
        pinned:true,
        url:this.list[i].url,
        active:false
      });
    }
  },
  readAllTabs:function(){
    /**
     * gets currently open tabs
     */
    var defer = Q.defer();
    chrome.tabs.query({pinned:true, currentWindow:true}, function(data){
      defer.resolve(data);
    });
    return defer.promise;
  },
  closeDups:function(){
    /**
     * If you open a number of different windows all with the same pinned tab
     * chrome will take all the pinned tabs when quit and open then all in the
     * new window. This closes any existing dups before we open any new tabs.
     */
    var self= this;

    this.readAllTabs().then(function(data){
      var arr  = data;
      var dupsId = [];
      var dupsUrl = [];
      var list = [];
      var defer = Q.defer();

      self.getUrls(function(urlList){

        // clear list of urls
        for(var i=0; i < urlList.length; i++){
          list.push(urlList[i].url);
        }

        // remove extra slash from arrs urls
        for(var i=0; i<arr.length; i++){
          arr[i].url =self._removeSlash(arr[i].url);
        }
       
       var dupsId = [];
       var unqi = _.uniq(arr, 'url');
       
       arr  = _.filter(arr, function(item){
        return !(_.includes(unqi, item));
       })
       
       _.forEach(arr, function(item){
         dupsId.push(item.id);
       });
        
        chrome.tabs.remove(dupsId, function(){
          self.get();
        });
      });

    });
  },
  removeDups:function(urlList){
    /**
     * Compares currently open tabs with the opens in the URL list
     * stops tabs that are already opening again
     * @type {buildTabs}
     */
    var self = this;
    var list = [];
    var open = [];
    var domain = "";

    // reset list
    self.list = [];
    self.readAllTabs().then(function(openTabs){
      for(var i=0; i < openTabs.length; i++){
        /* remove parameters if configured so we can compare without them */
        if(applyOptions.options.ignoreParams) {
          openTabs[i].url =self._removeParams(openTabs[i].url);
        }
        /* remove trailing slashes as google seem to want to add them */
        openTabs[i].url =  self._removeSlash(openTabs[i].url);
        
        open.push(openTabs[i].url);
      }
      for(var i=0; i < urlList.length; i++){
        list.push(urlList[i].url);
      }
      list.forEach(function(item){
        /* Local item var to clean it from extra / and parameters */ 
        var localItem = item;
        
        /* remove parameterss if configured */
        if(applyOptions.options.ignoreParams) {
          localItem =self._removeParams(localItem);
        }
        /* remove trailing slashes */
        localItem = self._removeSlash(localItem);
        
        if(!(open.indexOf(localItem)> -1)){
          self.list.push({url:item});
        }
      });
      self.create();
    });
  },
  _removeSlash:function(str){
    if (str.substr(-1) === '/') {
      str = str.substr(0, str.length - 1);
    }
    return str;
  },
  _removeParams:function(str){
    var n = str.search(/\?/);
    if (n >= 0) {
      str = str.substr(0, n);
    }
    return str;
  }
};

var applyOptions = {
  options:{},
  init:function(){
    /**
     * kick it off
     */
    var self = this;

    this.get()
    .then(function(){
      self.apply();
    });
  },
  get:function(){
    /**
     * get the options from google sync
     * @type {applyOptions}
     */
    var self = this;
    var defer = Q.defer();
    chrome.storage.sync.get('options', function(data){
      self.options = data.options;
      defer.resolve(data.options);
    });
    return defer.promise;
  },
  apply:function(){
    /**
     * apply any settings that are needed
     */
    if(this.options.reopen){
      chrome.windows.onCreated.addListener(function(){
        buildTabs.init();
      });
    }
  }
};

var setupClick = {
    notRegistered: false,
    init: function(){
        if(!this.notRegistered) {
            /**
            * set up click action
            */
            chrome.browserAction.onClicked.addListener(function() {
                buildTabs.init();
            });
        }
        this.notRegistered = true;
    }
};
function searchForeverPinedFolder(bookmarks) {
    for(var i=0; i<bookmarks.length; i++) {
        folder = bookmarks[i];
        if (folder.children) {
            if(folder.title === 'Forever pinned') {
                return folder;
            } else {
                var founded = searchForeverPinedFolder(folder.children);
                if (founded != -1) {
                    return founded;
                }
            }
        }
    }
    return -1;
}

// start up the app crate tabs
buildTabs.init();
applyOptions.init();
setupClick.init();
