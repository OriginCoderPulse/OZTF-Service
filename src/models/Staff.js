const mongoose = require('mongoose');

const staffSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    department: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Department',
        required: true,
        index: true
    },
    occupation: {
        type: String,
        enum: ['CEO', 'ACT', 'FD', 'BD', 'FSD', 'QA', 'DevOps', 'HR', 'HRBP', 'PM', 'UI'],
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

// 索引优化：覆盖常用查询条件，提升 staff 列表与统计接口性能
staffSchema.index({ department: 1 });
staffSchema.index({ status: 1 });
staffSchema.index({ department: 1, status: 1 });
staffSchema.index({ serviceDate: 1 });
staffSchema.index({ salary: 1 });
staffSchema.index({ gender: 1 });

// 确保只有一个CEO（超级管理员）
staffSchema.pre('save', async function (next) {
    if (this.occupation === 'CEO') {
        // 检查部门是否是CEO部门
        const Department = mongoose.model('Department');
        const ceoDept = await Department.findOne({ name: 'CEO' });

        if (ceoDept && this.department.toString() === ceoDept._id.toString()) {
            // 检查是否已存在其他CEO
            const existingCeo = await this.constructor.findOne({
                department: ceoDept._id,
                occupation: 'CEO',
                _id: { $ne: this._id }
            });

            if (existingCeo) {
                return next(new Error('系统中只能有一个CEO（超级管理员）'));
            }
        }
    }
    next();
});

module.exports = mongoose.model('Staff', staffSchema);
