var repo = require('./repository').getInstance(),
    Storage = require('./storage/couchStorage');

/*
 * View is the ultimate way, how to look on your data, wider then the scope
 * of one aggregate. Views take various sets of events, found by type, and
 * compose output data report, to be used as DTO for a client. Its major
 * purpose is to decompose and normalize data from the event stream, so
 * the view queries can run with blazingly fast performance, with no need
 * for additional expensive queries to the database.
 *
 * ## View system architecture
 *
 * The view data itself should be kept in content property. Once the content
 * property is requested, system automatically recognize the action and ask the
 * view storage for current snapshot. Once the data is ready the view might or 
 * might not ask for new updates from event stream, apply new events and update 
 * the content. As soon as the last step is done, new snapshot is made and
 * stored back to the view database, to optimize query performance. All the 
 * snapshooting action is happening in parallel with read operations, or even
 * with other snapshot generators, thus there can be multiple versions of
 * your data in the system (for a reasonably short period).
 *
 * @param {String|Array} Unique view identifier.
 * @param {String|Array} Event, or list of events the view is interested in.
 * @param {Function} Callback to be triggered when view data is loaded to
 *   the memory.
 */
module.exports = View = function(uid, eventNames) {

  // Store view unique id.
  this.uid = uid;

  // List of event names, the view is interested in.
  this.eventNames = eventNames;

  // Data content of the view, used as DTO for client.
  this.data = {};

  // Timestamp of last applied event.
  this.lastEvent = 0;
}

View.prototype.load = function(callback) {
  var self = this,
      storage = Storage.createStorage();

  storage.loadView(this.uid, function(data) {
    if(data) {
      self.data = data.data;
      self.lastEvent = data.lastEvent
    }

    if(callback) callback.call(self);
  })  
}

