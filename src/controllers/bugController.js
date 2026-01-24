const Bug = require("../models/Bug");
const mongoose = require("mongoose");

/**
 * @api {post} /oztf/api/v1/bug/list 获取 Bug 列表
 * @apiName BugGetList
 * @apiGroup Bug
 *
 * @apiBody {String} project_id 项目ID
 * @apiBody {String} user_id    用户ID
 * @apiBody {Number} [page=1]   页码
 *
 * @apiSuccess (200) {Object} meta
 * @apiSuccess (200) {String} meta.code
 * @apiSuccess (200) {String} meta.message
 * @apiSuccess (200) {Object} data
 * @apiSuccess (200) {Object[]} data.bugs Bug 列表
 * @apiSuccess (200) {Number} data.total  总数
 */
const getBugList = async (req, res) => {
  try {
    const { project_id, user_id, page = 1 } = req.body;

    if (!project_id || !user_id) {
      return res.error("Invalid request data: Field validation failed", "1024-C01", 400);
    }

    const pageSize = 13;
    const skip = (page - 1) * pageSize;

    const projectId = mongoose.Types.ObjectId.isValid(project_id)
      ? new mongoose.Types.ObjectId(project_id)
      : project_id;
    const query = { projectId: projectId };

    // 并行执行总数与列表查询，减少整体响应时间
    const [total, bugs] = await Promise.all([
      Bug.countDocuments(query),
      Bug.find(query).skip(skip).limit(pageSize).sort({ createdDate: -1 }).lean(),
    ]);

    const bugList = bugs.map((bug) => ({
      id: bug._id.toString(),
      name: bug.name,
      module: bug.module,
      description: bug.description,
      severity: bug.severity,
      assignee_id: bug.assigneeId.toString(),
      assignee_name: bug.assigneeName,
      status: bug.status,
      project_id: bug.projectId.toString(),
      feature_id: bug.featureId ? bug.featureId.toString() : null,
      feature_name: bug.featureName,
      created_date: bug.createdDate,
      reported_by: bug.reportedBy.toString(),
      reported_by_name: bug.reportedByName,
      estimated_hours: bug.estimatedHours,
      actual_hours: bug.actualHours,
      due_date: bug.dueDate,
      resolved_date: bug.resolvedDate,
      closed_date: bug.closedDate,
      steps_to_reproduce: bug.stepsToReproduce,
      expected_result: bug.expectedResult,
      actual_result: bug.actualResult,
    }));

    res.success({
        bugs: bugList,
        total,
    });
  } catch (error) {
    res.error();
  }
};

module.exports = {
  getBugList,
};
