const mongoose = require("mongoose");

const staffSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    department: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Department",
      required: true,
      index: true,
    },
    occupation: {
      type: String,
      enum: ["CEO", "ACT", "FD", "BD", "FSD", "QA", "DevOps", "HR", "HRBP", "PM", "UI"],
      required: true,
    },
    status: {
      type: String,
      enum: ["Active", "Probation", "Inactive"],
      default: "Probation",
    },
    serviceDate: {
      type: Date,
      required: true,
    },
    salary: {
      type: Number,
      default: 0,
    },
    gender: {
      type: String,
      enum: ["男", "女"],
      default: "男",
    },
    age: {
      type: Number,
      default: 25,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    collection: "OZTF_STAFF",
  }
);

// 索引优化：覆盖常用查询条件，提升 staff 列表与统计接口性能
staffSchema.index({ department: 1 });
staffSchema.index({ status: 1 });
staffSchema.index({ department: 1, status: 1 });
staffSchema.index({ serviceDate: 1 });
staffSchema.index({ salary: 1 });
staffSchema.index({ gender: 1 });

// 职位与部门的关联映射
const occupationDepartmentMap = {
  CEO: ["CEO"],
  ACT: ["Finance"],
  FD: ["Finance"],
  BD: ["RMD"],
  HR: ["RMD"],
  HRBP: ["RMD"],
  FSD: ["Technical"],
  QA: ["Technical"],
  DevOps: ["Technical"],
  PM: ["Product"],
  UI: ["Product"],
};

// 验证职位与部门是否匹配
staffSchema.pre("save", async function (next) {
  const Department = mongoose.model("Department");

  // 获取员工部门信息
  let department;
  if (this.department && this.department.name) {
    // 如果已经populate了
    department = this.department;
  } else {
    // 如果没有populate，需要查询
    department = await Department.findById(this.department);
  }

  if (!department) {
    return next(new Error("部门不存在"));
  }

  const departmentName = department.name;
  const occupation = this.occupation;

  // 检查职位是否与部门匹配
  const allowedDepartments = occupationDepartmentMap[occupation];
  if (!allowedDepartments || !allowedDepartments.includes(departmentName)) {
    return next(
      new Error(
        `职位 ${occupation} 不能属于 ${departmentName} 部门。允许的部门：${allowedDepartments ? allowedDepartments.join(", ") : "无"}`
      )
    );
  }

  // CEO特殊验证：确保只有一个CEO（超级管理员）
  if (occupation === "CEO" && departmentName === "CEO") {
    // 检查是否已存在其他CEO
    const existingCeo = await this.constructor.findOne({
      department: department._id,
      occupation: "CEO",
      _id: { $ne: this._id },
    });

    if (existingCeo) {
      return next(new Error("系统中只能有一个CEO（超级管理员）"));
    }
  }

  next();
});

module.exports = mongoose.model("Staff", staffSchema);
