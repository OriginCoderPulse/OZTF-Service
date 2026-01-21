const Project = require("../models/Project");
const ProjectMember = require("../models/ProjectMember");
const Staff = require("../models/Staff");
const Feature = require("../models/Feature");
const mongoose = require("mongoose");
const ExcelJS = require("exceljs");
const path = require("path");
const fs = require("fs");

/**
 * @api {post} /oztf/api/v1/project/detail 获取项目详情
 * @apiName ProjectGetDetail
 * @apiGroup Project
 *
 * @apiBody {String} project_id 项目ID
 * @apiBody {String} user_id    用户ID
 *
 * @apiSuccess (200) {Object} meta
 * @apiSuccess (200) {String} meta.code
 * @apiSuccess (200) {String} meta.message
 * @apiSuccess (200) {Object} data              项目详情
 */
const getProjectDetail = async (req, res) => {
  try {
    const { project_id, user_id } = req.body;

    if (!project_id || !user_id) {
      return res.status(400).json({
        meta: {
          code: "1024-C01",
          message: "Invalid request data: Field validation failed",
        },
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
          code: "1024-C01",
          message: "Project not found",
        },
      });
    }

    // 获取项目成员（lean + 不使用 populate，减少多余查询）
    // 只返回产品部和技术部的人员（排除PM职位），以及BD和FD职位的人员
    const members = await ProjectMember.find({
      projectId: projectId,
      $or: [
        {
          department: { $in: ["Product", "Technical"] },
          occupation: { $ne: "PM" },
        },
        {
          occupation: { $in: ["BD", "FD"] },
        },
      ],
    }).lean();

    // 获取成员详细信息
    const memberDetails = members.map((member) => ({
      staff_id: member.staffId.toString(),
      name: member.name,
      department: member.department,
      occupation: member.occupation,
      role: member.role,
      join_date: member.joinDate ? member.joinDate.toISOString() : null,
    }));

    // 判断用户角色
    let userRole = "Developer"; // 默认角色
    let isProjectManager = false;
    let isTester = false;
    let projectFeatureRole = "D"; // 功能角色：M（项目负责人）或 D（开发者）
    let projectQARole = "D"; // QA角色：M（项目负责人或QA）或 D（其他）

    const userId = mongoose.Types.ObjectId.isValid(user_id)
      ? new mongoose.Types.ObjectId(user_id)
      : user_id;
    if (project.managerId.toString() === userId.toString()) {
      userRole = "Manager";
      isProjectManager = true;
      projectFeatureRole = "M"; // 项目负责人对功能有管理权限
      projectQARole = "M"; // 项目负责人对Bug有管理权限
    } else {
      // 并行检查是否是测试人员（通过职业或项目成员角色）
      const [staff, member] = await Promise.all([
        Staff.findById(userId).lean(),
        ProjectMember.findOne({ projectId: projectId, staffId: userId }).lean(),
      ]);

      if (member && member.role === "QA") {
        isTester = true;
        projectQARole = "M"; // QA对Bug有管理权限
      } else if (staff && staff.occupation === "QA") {
        isTester = true;
        projectQARole = "M"; // QA对Bug有管理权限
      }
    }

    res.json({
      meta: {
        code: "1024-S200",
        message: "Success",
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
        is_tester: isTester,
        project_feature_role: projectFeatureRole,
        project_qa_role: projectQARole,
      },
    });
  } catch (error) {
    console.error("Get project detail error:", error);
    res.status(500).json({
      meta: {
        code: "1024-E01",
        message: "Network error: Backend service unavailable",
      },
    });
  }
};

/**
 * @api {post} /oztf/api/v1/project/add 新增项目
 * @apiName ProjectAdd
 * @apiGroup Project
 *
 * @apiBody {String} name        项目名称
 * @apiBody {String} start_date  开始日期
 * @apiBody {String} end_date    结束日期
 * @apiBody {String} priority    优先级
 * @apiBody {String} manager_id  项目负责人ID
 * @apiBody {Object[]} [members] 项目成员
 *
 * @apiSuccess (200) {Object} meta
 * @apiSuccess (200) {String} meta.code
 * @apiSuccess (200) {String} meta.message
 * @apiSuccess (200) {Object} data
 * @apiSuccess (200) {String} data.id   项目ID
 * @apiSuccess (200) {String} data.name 项目名称
 */
