const mongoose = require("mongoose");

const bugSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    module: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      default: "",
    },
    severity: {
      type: String,
      enum: ["Low", "Medium", "High", "Critical"],
      default: "Medium",
    },
    assigneeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Staff",
      required: true,
      index: true,
    },
    assigneeName: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: [
        "Open",
        "InProgress",
        "PendingVerification",
        "PendingRelease",
        "Resolved",
        "Closed",
        "Reopened",
      ],
      default: "Open",
    },
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      required: true,
      index: true,
    },
    featureId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Feature",
    },
    featureName: {
      type: String,
    },
    createdDate: {
      type: Date,
      default: Date.now,
    },
    reportedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Staff",
      required: true,
    },
    reportedByName: {
      type: String,
      required: true,
    },
    estimatedHours: {
      type: Number,
      default: 0,
    },
    actualHours: {
      type: Number,
      default: 0,
    },
    dueDate: {
      type: Date,
    },
    resolvedDate: {
      type: Date,
    },
    closedDate: {
      type: Date,
    },
    stepsToReproduce: {
      type: String,
    },
    expectedResult: {
      type: String,
    },
    actualResult: {
      type: String,
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
    collection: "OZTF_BUGS",
  }
);

bugSchema.index({ projectId: 1 });
bugSchema.index({ assigneeId: 1 });
bugSchema.index({ status: 1 });

module.exports = mongoose.model("Bug", bugSchema);
