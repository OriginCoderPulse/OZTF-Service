const mongoose = require('mongoose');

const staffSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    department: {
        type: String,
        enum: ['Technology', 'RMD', 'Finance', 'Product'],
        required: true
    },
    occupation: {
        type: String,
        required: true
    },
    status: {
        type: String,
        enum: ['Active', 'Probation', 'Inactive'],
        default: 'Probation'
    },
    serviceDate: {
        type: Date,
        required: true
    },
    salary: {
        type: Number,
        default: 0
    },
    gender: {
        type: String,
        enum: ['男', '女'],
        default: '男'
    },
    age: {
        type: Number,
        default: 25
    },
    roleIds: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Role',
        required: true,
        index: true
    }],
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
}, {
    collection: 'OZTF_STAFF'
});

staffSchema.index({ department: 1 });
staffSchema.index({ status: 1 });
staffSchema.index({ roleIds: 1 });

module.exports = mongoose.model('Staff', staffSchema);
