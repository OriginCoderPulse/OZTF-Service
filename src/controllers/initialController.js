const Staff = require('../models/Staff');
const Role = require('../models/Role');
const Permission = require('../models/Permission');
const RolePermission = require('../models/RolePermission');
const Project = require('../models/Project');
const ProjectMember = require('../models/ProjectMember');
const mongoose = require('mongoose');

/**
 * 验证请求参数
 */
const validateRequest = (uid) => {
    if (!uid) {
        return {
            valid: false,
            error: {
                status: 400,
                meta: {
                    code: '1024-C01',
                    message: 'Invalid request data: Field validation failed'
                }
            }
        };
    }
    return { valid: true };
};

/**
 * 查找并验证员工
 */
const findAndValidateStaff = async (uid) => {
    // 尝试使用 ObjectId 查找
    let staff;
    if (mongoose.Types.ObjectId.isValid(uid)) {
        staff = await Staff.findById(uid);
    } else {
        // 如果不是有效的 ObjectId，尝试其他查找方式
        staff = await Staff.findOne({ _id: uid });
    }

    if (!staff) {
        return {
            valid: false,
            error: {
                status: 401,
                meta: {
                    code: '1024-B01',
                    message: 'Authentication failed: Invalid or expired token'
                }
            }
        };
    }

    // 检查 roleIds 是否存在且有效
    if (!staff.roleIds || !Array.isArray(staff.roleIds) || staff.roleIds.length === 0) {
        return {
            valid: false,
            error: {
                status: 401,
                meta: {
                    code: '1024-B01',
                    message: 'Authentication failed: Invalid or expired token'
                }
            }
        };
    }

    // 处理 roleIds：可能是 ObjectId 或字符串（旧数据格式）
    let roleIds = staff.roleIds;
    const firstRoleId = roleIds[0];
    let roles = [];

    // 检查是否是字符串格式（旧数据，如 "ROLE_000001"）
    if (typeof firstRoleId === 'string' && !mongoose.Types.ObjectId.isValid(firstRoleId)) {
        // 旧数据格式：尝试通过角色名称映射查找
        // 如果 roleId 是 "ROLE_000001" 格式，需要重新初始化数据库
        // 但为了兼容，我们尝试查找所有角色，然后根据名称匹配
        console.warn('[Initial] Warning: Staff has string roleIds, attempting to find roles by name mapping');

        // 尝试通过角色名称查找（如果 roleId 格式是 "ROLE_000001"，这不会工作）
        // 最好的方式是重新初始化数据库
        const allRoles = await Role.find({});
        const roleNameMap = {
            'ROLE_000001': 'Super',
            'ROLE_000002': 'Developer',
            'ROLE_000003': 'RMD',
            'ROLE_000004': 'Treasurer'
        };

        const roleNames = roleIds.map(id => roleNameMap[id]).filter(Boolean);
        if (roleNames.length > 0) {
            roles = await Role.find({ name: { $in: roleNames } });
        }

        if (roles.length === 0) {
            return {
                valid: false,
                error: {
                    status: 401,
                    meta: {
                        code: '1024-B01',
                        message: 'Authentication failed: Database needs reinitialization. Please run: npm run init-db'
                    }
                }
            };
        }
    } else {
        // 新数据格式：roleIds 是 ObjectId 数组
        // 确保 roleIds 是 ObjectId 数组
        roleIds = roleIds.map(id => {
            if (typeof id === 'string') {
                return mongoose.Types.ObjectId.isValid(id) ? new mongoose.Types.ObjectId(id) : id;
            }
            return id;
        });

        // 查询角色信息
        roles = await Role.find({ _id: { $in: roleIds } });

        if (roles.length === 0) {
            return {
                valid: false,
                error: {
                    status: 401,
                    meta: {
                        code: '1024-B01',
                        message: 'Authentication failed: No valid roles found'
                    }
                }
            };
        }
    }

    // 将角色信息附加到 staff 对象
    staff.roles = roles;

    return { valid: true, staff };
};