const addProject = async (req, res) => {
  try {
    const { name, start_date, end_date, priority, manager_id, members } = req.body;

    if (!name || !start_date || !end_date || !priority || !manager_id) {
      return res.status(400).json({
        meta: {
          code: "1024-C01",
          message: "Invalid request data: Field validation failed",
        },
      });
    }

    // 获取项目经理信息
    const managerId = mongoose.Types.ObjectId.isValid(manager_id)
      ? new mongoose.Types.ObjectId(manager_id)
      : manager_id;
    const manager = await Staff.findById(managerId).populate("department");
    if (!manager) {
      return res.status(404).json({
        meta: {
          code: "1024-C01",
          message: "Manager not found",
        },
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
      status: "Planning",
      progress: 0,
    });

    await project.save();

    // 添加项目成员
    if (members && members.length > 0) {
      const memberPromises = members.map(async (member) => {
        const staffId = mongoose.Types.ObjectId.isValid(member.staff_id)
          ? new mongoose.Types.ObjectId(member.staff_id)
          : member.staff_id;
        const staff = await Staff.findById(staffId).populate("department");
        if (staff && staff.department) {
          // 获取部门名称（必须是 ObjectId 引用）
          const staffDept = staff.department.name || "";

          // 映射角色：确保使用新的角色代码
          let role = member.role;

          // 验证角色是否在允许的范围内
          if (!["FD", "BD", "UI", "QA", "DevOps"].includes(role)) {
            role = "FD"; // 默认值
          }

          const projectMember = new ProjectMember({
            projectId: project._id,
            staffId: staffId,
            name: staff.name,
            department: staffDept,
            occupation: staff.occupation,
            role: role,
          });
          return projectMember.save();
        }
        return null;
      });

      await Promise.all(memberPromises);
    }

    res.json({
      meta: {
        code: "1024-S200",
        message: "Success",
      },
      data: {
        id: project._id.toString(),
        name: project.name,
      },
    });
  } catch (error) {
    console.error("Add project error:", error);
    res.status(500).json({
      meta: {
        code: "1024-E01",
        message: "Network error: Backend service unavailable",
      },
    });
  }
};

/**
 * @api {post} /oztf/api/v1/project/getRole 获取用户在项目中的角色
 * @apiName ProjectGetRole
 * @apiGroup Project
 *
 * @apiBody {String} uid        用户ID
 * @apiBody {String} project_id 项目ID
 *
 * @apiSuccess (200) {Object} meta
 * @apiSuccess (200) {String} meta.code
 * @apiSuccess (200) {String} meta.message
 * @apiSuccess (200) {Object} data
 * @apiSuccess (200) {String="M","D"} data.projectRole 角色（M: 管理者，D: 开发者）
 */
const getProjectRole = async (req, res) => {
  try {
    const { uid, project_id } = req.body;

    if (!uid || !project_id) {
      return res.status(400).json({
        meta: {
          code: "1024-C01",
          message: "Invalid request data: Field validation failed",
        },
      });
    }

    const projectId = mongoose.Types.ObjectId.isValid(project_id)
      ? new mongoose.Types.ObjectId(project_id)
      : project_id;
    const userId = mongoose.Types.ObjectId.isValid(uid) ? new mongoose.Types.ObjectId(uid) : uid;

    // 查询项目
    const project = await Project.findById(projectId).lean();
    if (!project) {
      return res.status(404).json({
        meta: {
          code: "1024-C01",
          message: "Project not found",
        },
      });
    }

    // 判断用户是否是项目负责人
    const isManager = project.managerId.toString() === userId.toString();
    const projectRole = isManager ? "M" : "D";

    res.json({
      meta: {
        code: "1024-S200",
        message: "Success",
      },
      data: {
        projectRole,
      },
    });
  } catch (error) {
    console.error("Get project role error:", error);
    res.status(500).json({
      meta: {
        code: "1024-E01",
        message: "Network error: Backend service unavailable",
      },
    });
  }
};

/**
 * @api {post} /oztf/api/v1/project/feature/export 导出项目功能列表为 Excel
 * @apiName ProjectExportFeatures
 * @apiGroup Project
 *
 * @apiBody {String} projectId 项目ID
 *
 * @apiSuccess (200) {File} Excel 文件流
 */
const exportProjectFeatures = async (req, res) => {
  try {
    const { projectId } = req.body;

    if (!projectId) {
      return res.status(400).json({
        meta: {
          code: "1024-C01",
          message: "Invalid request data: Field validation failed",
        },
      });
    }

    const projectIdObj = mongoose.Types.ObjectId.isValid(projectId)
      ? new mongoose.Types.ObjectId(projectId)
      : projectId;

    // 查询项目信息
    const project = await Project.findById(projectIdObj).lean();
    if (!project) {
      return res.status(404).json({
        meta: {
          code: "1024-C01",
          message: "Project not found",
        },
      });
    }

    // 查询所有功能列表
    const features = await Feature.find({ projectId: projectIdObj })
      .sort({ createdDate: -1 })
      .lean();

    // 创建Excel工作簿
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("功能列表");

    // 设置列标题
    worksheet.columns = [
      { header: "功能名称", key: "name", width: 30 },
      { header: "模块", key: "module", width: 20 },
      { header: "描述", key: "description", width: 40 },
      { header: "优先级", key: "priority", width: 15 },
      { header: "状态", key: "status", width: 15 },
      { header: "负责人", key: "assigneeName", width: 20 },
      { header: "创建日期", key: "createdDate", width: 20 },
      { header: "开始日期", key: "startDate", width: 20 },
      { header: "截止日期", key: "dueDate", width: 20 },
      { header: "完成日期", key: "completedDate", width: 20 },
      { header: "预估工时", key: "estimatedHours", width: 15 },
      { header: "实际工时", key: "actualHours", width: 15 },
    ];

    // 设置表头样式
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFE0E0E0" },
    };

    // 添加数据
    features.forEach((feature) => {
      worksheet.addRow({
        name: feature.name || "",
        module: feature.module || "",
        description: feature.description || "",
        priority: feature.priority || "",
        status: feature.status || "",
        assigneeName: feature.assigneeName || "",
        createdDate: feature.createdDate
          ? new Date(feature.createdDate).toLocaleString("zh-CN")
          : "",
        startDate: feature.startDate ? new Date(feature.startDate).toLocaleString("zh-CN") : "",
        dueDate: feature.dueDate ? new Date(feature.dueDate).toLocaleString("zh-CN") : "",
        completedDate: feature.completedDate
          ? new Date(feature.completedDate).toLocaleString("zh-CN")
          : "",
        estimatedHours: feature.estimatedHours || 0,
        actualHours: feature.actualHours || 0,
      });
    });

    // 确保临时目录存在
    const tempDir = path.join(__dirname, "../../public/temp");
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    // 生成文件名：Project_项目名称_功能列表.xlsx
    const projectName = project.name || "未知项目";
    const fileName = `Project_${projectName}_功能列表.xlsx`;
    const filePath = path.join(tempDir, fileName);

    // 写入文件
    await workbook.xlsx.writeFile(filePath);

    // 设置响应头，流式返回文件
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader("Content-Disposition", `attachment; filename="${encodeURIComponent(fileName)}"`);

    // 读取文件并流式返回
    const fileStream = fs.createReadStream(filePath);

    // 文件流结束后，删除临时文件
    fileStream.on("end", () => {
      // 延迟删除，确保文件已完全发送
      setTimeout(() => {
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      }, 1000); // 1秒后删除
    });

    fileStream.on("error", (error) => {
      console.error("文件流错误:", error);
      // 即使出错也尝试删除文件
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
      if (!res.headersSent) {
        res.status(500).json({
          meta: {
            code: "1024-E01",
            message: "Network error: Backend service unavailable",
          },
        });
      }
    });

    // 将文件流管道到响应
    fileStream.pipe(res);
  } catch (error) {
    console.error("Export project features error:", error);
    res.status(500).json({
      meta: {
        code: "1024-E01",
        message: "Network error: Backend service unavailable",
      },
    });
  }
};

module.exports = {
  getProjectDetail,
  addProject,
  getProjectRole,
  exportProjectFeatures,
};
