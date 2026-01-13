const mongoose = require('mongoose');
require('dotenv').config();

const Department = require('../models/Department');
const Permission = require('../models/Permission');
const DepartmentPermission = require('../models/DepartmentPermission');
const Staff = require('../models/Staff');
const Project = require('../models/Project');
const ProjectMember = require('../models/ProjectMember');
const Feature = require('../models/Feature');
const Bug = require('../models/Bug');

const connectDB = async () => {
    try {
        const encodedPassword = encodeURIComponent(process.env.DB_PASSWORD);
        const mongoURI = `mongodb://${process.env.DB_USER}:${encodedPassword}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}?authSource=admin`;

        await mongoose.connect(mongoURI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });

        console.log('MongoDB 连接成功');
    } catch (error) {
        console.error('MongoDB 连接失败:', error);
        process.exit(1);
    }
};

// 生成随机中文姓名
const generateChineseName = () => {
    const surnames = ['张', '王', '李', '赵', '刘', '陈', '杨', '黄', '周', '吴', '徐', '孙', '马', '朱', '胡', '林', '郭', '何', '高', '罗'];
    const names = ['伟', '芳', '娜', '秀英', '敏', '静', '丽', '强', '磊', '军', '洋', '勇', '艳', '杰', '涛', '明', '超', '秀兰', '霞', '平', '刚', '桂英'];
    const surname = surnames[Math.floor(Math.random() * surnames.length)];
    const name = names[Math.floor(Math.random() * names.length)];
    return surname + name;
};

