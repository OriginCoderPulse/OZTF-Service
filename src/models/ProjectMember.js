const mongoose = require("mongoose");

const projectMemberSchema = new mongoose.Schema(
  {
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      required: true,
      index: true,
    },
    staffId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Staff",
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
    },
    department: {
      type: String,
      required: true,
    },
    occupation: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      enum: ["FD", "BD", "UI", "QA", "DevOps"],
      required: true,
    },
    joinDate: {
      type: Date,
      default: Date.now,
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
    collection: "OZTF_PROJECT_MEMBERS",
  }
);

projectMemberSchema.index({ projectId: 1, staffId: 1 }, { unique: true });
projectMemberSchema.index({ staffId: 1 });

module.exports = mongoose.model("ProjectMember", projectMemberSchema);