/**
 * 获取员工的所有权限（去重并按order排序）
 */
const getStaffPermissions = async (roleIds) => {
    // 获取角色权限关联
    const rolePermissions = await RolePermission.find({
        roleId: { $in: roleIds }
    }).lean();

    // 获取所有唯一的权限ID
    const permissionIds = [...new Set(
        rolePermissions.map(rp => rp.permissionId)
    )];

    // 获取权限详情并按order排序
    const permissions = await Permission.find({
        _id: { $in: permissionIds }
    })
        .sort({ order: 1 })
        .lean();

    return permissions;
};

/**
 * 格式化权限图标
 */
const formatPermissionIcon = (icon) => {
    if (!icon) return null;

    if (Array.isArray(icon)) {
        const filtered = icon.filter(
            item => item && typeof item === 'string' && item.trim().length > 0
        );
        return filtered.length > 0 ? filtered : null;
    }

    if (typeof icon === 'string' && icon.trim().length > 0) {
        return icon;
    }

    return null;
};

/**
 * 根据职业获取utils列表
 */
const getUtilsByOccupation = (occupation, isSuper, isProjectManager) => {
    // 定义所有可用的utils及其icon
    const allUtils = {
        Manager: {
            title: 'Manager',
            icon: [
                'M885.71654 197.569728 138.085962 197.569728c-39.48427 0-71.606875 32.122605-71.606875 71.606875l0 552.574091c0 39.48427 32.122605 71.606875 71.606875 71.606875L885.71654 893.357568c39.48427 0 71.606875-32.122605 71.606875-71.606875L957.323415 269.176602C957.322391 229.692333 925.20081 197.569728 885.71654 197.569728zM385.546983 640.025838 385.546983 510.263449 640.593773 510.263449l0 129.762389L385.546983 640.025838zM640.593773 703.982476l0 125.417431L385.546983 829.399907 385.546983 703.982476 640.593773 703.982476zM640.593773 299.147194l0 147.160641L385.546983 446.307835 385.546983 299.147194 640.593773 299.147194zM704.550411 299.147194l188.816367 0 0 147.160641L704.550411 446.307835 704.550411 299.147194zM321.590346 299.147194l0 147.160641-191.153598 0L130.436748 299.147194 321.590346 299.147194zM130.435725 510.263449l191.153598 0 0 129.762389-191.153598 0L130.435725 510.263449zM704.550411 510.263449l188.816367 0 0 129.762389L704.550411 640.025838 704.550411 510.263449zM130.435725 821.74967 130.435725 703.982476l191.153598 0 0 125.417431L138.085962 829.399907C133.939525 829.399907 130.435725 825.896106 130.435725 821.74967zM885.71654 829.399907 704.550411 829.399907 704.550411 703.982476l188.816367 0 0 117.767194C893.365754 825.896106 889.862977 829.399907 885.71654 829.399907z'
            ]
        },
        Ops: {
            title: 'Ops',
            icon: [
                'M853.76 124.8768h-675.84a112.64 112.64 0 0 0-112.64 112.64v450.56a112.64 112.64 0 0 0 112.64 112.64h675.84a112.64 112.64 0 0 0 112.64-112.64v-450.56a112.64 112.64 0 0 0-112.64-112.64z m56.32 563.2a56.32 56.32 0 0 1-56.32 56.32h-675.84a56.32 56.32 0 0 1-56.32-56.32v-450.56a56.32 56.32 0 0 1 56.32-56.32h675.84a56.32 56.32 0 0 1 56.32 56.32zM769.28 857.0368h-506.88a28.16 28.16 0 0 0 0 56.32h506.88a28.16 28.16 0 0 0 0-56.32z',
                'M831.2832 527.36l-67.584-225.28a43.9808 43.9808 0 0 0-22.528-22.528 30.72 30.72 0 0 0-28.16 16.896l-101.376 202.752-107.008-152.064c-5.632-5.632-11.264-11.264-22.528-11.264s-22.528 5.632-22.528 16.896l-73.216 146.432-39.424-78.848c-5.632-11.264-11.264-16.896-22.528-16.896s-16.896 0-22.528 11.264l-95.744 112.64c-11.264 11.264-11.264 28.16 5.632 39.424 11.264 11.264 28.16 5.632 39.424-5.632l67.584-78.848 45.056 95.744a30.1568 30.1568 0 0 0 22.528 16.896c11.264 0 22.528-5.632 22.528-16.896l73.216-157.696 101.376 152.064a42.7008 42.7008 0 0 0 22.528 11.264c11.264 0 16.896-5.632 22.528-16.896l95.744-185.856 45.056 157.696c11.264 16.896 28.16 28.16 45.056 22.528s22.528-22.3744 16.896-33.792z'
            ]
        },
        UI: {
            title: 'UI',
            icon: [
                'M929.959184 14.098623c-18.798164-18.798164-49.195196-18.798164-67.79338 0L765.975198 110.089249c-4.799531 4.799531-8.59916 10.598965-10.998926 16.99834l-30.796993 81.991993-154.984864 155.184845c-90.191192-58.794258-198.580607-60.394102-261.974417 3.199688-21.997852 21.997852-35.996485 49.195196-42.795821 79.192266-7.399277 33.196758-38.19627 61.394004-72.19295 63.193829-51.195 2.599746-98.590372 21.39791-134.586856 57.194415-89.591251 89.791231-72.792891 251.775413 37.396348 361.964651s272.173421 126.987599 361.764671 37.396348c35.796504-35.796504 54.794649-83.391856 57.194415-134.586856 1.799824-33.99668 29.997071-64.593692 63.193828-72.19295 29.997071-6.799336 57.194415-20.997949 79.192267-42.795821 63.59379-63.59379 61.993946-171.783224 3.199687-261.974416l155.184846-155.184846 81.991993-30.796992c6.399375-2.399766 12.198809-6.199395 16.99834-10.998926l95.990625-95.990626c18.798164-18.798164 18.798164-49.195196 0-67.79338L929.959184 14.098623zM416.009374 512.049995a95.990626 95.990626 0 1 1 0 191.981252 95.990626 95.990626 0 1 1 0-191.981252z'
            ]
        }
    };

    // 超级管理员或项目经理：返回所有
    if (isSuper || isProjectManager) {
        return [allUtils.Manager, allUtils.Ops, allUtils.UI];
    }

    // 根据职业返回不同的utils
    const occupationStr = (occupation || '').toString();
    const occupationLower = occupationStr.toLowerCase();

    // 开发（前端开发工程师、后端开发工程师）：返回 Manager 和 UI
    if (occupationStr.includes('开发') || occupationLower.includes('developer') ||
        occupationLower === 'frontend' || occupationLower === 'backend') {
        return [allUtils.Manager, allUtils.UI];
    }

    // 运维（运维工程师）：返回 Manager、UI 和 Ops
    if (occupationStr.includes('运维') || occupationLower.includes('ops') ||
        occupationLower === 'devops') {
        return [allUtils.Manager, allUtils.UI, allUtils.Ops];
    }

    // UI（UI设计师）：只返回 UI
    if (occupationStr.includes('UI') || occupationStr.includes('ui') ||
        occupationStr.includes('设计')) {
        return [allUtils.UI];
    }

    // 默认：返回 Manager 和 UI
    return [allUtils.Manager, allUtils.UI];
};

