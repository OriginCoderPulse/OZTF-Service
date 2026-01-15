const mongoose = require('mongoose');

const meetRoomSchema = new mongoose.Schema({
    meetId: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    topic: {
        type: String,
        required: true
    },
    description: {
        type: String,
        default: ''
    },
    organizerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Staff',
        required: true,
        index: true
    },
    startTime: {
        type: Date,
        required: true,
        index: true
    },
    duration: {
        type: Number, // 持续时间（分钟）
        required: true
    },
    password: {
        type: String,
        default: ''
    },
    status: {
        type: String,
        enum: ['Pending', 'InProgress', 'Cancelled', 'Concluded'],
        default: 'Pending',
        index: true
    },
    innerParticipants: {
        type: [mongoose.Schema.Types.ObjectId],
        ref: 'Staff',
        default: []
    },
    outParticipants: {
        type: [String], // 外部参会人数组（存储字符串，如姓名、邮箱等）
        default: []
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
    collection: 'OZTF_MEETROOM'
});

// 索引优化
meetRoomSchema.index({ organizerId: 1, status: 1 });
meetRoomSchema.index({ startTime: 1, status: 1 });
meetRoomSchema.index({ 'innerParticipants': 1 });

// 更新 updatedAt 字段
meetRoomSchema.pre('save', function(next) {
    this.updatedAt = new Date();
    next();
});

module.exports = mongoose.model('MeetRoom', meetRoomSchema);
