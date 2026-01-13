const mongoose = require('mongoose');

const featureSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    module: {
        type: String,
        required: true
    },
    description: {
        type: String,
        default: ''
    },
    priority: {
        type: String,
        enum: ['Low', 'Medium', 'High', 'Critical'],
        default: 'Medium'
    },
    assigneeId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Staff',
        required: true,
        index: true
    },
    assigneeName: {
        type: String,
        required: true
    },
    status: {
        type: String,
        enum: ['InProgress', 'Testing', 'Done', 'Cancelled'],
        default: 'InProgress'
    },
    projectId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Project',
        required: true,
        index: true
    },
    createdDate: {
        type: Date,
        default: Date.now
    },
    estimatedHours: {
        type: Number,
        default: 0
    },
    actualHours: {
        type: Number,
        default: 0
    },
    startDate: {
        type: Date
    },
    dueDate: {
        type: Date
    },
    completedDate: {
        type: Date
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
}, {
    collection: 'OZTF_FEATURES'
});

featureSchema.index({ projectId: 1 });
featureSchema.index({ assigneeId: 1 });
featureSchema.index({ status: 1 });

module.exports = mongoose.model('Feature', featureSchema);