/**
 * 格式化项目数据（Super角色）
 */
const formatProjectForSuper = (project, staff) => ({
    id: project._id.toString(),
    name: project.name,
    status: project.status,
    isOverdue: project.endDate < new Date() && project.status !== 'Completed',
    utils: getUtilsByOccupation(staff?.occupation, true, false)
});

/**
 * 格式化项目数据（普通员工）
 */
const formatProjectForStaff = (project, member, staff) => {
    // 判断是否是项目负责人：通过比较project.managerId和staff._id
    const isProjectManager = project.managerId &&
        project.managerId.toString() === staff._id.toString();

    return {
        id: project._id.toString(),
        name: project.name,
        status: project.status,
        isOverdue: project.endDate < new Date() && project.status !== 'Completed',
        pr: member ? member.role : undefined, // 项目成员角色：Frontend, Backend, Tester, UI, DevOps
        utils: getUtilsByOccupation(staff?.occupation, false, isProjectManager)
    };
};

/**
 * 获取员工的项目列表
 */
const getUserProjects = async (staff, isSuper) => {
    if (isSuper) {
        // Super返回所有项目
        const projects = await Project.find({})
            .sort({ createdAt: -1 })
            .lean();
        return projects.map(project => formatProjectForSuper(project, staff));
    }

    // 其他员工：查询作为项目负责人的项目和作为成员参与的项目
    const [managedProjects, projectMembers] = await Promise.all([
        // 查询作为项目负责人的项目
        Project.find({ managerId: staff._id }).lean(),
        // 查询作为成员参与的项目
        ProjectMember.find({ staffId: staff._id }).lean()
    ]);

    // 合并项目ID（去重）
    const projectIds = new Set();
    managedProjects.forEach(project => {
        projectIds.add(project._id.toString());
    });
    projectMembers.forEach(member => {
        projectIds.add(member.projectId.toString());
    });

    if (projectIds.size === 0) {
        return [];
    }

    // 查询所有相关项目
    const projects = await Project.find({
        _id: { $in: Array.from(projectIds).map(id => mongoose.Types.ObjectId.isValid(id) ? new mongoose.Types.ObjectId(id) : id) }
    })
        .sort({ createdAt: -1 })
        .lean();

    // 创建项目ID到成员信息的映射
    const memberMap = new Map();
    projectMembers.forEach(member => {
        memberMap.set(member.projectId.toString(), member);
    });

    return projects.map(project => {
        const member = memberMap.get(project._id.toString());
        return formatProjectForStaff(project, member, staff);
    });
};

