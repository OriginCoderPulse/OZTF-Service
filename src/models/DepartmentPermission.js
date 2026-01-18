const mongoose = require("mongoose");

const departmentPermissionSchema = new mongoose.Schema(
  {
    departmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Department",
      required: true,
      index: true,
    },
    permissionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Permission",
      required: true,
      index: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    collection: "OZTF_DEPARTMENT_PERMISSIONS",
  }
);

departmentPermissionSchema.index({ departmentId: 1, permissionId: 1 }, { unique: true });

module.exports = mongoose.model("DepartmentPermission", departmentPermissionSchema);
