module.exports = {
    required: ['body'],
    additionalProperties: false,
    properties: {
        body: {
            required: ['id', 'name', 'premium', 'memberCount', 'icon'],
            properties: {
                id: {type: 'string'},
                name: {type: 'string'},
                blacklisted: {type: 'boolean'},
                premium: {type: 'boolean'},
                memberCount: {type: 'integer', minimum: 1},
                icon: {type: 'string'},
                description: {type: 'string'},
                backgroundImage: {type: 'string'}
            }
        }
    }
}
