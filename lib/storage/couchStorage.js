var utils = require('../utils'),
    CouchDb = require('../util/couchdb');

var instance = null;

exports.createStorage = function(options) {
  if(!instance) {
    instance = new CouchStorage(options);
  }

  return instance;
}

/*
 * Storage is the system component, used to persist view layer snapshots. Main
 * motivation, is to lower the load for event storage and speed up the view
 * generate process, when client request comes. The storage is separate system
 * component and can be even implemented on different persistance system from
 * event storage.
 */
var CouchStorage = function(options) {
  CouchDb.call(this, options);
}

utils.inherits(CouchStorage, CouchDb);

/*
 * Method called to persist current view state, to the database snapshot.
 * Because of high concurrency, this method can be called even multiple times,
 * but system will take care, that most recent snapshot is always chosen, in
 * order to get data back.
 *
 * @param {View} View instance, to be snapshoted.
 */
CouchStorage.prototype.storeView = function(view) {
  var time = utils.uuid();

  this.createDocument(view.uid.toLowerCase() + '-' + time, {
    viewId: view.uid,
    type: 'view',
    lastEvent: view.lastEvent,
    time: time,
    data: view.data
  }, function(err, data) { 
    console.log(err)
  });
}

CouchStorage.prototype.purgeView = function(id) {
  var self = this;

  this._loadBareView(id, function(data) {
    if(data) {
      self.deleteDocument(data._id, data._rev);
    }
  });
}

/*
 * Load most recent snapshot, for a given view.
 *
 * @param {String} Unique view identifier.
 * @param {Function} Callback function taking view data structure as param.
 */
CouchStorage.prototype.loadView = function(id, callback) {
  this._loadBareView(id, function(data) {
    if(data) {
      delete data._id;
      delete data._rev;
      delete data.type;

      callback(data);
      return;
    }
      
    callback(null);
  });
}

/*
 * @private
 */
CouchStorage.prototype._loadBareView = function(id, callback) {
  this.request({
    method: 'GET',
    path: '/' + this.database + '/_design/cqrs/_view/viewSnapshot?startkey=["' + id + '","999999999999999999"]&endkey=["' + id + '","0"]&limit=1&descending=true'
  }, function(data) {
    data = JSON.parse(data);

    if(data.error || !data.rows[0]) {
      callback(null);
      return;
    }

    data = data.rows[0].value;

    callback(data);
  });
}

// EXPERIMENTAL
CouchStorage.prototype.setup = function() {

  var mapViewSnapshot = function(doc) {
    if(doc.viewId) {
      emit([doc.viewId, doc.time], doc);
    }
  }

  this.createDocument('_design/cqrs', {
    language: "javascript",
    views: {
      viewSnapshot: {map: mapViewSnapshot.toString() }
    }
  }, function(a, b) { console.log(a); console.log(b)})
}