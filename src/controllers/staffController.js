const Staff = require('../models/Staff');
const mongoose = require('mongoose');

// 获取员工信息列表
const getStaffInfo = async (req, res) => {
    try {
        const {
            current_page = 1,
            user_id,
            name,
            department,
            status,
            salary_min,
            salary_max,
            gender,
            join_date
        } = req.body;

        const pageSize = 15;
        const skip = (current_page - 1) * pageSize;

        // 构建查询条件
        const query = {};

        if (name) {
            query.name = { $regex: name, $options: 'i' };
        }
        if (department) {
            query.department = department;
        }
        if (status) {
            query.status = status;
        }
        if (gender) {
            query.gender = gender;
        }
        if (salary_min !== undefined || salary_max !== undefined) {
            query.salary = {};
            if (salary_min !== undefined) {
                query.salary.$gte = salary_min;
            }
            if (salary_max !== undefined) {
                query.salary.$lte = salary_max;
            }
        }
        if (join_date) {
            const date = new Date(join_date);
            query.serviceDate = {
                $gte: new Date(date.setHours(0, 0, 0, 0)),
                $lt: new Date(date.setHours(23, 59, 59, 999))
            };
        }

        const total = await Staff.countDocuments(query);
        const activeStaff = await Staff.countDocuments({ ...query, status: 'Active' });
        const probationStaff = await Staff.countDocuments({ ...query, status: 'Probation' });

        const staffList = await Staff.find(query)
            .skip(skip)
            .limit(pageSize)
            .sort({ createdAt: -1 });

        const dataList = staffList.map(staff => ({
            id: staff._id.toString(),
            name: staff.name,
            department: staff.department,
            occupation: staff.occupation,
            status: staff.status,
            service_date: staff.serviceDate
        }));

        res.json({
            meta: {
                code: '1024-S200',
                message: 'Success'
            },
            data: {
                data_list: dataList,
                total,
                active_staff: activeStaff,
                probation_staff: probationStaff
            }
        });
    } catch (error) {
        console.error('Get staff info error:', error);
        res.status(500).json({
            meta: {
                code: '1024-E01',
                message: 'Network error: Backend service unavailable'
            }
        });
    }
};

// 获取开发人员列表
const getStaffDevelopers = async (req, res) => {
    try {
        const developers = await Staff.find({
            department: { $in: ['Technology', 'Product'] },
            status: { $in: ['Active', 'Probation'] }
        })
            .select('name occupation department')
            .sort({ name: 1 });

        res.json({
            meta: {
                code: '1024-S200',
                message: 'Success'
            },
            data: {
                developers: developers.map(dev => ({
                    id: dev._id.toString(),
                    name: dev.name,
                    occupation: dev.occupation,
                    department: dev.department
                }))
            }
        });
    } catch (error) {
        console.error('Get staff developers error:', error);
        res.status(500).json({
            meta: {
                code: '1024-E01',
                message: 'Network error: Backend service unavailable'
            }
        });
    }
};

// 修改员工状态
const changeStaffStatus = async (req, res) => {
    try {
        const { staffID, status } = req.body;

        if (!staffID || !status) {
            return res.status(400).json({
                meta: {
                    code: '1024-C01',
                    message: 'Invalid request data: Field validation failed'
                }
            });
        }

        if (!['Active', 'Probation', 'Inactive'].includes(status)) {
            return res.status(400).json({
                meta: {
                    code: '1024-C01',
                    message: 'Invalid status value'
                }
            });
        }

        const staffId = mongoose.Types.ObjectId.isValid(staffID)
            ? new mongoose.Types.ObjectId(staffID)
            : staffID;
        const staff = await Staff.findByIdAndUpdate(
            staffId,
            { status, updatedAt: new Date() },
            { new: true }
        );

        if (!staff) {
            return res.status(404).json({
                meta: {
                    code: '1024-C01',
                    message: 'Staff not found'
                }
            });
        }

        res.json({
            meta: {
                code: '1024-S200',
                message: 'Success'
            },
            data: {
                id: staff._id.toString(),
                status: staff.status
            }
        });
    } catch (error) {
        console.error('Change staff status error:', error);
        res.status(500).json({
            meta: {
                code: '1024-E01',
                message: 'Network error: Backend service unavailable'
            }
        });
    }
};

// 部门统计
const getDepartmentStats = async (req, res) => {
    try {
        const { user_id } = req.body;

        const stats = await Staff.aggregate([
            {
                $group: {
                    _id: '$department',
                    count: { $sum: 1 }
                }
            },
            {
                $project: {
                    department: '$_id',
                    count: 1,
                    _id: 0
                }
            }
        ]);

        const total = stats.reduce((sum, item) => sum + item.count, 0);

        const departments = stats.map(item => ({
            department: item.department,
            count: item.count,
            percentage: total > 0 ? ((item.count / total) * 100).toFixed(2) : 0
        }));

        res.json({
            meta: {
                code: '1024-S200',
                message: 'Success'
            },
            data: {
                departments
            }
        });
    } catch (error) {
        console.error('Get department stats error:', error);
        res.status(500).json({
            meta: {
                code: '1024-E01',
                message: 'Network error: Backend service unavailable'
            }
        });
    }
};

// 薪资水平统计
const getSalaryLevelStats = async (req, res) => {
    try {
        const { user_id } = req.body;

        const salaryRanges = [
            { min: 0, max: 5000, label: '0-5000' },
            { min: 5000, max: 10000, label: '5000-10000' },
            { min: 10000, max: 20000, label: '10000-20000' },
            { min: 20000, max: 30000, label: '20000-30000' },
            { min: 30000, max: Infinity, label: '30000以上' }
        ];

        const stats = await Promise.all(
            salaryRanges.map(async (range) => {
                const query = {
                    salary: { $gte: range.min }
                };
                if (range.max !== Infinity) {
                    query.salary.$lt = range.max;
                }
                const count = await Staff.countDocuments(query);
                return {
                    salary_range: range.label,
                    count
                };
            })
        );

        const total = stats.reduce((sum, item) => sum + item.count, 0);

        const salaryLevels = stats.map(item => ({
            salary_range: item.salary_range,
            count: item.count,
            percentage: total > 0 ? ((item.count / total) * 100).toFixed(2) : 0
        }));

        res.json({
            meta: {
                code: '1024-S200',
                message: 'Success'
            },
            data: {
                salary_levels: salaryLevels
            }
        });
    } catch (error) {
        console.error('Get salary level stats error:', error);
        res.status(500).json({
            meta: {
                code: '1024-E01',
                message: 'Network error: Backend service unavailable'
            }
        });
    }
};

module.exports = {
    getStaffInfo,
    getStaffDevelopers,
    changeStaffStatus,
    getDepartmentStats,
    getSalaryLevelStats
};