// 初始化权限数据
const initPermissions = async () => {
    console.log('开始初始化权限数据...');
    await Permission.deleteMany({});

    const permissions = [
        {
            name: 'Home',
            order: 1,
            description: '首页',
            icon: ['M192 299.946667a33.408 33.408 0 0 1 34.133333 54.741333l-30.037333 22.272a62.72 62.72 0 0 0-22.613333 47.872v339.456a100.906667 100.906667 0 0 0 100.522666 100.181333h170.666667v0.725334a33.408 33.408 0 1 1 0 66.773333h-170.666667A167.68 167.68 0 0 1 106.666667 764.672V424.832a129.109333 129.109333 0 0 1 50.090666-100.181333l30.805334-23.04zM410.496 119.466667a153.984 153.984 0 0 1 192.896 0l256.426667 204.416A130.218667 130.218667 0 0 1 908.373333 424.106667l-0.341333 340.224a167.338667 167.338667 0 0 1-167.338667 167.338666h-74.24c-44.714667 0-81.024-36.181333-81.237333-80.896v-153.6l-0.341333-3.84a21.546667 21.546667 0 0 0-21.162667-17.664h-111.317333a21.504 21.504 0 0 0-21.504 21.888v58.624a33.408 33.408 0 1 1-66.773334 0v-58.624a88.661333 88.661333 0 0 1 88.661334-88.661333h111.317333a88.661333 88.661333 0 0 1 88.32 88.661333v153.216c0 7.808 6.272 14.08 14.08 14.08h76.032a100.181333 100.181333 0 0 0 100.181333-100.138666V424.832a62.72 62.72 0 0 0-23.722666-48.213333l-256.384-204.458667a87.552 87.552 0 0 0-111.317334 0l-82.346666 61.568a34.048 34.048 0 1 1-39.68-55.253333z']
        },
        {
            name: 'Project',
            order: 2,
            description: '项目',
            icon: ['M778.976 526.272l-328.928 0c-26.88 0-48.576-21.664-48.576-48.544s21.728-48.544 48.576-48.544l328.896 0c26.88 0 48.512 21.728 48.512 48.544 0.032 26.88-21.824 48.544-48.48 48.544l0 0 0 0zM778.976 718.56l-328.928 0c-26.88 0-48.576-21.728-48.576-48.576 0-26.88 21.728-48.512 48.576-48.512l328.896 0c26.88 0 48.512 21.728 48.512 48.512 0.032 26.848-21.824 48.576-48.48 48.576l0 0 0 0zM1002.208 877.28l0-614.304c0-74.656-68-67.616-68-67.616s-405.92 0.416-384.352 0c-23.136 0.416-34.848-12.192-34.848-12.192s-16.128-27.936-45.28-71.712c-30.368-46.112-65.76-38.688-65.76-38.688l-298.944 0c-82.848 0-83.68 79.776-83.68 79.776l0 720.8c0 88.864 67.168 77.92 67.168 77.92l851.872 0c71.904 0.032 61.856-73.984 61.856-73.984l0 0 0 0 0 0 0 0zM941.184 840.896c0 27.488-22.112 49.6-49.632 49.6l-759.648 0c-27.488 0-49.6-22.112-49.6-49.6l0-514.272c0-27.488 22.112-49.632 49.6-49.632l759.648 0c27.488 0 49.632 22.112 49.632 49.632l0 514.272zM217.696 477.728c0 28.672 23.232 51.872 51.872 51.872s51.872-23.2 51.872-51.872c0-28.64-23.232-51.872-51.872-51.872s-51.872 23.2-51.872 51.872l0 0 0 0zM217.696 669.92c0 28.704 23.232 51.936 51.872 51.936s51.872-23.232 51.872-51.936c0-28.64-23.232-51.872-51.872-51.872s-51.872 23.264-51.872 51.872l0 0 0 0z']
        },
        {
            name: 'Staff',
            order: 3,
            description: '员工',
            icon: ['M774 406q58 30 92 88t30 127q0 12-9.5 22.5t-21 10.5q-11.5 0-21-10.5T835 621q0-46-21.5-85t-58-62.5Q719 450 677 450q-13 0-22-8.5t-9-24q0-15.5 9-24.5t22-9q30 0 53-24.5t23-57.5q0-33-23-58t-53-25q-12 0-21.5-10t-9.5-22.5q0-12.5 9.5-23T677 153q37 0 68.5 20t50 54q18.5 34 18.5 75 0 29-10.5 56T774 406z m-228 14q57 22 100 63.5t66 95Q735 632 735 691q0 13-10.5 23.5T701 725q-13 0-23.5-10.5T667 691q0-61-31.5-113T550 495.5Q496 465 431.5 465T313 495.5Q259 526 228 578t-31 113q0 13-11 23.5T162 725q-13 0-23.5-10.5T128 691q0-59 23.5-112.5t66-95Q260 442 317 419q-43-29-67.5-74T225 250q0-56 28-102.5t75-74Q375 46 431.5 46t104 27.5q47.5 27.5 75 74T638 250q0 50-24 95t-68 74v1zM432 114q-37 0-68.5 18.5t-50.5 50Q294 214 294 250t18 67.5q18 31.5 49.5 50T432 386q39 0 70.5-18.5t49-50Q569 286 569 250t-18.5-67.5Q532 151 500 132.5T432 114z']
        },
        {
            name: 'Meet',
            order: 4,
            description: '会议',
            icon: ['M917.333333 814.933333H106.666667c-36.266667 0-64-27.733333-64-64V192c0-36.266667 27.733333-64 64-64h810.666666c36.266667 0 64 27.733333 64 64v558.933333c0 36.266667-27.733333 64-64 64zM106.666667 170.666667c-12.8 0-21.333333 8.533333-21.333334 21.333333v558.933333c0 12.8 8.533333 21.333333 21.333334 21.333334h810.666666c12.8 0 21.333333-8.533333 21.333334-21.333334V192c0-12.8-8.533333-21.333333-21.333334-21.333333H106.666667z']
        },
        {
            name: 'Finance',
            order: 5,
            description: '财务',
            icon: ['M519.314286 416.914286L438.857143 490.057143l-80.457143-73.142857c-14.628571-14.628571-36.571429-14.628571-51.2 0-14.628571 7.314286-14.628571 36.571429 0 51.2l43.885714 43.885714c-14.628571 0-21.942857 14.628571-21.942857 29.257143 0 21.942857 14.628571 36.571429 36.571429 36.571428h36.571428v43.885715H365.714286c-21.942857 0-36.571429 14.628571-36.571429 36.571428s14.628571 36.571429 36.571429 36.571429h36.571428v36.571428c0 21.942857 14.628571 36.571429 36.571429 36.571429s36.571429-14.628571 36.571428-36.571429v-36.571428H512c21.942857 0 36.571429-14.628571 36.571429-36.571429s-14.628571-36.571429-36.571429-36.571428h-36.571429v-43.885715H512c21.942857 0 36.571429-14.628571 36.571429-36.571428 0-14.628571-7.314286-29.257143-21.942858-29.257143l43.885715-43.885714c14.628571-14.628571 14.628571-43.885714 0-51.2-14.628571-14.628571-36.571429-14.628571-51.2 0zM768 219.428571h-658.285714C51.2 219.428571 0 270.628571 0 329.142857v512c0 58.514286 51.2 109.714286 109.714286 109.714286h658.285714c58.514286 0 109.714286-51.2 109.714286-109.714286v-512c0-58.514286-51.2-109.714286-109.714286-109.714286z m36.571429 621.714286c0 21.942857-14.628571 36.571429-36.571429 36.571429h-658.285714c-21.942857 0-36.571429-14.628571-36.571429-36.571429v-512c0-21.942857 14.628571-36.571429 36.571429-36.571428h658.285714c21.942857 0 36.571429 14.628571 36.571429 36.571428v512zM914.285714 73.142857h-658.285714c-21.942857 0-36.571429 14.628571-36.571429 36.571429s14.628571 36.571429 36.571429 36.571428h658.285714c21.942857 0 36.571429 14.628571 36.571429 36.571429v512c0 21.942857 14.628571 36.571429 36.571428 36.571428s36.571429-14.628571 36.571429-36.571428v-512c0-58.514286-51.2-109.714286-109.714286-109.714286z']
        },
        {
            name: 'Video',
            order: 6,
            description: '视频',
            icon: ['M445.056 596.096h-92.864a86.976 86.976 0 0 1-86.88-86.88v-128.032a86.976 86.976 0 0 1 86.88-86.88h128.032a86.976 86.976 0 0 1 86.88 86.88v91.936a32 32 0 0 1-64 0v-91.936a22.88 22.88 0 0 0-22.88-22.88h-128.032a22.912 22.912 0 0 0-22.88 22.88v128.032c0 12.608 10.272 22.88 22.88 22.88h92.864a32 32 0 0 1 0 64z']
        },
        {
            name: 'DashBoard',
            order: 7,
            description: '仪表盘',
            icon: ['M924.8 385.6c-22.6-53.4-54.9-101.3-96-142.4-41.1-41.1-89-73.4-142.4-96C631.1 123.8 572.5 112 512 112s-119.1 11.8-174.4 35.2c-53.4 22.6-101.3 54.9-142.4 96-41.1 41.1-73.4 89-96 142.4C75.8 440.9 64 499.5 64 560c0 132.7 58.3 257.7 159.9 343.1l1.7 1.4c5.8 4.8 13.1 7.5 20.6 7.5h531.7c7.5 0 14.8-2.7 20.6-7.5l1.7-1.4C901.7 817.7 960 692.7 960 560c0-60.5-11.9-119.1-35.2-174.4zM761.4 836H262.6C184.5 765.5 140 665.6 140 560c0-99.4 38.7-192.8 109-263 70.3-70.3 163.7-109 263-109 99.4 0 192.8 38.7 263 109 70.3 70.3 109 163.7 109 263 0 105.6-44.5 205.5-122.6 276z']
        }
    ];

    const insertedPermissions = await Permission.insertMany(permissions);
    console.log(`已插入 ${insertedPermissions.length} 条权限数据`);
    return insertedPermissions;
};

