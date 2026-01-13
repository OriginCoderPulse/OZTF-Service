const Project = require('../models/Project');
const ProjectMember = require('../models/ProjectMember');
const Staff = require('../models/Staff');
const mongoose = require('mongoose');

// 获取项目详情
const getProjectDetail = async (req, res) => {
    try {
        const { project_id, user_id } = req.body;

        if (!project_id || !user_id) {
            return res.status(400).json({
                meta: {
                    code: '1024-C01',
                    message: 'Invalid request data: Field validation failed'
                }
            });
        }

        const projectId = mongoose.Types.ObjectId.isValid(project_id)
            ? new mongoose.Types.ObjectId(project_id)
            : project_id;
        // 使用 lean() 减少 Mongoose 文档包装开销
        const project = await Project.findById(projectId).lean();
        if (!project) {
            return res.status(404).json({
                meta: {
                    code: '1024-C01',
                    message: 'Project not found'
                }
            });
        }

        // 获取项目成员（lean + 不使用 populate，减少多余查询）
        const members = await ProjectMember.find({ projectId: projectId })
            .lean();

        // 获取成员详细信息
        const memberDetails = members.map(member => ({
            staff_id: member.staffId.toString(),
                    name: member.name,
                    department: member.department,
                    occupation: member.occupation,
                    role: member.role,
            join_date: member.joinDate ? member.joinDate.toISOString() : null
        }));

        // 判断用户角色
        let userRole = 'Developer'; // 默认角色
        let isProjectManager = false;
        let isTester = false;

        const userId = mongoose.Types.ObjectId.isValid(user_id)
            ? new mongoose.Types.ObjectId(user_id)
            : user_id;
        if (project.managerId.toString() === userId.toString()) {
            userRole = 'Manager';
            isProjectManager = true;
        } else {
            // 并行检查是否是测试人员（通过职业或项目成员角色）
            const [staff, member] = await Promise.all([
                Staff.findById(userId).lean(),
                ProjectMember.findOne({ projectId: projectId, staffId: userId }).lean()
            ]);
            
            if (member && member.role === 'QA') {
                isTester = true;
            } else if (staff && staff.occupation === 'QA') {
                isTester = true;
            }
        }

        res.json({
            meta: {
                code: '1024-S200',
                message: 'Success'
            },
            data: {
                id: project._id.toString(),
                name: project.name,
                status: project.status,
                manager_id: project.managerId.toString(),
                manager_name: project.managerName,
                description: project.description,
                start_date: project.startDate,
                end_date: project.endDate,
                priority: project.priority,
                progress: project.progress,
                members: memberDetails,
                user_role: userRole,
                is_project_manager: isProjectManager,
                is_tester: isTester
            }
        });
    } catch (error) {
        console.error('Get project detail error:', error);
        res.status(500).json({
            meta: {
                code: '1024-E01',
                message: 'Network error: Backend service unavailable'
            }
        });
    }
};

// 添加项目
const addProject = async (req, res) => {
    try {
        const { name, start_date, end_date, priority, manager_id, members } = req.body;

        if (!name || !start_date || !end_date || !priority || !manager_id) {
            return res.status(400).json({
                meta: {
                    code: '1024-C01',
                    message: 'Invalid request data: Field validation failed'
                }
            });
        }

        // 获取项目经理信息
        const managerId = mongoose.Types.ObjectId.isValid(manager_id)
            ? new mongoose.Types.ObjectId(manager_id)
            : manager_id;
        const manager = await Staff.findById(managerId);
        if (!manager) {
            return res.status(404).json({
                meta: {
                    code: '1024-C01',
                    message: 'Manager not found'
                }
            });
        }

        // 创建项目
        const project = new Project({
            name,
            startDate: new Date(start_date),
            endDate: new Date(end_date),
            priority,
            managerId: managerId,
            managerName: manager.name,
            status: 'Planning',
            progress: 0
        });

        await project.save();

        // 添加项目成员
        if (members && members.length > 0) {
            const memberPromises = members.map(async (member) => {
                const staffId = mongoose.Types.ObjectId.isValid(member.staff_id)
                    ? new mongoose.Types.ObjectId(member.staff_id)
                    : member.staff_id;
                const staff = await Staff.findById(staffId).populate('department');
                if (staff && staff.department) {
                    // 获取部门名称（必须是 ObjectId 引用）
                    const staffDept = staff.department.name || '';
                    
                    // 映射角色：确保使用新的角色代码
                    let role = member.role || 'FD';
                    const roleMap = {
                        'Frontend': 'FD',
                        'Backend': 'BD',
                        'Tester': 'QA',
                        'UI': 'UI',
                        'DevOps': 'DevOps'
                    };
                    if (roleMap[role]) {
                        role = roleMap[role];
                    }
                    
                    // 验证角色是否在允许的范围内
                    if (!['FD', 'BD', 'UI', 'QA', 'DevOps'].includes(role)) {
                        role = 'FD'; // 默认值
                    }
                    
                    const projectMember = new ProjectMember({
                        projectId: project._id,
                        staffId: staffId,
                        name: staff.name,
                        department: staffDept,
                        occupation: staff.occupation,
                        role: role
                    });
                    return projectMember.save();
                }
            });
            await Promise.all(memberPromises);
        }

        res.json({
            meta: {
                code: '1024-S200',
                message: 'Success'
            },
            data: {
                id: project._id.toString(),
                name: project.name
            }
        });
    } catch (error) {
        console.error('Add project error:', error);
        res.status(500).json({
            meta: {
                code: '1024-E01',
                message: 'Network error: Backend service unavailable'
            }
        });
    }
};

module.exports = {
    getProjectDetail,
    addProject
};
