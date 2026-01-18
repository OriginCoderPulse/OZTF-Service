const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    uid: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
    },
    roleIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Role",
        required: true,
        index: true,
      },
    ],
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
    collection: "OZTF_USERS",
  }
);

userSchema.index({ uid: 1 });
userSchema.index({ roleIds: 1 });

module.exports = mongoose.model("User", userSchema);