// 初始化部门数据
const initDepartments = async () => {
    console.log('开始初始化部门数据...');
    await Department.deleteMany({});

    const departments = [
        { name: 'CEO', description: 'CEO（超级管理员）' },
        { name: 'Finance', description: '财务部' },
        { name: 'Technical', description: '技术部' },
        { name: 'RMD', description: '资源管理部' },
        { name: 'Product', description: '产品部' }
    ];

    const insertedDepartments = await Department.insertMany(departments);
    console.log(`已插入 ${insertedDepartments.length} 条部门数据`);
    return insertedDepartments;
};

// 初始化部门权限关联数据
const initDepartmentPermissions = async (departments, permissions) => {
    console.log('开始初始化部门权限关联数据...');
    await DepartmentPermission.deleteMany({});

    if (!departments || !permissions) {
        console.log('部门或权限数据不存在，跳过部门权限关联初始化');
        return;
    }

    const permissionMap = {};
    permissions.forEach(perm => {
        permissionMap[perm.name] = perm._id;
    });

    const departmentMap = {};
    departments.forEach(dept => {
        departmentMap[dept.name] = dept._id;
    });

    const departmentPermissionMapping = {
        'CEO': ['Home', 'Project', 'Staff', 'Meet', 'Finance', 'Video', 'DashBoard'],
        'Technical': ['Home', 'Project', 'Meet', 'Finance'],
        'RMD': ['Home', 'Staff', 'Meet', 'DashBoard'],
        'Finance': ['Home', 'Staff', 'Meet', 'Finance', 'DashBoard'],
        'Product': ['Home', 'Project', 'Meet', 'Finance']
    };

    const departmentPermissions = [];

    for (const [deptName, permissionNames] of Object.entries(departmentPermissionMapping)) {
        const deptId = departmentMap[deptName];
        if (!deptId) continue;

        for (const permName of permissionNames) {
            const permissionId = permissionMap[permName];
            if (permissionId) {
                departmentPermissions.push({
                    departmentId: deptId,
                    permissionId
                });
            }
        }
    }

    await DepartmentPermission.insertMany(departmentPermissions);
    console.log(`已插入 ${departmentPermissions.length} 条部门权限关联数据`);
};

