const mongoose = require("mongoose");

const attendanceSchema = new mongoose.Schema(
  {
    staffId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Staff",
      required: true,
      index: true,
    },
    clockIn: {
      time: {
        type: Date,
        default: null,
      },
      status: {
        type: String,
        enum: [
          // 考勤结果状态
          "PRESENT",
          "LATE",
          "LEAVE_EARLY",
          "ABSENT",
          "SUPPLEMENT",
          // 请假状态
          "ANNUAL_LEAVE",
          "SICK_LEAVE",
          "MATERNITY_LEAVE",
          "PATERNITY_LEAVE",
          "MARRIAGE_LEAVE",
          "FUNERAL_LEAVE",
          "AFFAIR_LEAVE",
          "WORK_INJURY_LEAVE",
          // 外出与公务状态
          "BUSINESS_TRIP",
          "FIELD_WORK",
          "REMOTE_WORK",
          "OUTGOING",
        ],
        default: null,
      },
    },
    clockOut: {
      time: {
        type: Date,
        default: null,
      },
      status: {
        type: String,
        enum: [
          // 考勤结果状态
          "PRESENT",
          "LATE",
          "LEAVE_EARLY",
          "ABSENT",
          "SUPPLEMENT",
          // 请假状态
          "ANNUAL_LEAVE",
          "SICK_LEAVE",
          "MATERNITY_LEAVE",
          "PATERNITY_LEAVE",
          "MARRIAGE_LEAVE",
          "FUNERAL_LEAVE",
          "AFFAIR_LEAVE",
          "WORK_INJURY_LEAVE",
          // 外出与公务状态
          "BUSINESS_TRIP",
          "FIELD_WORK",
          "REMOTE_WORK",
          "OUTGOING",
        ],
        default: null,
      },
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
    collection: "OZTF_ATTENDANCE",
  }
);

// 索引优化：覆盖常用查询条件
attendanceSchema.index({ staffId: 1, date: 1 }, { unique: true }); // 确保每个员工每天只有一条考勤记录
attendanceSchema.index({ date: 1 });
attendanceSchema.index({ staffId: 1 });

// 更新 updatedAt 字段
attendanceSchema.pre("save", function (next) {
  this.updatedAt = new Date();
  next();
});

module.exports = mongoose.model("Attendance", attendanceSchema);