/**
 * 构建TabItem结构
 */
const buildTabItems = (permissions, userProjects) => {
    return permissions.map((perm, index) => {
        const item = {
            id: index + 1,
            name: perm.name,
            fold: false,
            icon: formatPermissionIcon(perm.icon)
        };

        // 如果是Project权限，添加children（项目列表）
        if (perm.name === 'Project' && userProjects && userProjects.length > 0) {
            item.children = userProjects;
        }

        return item;
    });
};

/**
 * Initial接口主函数
 */
const initial = async (req, res) => {
    try {
        const { uid } = req.body;

        // 验证请求参数
        const validation = validateRequest(uid);
        if (!validation.valid) {
            return res.status(validation.error.status).json(validation.error);
        }

        // 查找并验证员工
        const staffValidation = await findAndValidateStaff(uid);
        if (!staffValidation.valid) {
            return res.status(staffValidation.error.status).json(staffValidation.error);
        }

        const { staff } = staffValidation;

        // 获取角色信息（从查询结果中获取）
        const roles = staff.roles || [];
        const roleNames = roles.map(role => role.name);
        const roleIds = roles.map(role => role._id);

        // 检查是否是Super角色
        const isSuper = roleNames.includes('Super');

        // 并行获取权限和项目列表
        const [permissions, userProjects] = await Promise.all([
            getStaffPermissions(roleIds),
            getUserProjects(staff, isSuper)
        ]);

        // 构建TabItem结构
        const tabItems = buildTabItems(permissions, userProjects);

        // 设置响应头，禁用缓存
        res.set({
            'Cache-Control': 'no-store, no-cache, must-revalidate, private',
            'Pragma': 'no-cache',
            'Expires': '0'
        });

        // 返回响应
        res.json({
            meta: {
                code: '1024-S200',
                message: 'Success'
            },
            data: {
                roles: roleNames,
                permissions: tabItems
            }
        });
    } catch (error) {
        console.error('[Initial] Error:', error);
        res.status(500).json({
            meta: {
                code: '1024-E01',
                message: 'Network error: Backend service unavailable'
            }
        });
    }
};

module.exports = { initial };