// 初始化员工数据
const initStaff = async (departments) => {
    console.log('开始初始化员工数据...');
    await Staff.deleteMany({});

    if (!departments || departments.length === 0) {
        console.log('部门数据不存在，跳过员工初始化');
        return;
    }

    const departmentOccupationMap = {
        'CEO': ['CEO'],
        'Finance': ['ACT'],
        'Technical': ['FD', 'BD', 'FSD', 'QA', 'DevOps'],
        'RMD': ['HR', 'HRBP'],
        'Product': ['PM', 'UI']
    };

    const deptNames = Object.keys(departmentOccupationMap);
    const statuses = ['Active', 'Probation', 'Inactive'];
    const genders = ['男', '女'];

    const deptIdMap = {};
    departments.forEach(dept => {
        deptIdMap[dept.name] = dept._id;
    });

    const staffList = [];

    // 第一个员工必须是CEO
    const ceoDeptId = deptIdMap['CEO'];
    if (ceoDeptId) {
        staffList.push({
            name: generateChineseName(),
            department: ceoDeptId,
            occupation: 'CEO',
            status: 'Active',
            serviceDate: new Date(2020, 0, 1),
            salary: 50000,
            gender: genders[Math.floor(Math.random() * genders.length)],
            age: 35 + Math.floor(Math.random() * 15)
        });
    }

    // 生成其他员工（从2开始，因为第1个是CEO）
    for (let i = 2; i <= 50; i++) {
        const availableDeptNames = deptNames.filter(d => d !== 'CEO');
        const deptName = availableDeptNames[Math.floor(Math.random() * availableDeptNames.length)];
        const availableOccupations = departmentOccupationMap[deptName];
        const occupation = availableOccupations[Math.floor(Math.random() * availableOccupations.length)];
        const status = statuses[Math.floor(Math.random() * statuses.length)];
        const gender = genders[Math.floor(Math.random() * genders.length)];
        const age = 22 + Math.floor(Math.random() * 20);
        const salary = 5000 + Math.floor(Math.random() * 30000);
        const serviceDate = new Date(2020 + Math.floor(Math.random() * 4), Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1);

        const deptId = deptIdMap[deptName];
        if (!deptId) continue;

        staffList.push({
            name: generateChineseName(),
            department: deptId,
            occupation,
            status,
            serviceDate,
            salary,
            gender,
            age
        });
    }

    await Staff.insertMany(staffList);
    console.log(`已插入 ${staffList.length} 条员工数据`);
};

