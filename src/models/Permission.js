const mongoose = require("mongoose");

const permissionSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      enum: ["DashBoard", "Finance", "Home", "Meet", "Project", "Staff", "Video"],
      index: true,
    },
    description: {
      type: String,
      default: "",
    },
    order: {
      type: Number,
      required: true,
      unique: true,
    },
    icon: {
      type: mongoose.Schema.Types.Mixed, // 支持字符串或数组
      required: false,
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
    collection: "OZTF_PERMISSIONS",
  }
);

permissionSchema.index({ name: 1 }, { unique: true });
permissionSchema.index({ order: 1 }, { unique: true });

module.exports = mongoose.model("Permission", permissionSchema);
