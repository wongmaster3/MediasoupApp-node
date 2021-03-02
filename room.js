const User = require('./models/User.js');

class Room {
    constructor(roomId, router, workerId) {
      // We use the router id as the room id
      this.roomId = roomId;
      this.routerObj = router;
      this.workerId = workerId;
      this.users = {};
    }

    addUser(userName) {
        this.users[userName] = new User(userName);
    }

    removeUser(userName) {
        this.users[userName].closeActiveTransports();
        delete this.users[userName];
    }

    hasUser(userName) {
        return userName in this.users;
    }

    getUser(userName) {
        return this.users[userName];
    }

    getUsers() {
        return this.users;
    }

    numberOfUsers() {
        return Object.keys(this.users).length;
    }

    getRouter() {
        return this.routerObj;
    }

    getWorkerId() {
        return this.workerId;
    }
}

module.exports = Room;