// 初始化项目数据
const initProjects = async () => {
    console.log('开始初始化项目数据...');
    await Project.deleteMany({});

    const staffList = await Staff.find({ status: { $in: ['Active', 'Probation'] } }).limit(50);
    if (staffList.length === 0) {
        console.log('没有可用的员工，跳过项目初始化');
        return;
    }

    const projects = [];
    const projectNames = ['OA系统', 'CRM系统', 'ERP系统', '电商平台', '移动APP', '数据分析平台', '客户管理系统', '财务管理系统'];

    for (let i = 0; i < 10; i++) {
        const manager = staffList[Math.floor(Math.random() * staffList.length)];
        const startDate = new Date(2023, Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1);
        const endDate = new Date(startDate.getTime() + 90 * 24 * 60 * 60 * 1000); // 90天后

        projects.push({
            name: `${projectNames[i % projectNames.length]}${i > projectNames.length - 1 ? ` (${Math.floor(i / projectNames.length) + 1})` : ''}`,
            managerId: manager._id,
            managerName: manager.name,
            startDate,
            endDate,
            priority: ['Low', 'Medium', 'High', 'Critical'][Math.floor(Math.random() * 4)],
            status: ['Planning', 'InProgress', 'Completed', 'OnHold', 'Cancelled'][Math.floor(Math.random() * 5)],
            progress: Math.floor(Math.random() * 100),
            description: `项目描述 ${i + 1}`
        });
    }

    const insertedProjects = await Project.insertMany(projects);
    console.log(`已插入 ${insertedProjects.length} 条项目数据`);
    return insertedProjects;
};

// 初始化功能数据
const initFeatures = async (projects) => {
    console.log('开始初始化功能数据...');
    await Feature.deleteMany({});

    if (!projects || projects.length === 0) {
        console.log('项目数据不存在，跳过功能初始化');
        return;
    }

    const staffList = await Staff.find({ status: { $in: ['Active', 'Probation'] } }).limit(50);
    if (staffList.length === 0) {
        console.log('没有可用的员工，跳过功能初始化');
        return [];
    }

    const features = [];

    projects.forEach(project => {
        // 确保 project 有 _id
        if (!project || !project._id) {
            console.log('警告: 项目数据无效，跳过');
            return;
        }

        for (let i = 0; i < 5; i++) {
            const assignee = staffList[Math.floor(Math.random() * staffList.length)];
            if (!assignee || !assignee._id) {
                console.log('警告: 员工数据无效，跳过');
                continue;
            }

            features.push({
                projectId: project._id,
                name: `功能 ${i + 1}`,
                module: `模块 ${Math.floor(i / 2) + 1}`,
                description: `功能描述 ${i + 1}`,
                assigneeId: assignee._id,
                assigneeName: assignee.name,
                status: ['Todo', 'InProgress', 'Testing', 'Done', 'Cancelled'][Math.floor(Math.random() * 5)],
                priority: ['Low', 'Medium', 'High', 'Critical'][Math.floor(Math.random() * 4)],
                createdDate: new Date(2023, Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1)
            });
        }
    });

    await Feature.insertMany(features);
    console.log(`已插入 ${features.length} 条功能数据`);
    return features;
};

