class ActiveUser {
    // The user id (either consumer or producer)
    id = null;

    // The type of media being transferred (either 'audio' or 'video')
    kind = null;

    constructor(userId, kind) {
      // We use the router id as the room id
        this.id = userId;
        this.kind = kind;
    }
}

module.exports = ActiveUser;