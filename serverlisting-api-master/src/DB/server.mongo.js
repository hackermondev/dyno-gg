let mongoose = require('mongoose')
let serverSchema = mongoose.Schema({
    id: String,
    name: String,
    blacklisted: {type: Boolean, default: false},
    added: {type: Date, default: new Date()},
    premium: {type: Boolean, default: false},
    memberCount: Number,
    icon: String,
    description: {type: String, default: ''},
    backgroundImage: {type: 'string'}
})
let serverModel = mongoose.model('listservers', serverSchema)
module.exports = serverModel