// 初始化项目成员数据
const initProjectMembers = async (projects) => {
    console.log('开始初始化项目成员数据...');
    await ProjectMember.deleteMany({});

    if (!projects || projects.length === 0) {
        console.log('项目数据不存在，跳过项目成员初始化');
        return;
    }

    const staffList = await Staff.find({ status: { $in: ['Active', 'Probation'] } })
        .populate('department')
        .limit(50);

    if (staffList.length === 0) {
        console.log('没有可用的员工，跳过项目成员初始化');
        return;
    }

    // 过滤出可以参与项目的员工（排除CEO）
    const availableStaff = staffList.filter(staff => {
        const deptName = staff.department?.name || '';
        return deptName !== 'CEO';
    });

    if (availableStaff.length === 0) {
        console.log('没有可参与项目的员工，跳过项目成员初始化');
        return;
    }

    const projectMembers = [];
    const projectRoles = ['FD', 'BD', 'UI', 'QA', 'DevOps'];

    projects.forEach(project => {
        if (!project || !project._id) {
            return;
        }

        // 每个项目添加 3-6 个成员
        const memberCount = 3 + Math.floor(Math.random() * 4);
        const selectedStaff = [];

        // 随机选择不重复的员工
        while (selectedStaff.length < memberCount && selectedStaff.length < availableStaff.length) {
            const staff = availableStaff[Math.floor(Math.random() * availableStaff.length)];
            if (!selectedStaff.find(s => s._id.toString() === staff._id.toString())) {
                selectedStaff.push(staff);
            }
        }

        selectedStaff.forEach((staff, index) => {
            const deptName = staff.department?.name || '';

            // 根据员工的职位分配项目角色
            let role = 'FD'; // 默认角色
            if (staff.occupation === 'FD' || staff.occupation === 'BD' || staff.occupation === 'FSD') {
                role = staff.occupation === 'BD' ? 'BD' : 'FD';
            } else if (staff.occupation === 'UI') {
                role = 'UI';
            } else if (staff.occupation === 'QA') {
                role = 'QA';
            } else if (staff.occupation === 'DevOps') {
                role = 'DevOps';
            } else {
                // 其他职位随机分配项目角色
                role = projectRoles[Math.floor(Math.random() * projectRoles.length)];
            }

            projectMembers.push({
                projectId: project._id,
                staffId: staff._id,
                name: staff.name,
                department: deptName,
                occupation: staff.occupation,
                role: role,
                joinDate: new Date(2023, Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1)
            });
        });
    });

    await ProjectMember.insertMany(projectMembers);
    console.log(`已插入 ${projectMembers.length} 条项目成员数据`);
};

// 初始化Bug数据
const initBugs = async (projects, features) => {
    console.log('开始初始化Bug数据...');
    await Bug.deleteMany({});

    if (!projects || projects.length === 0) {
        console.log('项目数据不存在，跳过Bug初始化');
        return;
    }

    const staffList = await Staff.find({ status: { $in: ['Active', 'Probation'] } }).limit(50);
    const bugs = [];

    projects.forEach(project => {
        // 确保 project 有 _id
        if (!project || !project._id) {
            console.log('警告: 项目数据无效，跳过');
            return;
        }

        for (let i = 0; i < 3; i++) {
            const assignee = staffList[Math.floor(Math.random() * staffList.length)];
            const reporter = staffList[Math.floor(Math.random() * staffList.length)];
            const relatedFeature = features && features.length > 0 ? features[Math.floor(Math.random() * features.length)] : null;

            if (!assignee || !assignee._id || !reporter || !reporter._id) {
                console.log('警告: 员工数据无效，跳过');
                continue;
            }

            bugs.push({
                projectId: project._id,
                featureId: relatedFeature ? relatedFeature._id : null,
                featureName: relatedFeature ? relatedFeature.name : null,
                name: `Bug ${i + 1}`,
                module: `模块 ${Math.floor(i / 2) + 1}`,
                description: `Bug描述 ${i + 1}`,
                assigneeId: assignee._id,
                assigneeName: assignee.name,
                reportedBy: reporter._id,
                reportedByName: reporter.name,
                status: ['Open', 'Assigned', 'InProgress', 'Resolved', 'Closed', 'Reopened'][Math.floor(Math.random() * 6)],
                severity: ['Low', 'Medium', 'High', 'Critical'][Math.floor(Math.random() * 4)],
                createdDate: new Date(2023, Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1)
            });
        }
    });

    await Bug.insertMany(bugs);
    console.log(`已插入 ${bugs.length} 条Bug数据`);
};

// 主函数
const initDatabase = async () => {
    try {
        await connectDB();

        console.log('\n========== 开始初始化数据库 ==========\n');

        const [permissions, departments] = await Promise.all([
            initPermissions(),
            initDepartments()
        ]);

        await initDepartmentPermissions(departments, permissions);
        await initStaff(departments);
        const projects = await initProjects();
        await initProjectMembers(projects);
        const features = await initFeatures(projects);
        await initBugs(projects, features);

        console.log('\n========== 数据库初始化完成！ ==========\n');
        process.exit(0);
    } catch (error) {
        console.error('初始化数据库失败:', error);
        process.exit(1);
    }
};

initDatabase();
