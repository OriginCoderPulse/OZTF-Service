const Feature = require("../models/Feature");
const mongoose = require("mongoose");

/**
 * @api {post} /oztf/api/v1/feature/list 获取功能列表
 * @apiName FeatureGetList
 * @apiGroup Feature
 *
 * @apiBody {String} project_id 项目ID
 * @apiBody {String} user_id    用户ID
 * @apiBody {Number} [page=1]   页码
 *
 * @apiSuccess (200) {Object} meta
 * @apiSuccess (200) {String} meta.code
 * @apiSuccess (200) {String} meta.message
 * @apiSuccess (200) {Object} data
 * @apiSuccess (200) {Object[]} data.features 功能列表
 * @apiSuccess (200) {Number} data.total      总数
 */
const getFeatureList = async (req, res) => {
  try {
    const { project_id, user_id, page = 1 } = req.body;

    if (!project_id || !user_id) {
      return res.status(400).json({
        meta: {
          code: "1024-C01",
          message: "Invalid request data: Field validation failed",
        },
      });
    }

    const pageSize = 13;
    const skip = (page - 1) * pageSize;

    const projectId = mongoose.Types.ObjectId.isValid(project_id)
      ? new mongoose.Types.ObjectId(project_id)
      : project_id;
    const query = { projectId: projectId };

    // 并行执行总数与列表查询，降低总耗时
    const [total, features] = await Promise.all([
      Feature.countDocuments(query),
      Feature.find(query).skip(skip).limit(pageSize).sort({ createdDate: -1 }).lean(),
    ]);

    const featureList = features.map((feature) => ({
      id: feature._id.toString(),
      name: feature.name,
      module: feature.module,
      description: feature.description,
      priority: feature.priority,
      assignee_id: feature.assigneeId.toString(),
      assignee_name: feature.assigneeName,
      status: feature.status,
      project_id: feature.projectId.toString(),
      created_date: feature.createdDate,
      estimated_hours: feature.estimatedHours,
      actual_hours: feature.actualHours,
      start_date: feature.startDate,
      due_date: feature.dueDate,
      completed_date: feature.completedDate,
    }));

    res.json({
      meta: {
        code: "1024-S200",
        message: "Success",
      },
      data: {
        features: featureList,
        total,
      },
    });
  } catch (error) {
    console.error("Get feature list error:", error);
    res.status(500).json({
      meta: {
        code: "1024-E01",
        message: "Network error: Backend service unavailable",
      },
    });
  }
};

module.exports = {
  getFeatureList,
};
