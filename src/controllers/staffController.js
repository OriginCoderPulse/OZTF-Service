const Staff = require("../models/Staff");
const mongoose = require("mongoose");

/**
 * @api {post} /oztf/api/v1/staff/info 获取员工信息列表
 * @apiName StaffGetInfo
 * @apiGroup Staff
 *
 * @apiBody {Number} [current_page=1] 页码
 * @apiBody {String} [user_id]        当前用户ID
 * @apiBody {String} [name]           员工姓名（模糊匹配）
 * @apiBody {String} [department]     部门名称
 * @apiBody {String} [status]         员工状态
 *
 * @apiSuccess (200) {Object} meta
 * @apiSuccess (200) {String} meta.code
 * @apiSuccess (200) {String} meta.message
 * @apiSuccess (200) {Object} data
 * @apiSuccess (200) {Object[]} data.data_list 员工列表
 */
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
      join_date,
    } = req.body;

    const pageSize = 15;
    const skip = (current_page - 1) * pageSize;

    // 构建查询条件
    const query = {};

    if (name) {
      query.name = { $regex: name, $options: "i" };
    }
    if (department) {
      // department 现在是 ObjectId，需要查找对应的部门
      const Department = require("../models/Department");
      const dept = await Department.findOne({ name: department });
      if (dept) {
        query.department = dept._id;
      }
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
        $lt: new Date(date.setHours(23, 59, 59, 999)),
      };
    }

    // 并行执行统计和列表查询，减少网络往返，提高响应速度
    const [total, activeStaff, probationStaff, staffList] = await Promise.all([
      Staff.countDocuments(query),
      Staff.countDocuments({ ...query, status: "Active" }),
      Staff.countDocuments({ ...query, status: "Probation" }),
      Staff.find(query)
        .populate("department")
        .skip(skip)
        .limit(pageSize)
        .sort({ createdAt: -1 })
        .lean(),
    ]);

    // 排序逻辑：CEO永远在第一个，离职的放在末尾
    const sortedStaffList = [...staffList].sort((a, b) => {
      const aDeptName = a.department?.name || "";
      const bDeptName = b.department?.name || "";
      const aIsCeo = aDeptName === "CEO" && a.occupation === "CEO";
      const bIsCeo = bDeptName === "CEO" && b.occupation === "CEO";
      const aIsInactive = a.status === "Inactive";
      const bIsInactive = b.status === "Inactive";

      // CEO 永远在第一个
      if (aIsCeo && !bIsCeo) return -1;
      if (!aIsCeo && bIsCeo) return 1;

      // 离职的放在末尾
      if (aIsInactive && !bIsInactive) return 1;
      if (!aIsInactive && bIsInactive) return -1;

      // 其他保持原有顺序（按创建时间倒序）
      return 0;
    });

    const dataList = sortedStaffList.map((staff) => {
      const deptName = staff.department?.name || "";
      return {
        id: staff._id.toString(),
        name: staff.name,
        department: deptName,
        occupation: staff.occupation,
        status: staff.status,
        service_date: staff.serviceDate,
      };
    });

    res.success({
      data_list: dataList,
      total,
      active_staff: activeStaff,
      probation_staff: probationStaff,
    });
  } catch (error) {
    res.error();
  }
};

/**
 * @api {post} /oztf/api/v1/staff/developers 获取开发人员列表
 * @apiName StaffGetDevelopers
 * @apiGroup Staff
 *
 * @apiSuccess (200) {Object} meta
 * @apiSuccess (200) {String} meta.code
 * @apiSuccess (200) {String} meta.message
 * @apiSuccess (200) {Object} data
 * @apiSuccess (200) {Object[]} data.pmList      PM 列表
 * @apiSuccess (200) {Object[]} data.developers  开发人员列表
 */
const getStaffDevelopers = async (req, res) => {
  try {
    const Department = require("../models/Department");
    const technicalDept = await Department.findOne({ name: "Technical" });
    const productDept = await Department.findOne({ name: "Product" });

    const departmentIds = [];
    if (technicalDept) departmentIds.push(technicalDept._id);
    if (productDept) departmentIds.push(productDept._id);

    // 并行查询PM列表和开发人员列表
    const [pmList, developers] = await Promise.all([
      // 查询所有PM
      Staff.find({
        occupation: "PM",
        status: { $in: ["Active", "Probation"] },
      })
        .populate("department")
        .select("name occupation department")
        .sort({ name: 1 })
        .lean(),
      // 查询产品部和技术部的人员（排除PM职位）
      Staff.find({
        department: { $in: departmentIds },
        occupation: { $ne: "PM" },
        status: { $in: ["Active", "Probation"] },
      })
        .populate("department")
        .select("name occupation department")
        .sort({ name: 1 })
        .lean(),
    ]);

    // 格式化数据
    const formatStaff = (staff) => {
      const deptName = staff.department?.name || "";
      return {
        id: staff._id.toString(),
        name: staff.name,
        occupation: staff.occupation,
        department: deptName,
      };
    };

    res.success({
      pmList: pmList.map(formatStaff),
      developers: developers.map(formatStaff),
    });
  } catch (error) {
    res.error();
  }
};

/**
 * @api {post} /oztf/api/v1/staff/change-status 修改员工状态
 * @apiName StaffChangeStatus
 * @apiGroup Staff
 *
 * @apiBody {String} staffID 员工ID
 * @apiBody {String="Active","Probation","Inactive"} status 新状态
 *
 * @apiSuccess (200) {Object} meta
 * @apiSuccess (200) {String} meta.code
 * @apiSuccess (200) {String} meta.message
 * @apiSuccess (200) {Object} data
 * @apiSuccess (200) {String} data.id     员工ID
 * @apiSuccess (200) {String} data.status 新状态
 */
const changeStaffStatus = async (req, res) => {
  try {
    const { staffID, status } = req.body;

    if (!staffID || !status) {
      return res.error("Invalid request data: Field validation failed", "1024-C01", 400);
    }

    if (!["Active", "Probation", "Inactive"].includes(status)) {
      return res.error("Invalid status value", "1024-C01", 400);
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
      return res.error("Staff not found", "1024-C01", 404);
    }

    res.success({
      id: staff._id.toString(),
      status: staff.status,
    });
  } catch (error) {
    res.error();
  }
};

module.exports = {
  getStaffInfo,
  getStaffDevelopers,
  changeStaffStatus,
};
