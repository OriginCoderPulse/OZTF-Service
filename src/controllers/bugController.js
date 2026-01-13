const Bug = require('../models/Bug');
const mongoose = require('mongoose');

// 获取Bug列表
const getBugList = async (req, res) => {
  try {
    const { project_id, user_id, page = 1 } = req.body;

    if (!project_id || !user_id) {
      return res.status(400).json({
        meta: {
          code: '1024-C01',
          message: 'Invalid request data: Field validation failed'
        }
      });
    }

    const pageSize = 13;
    const skip = (page - 1) * pageSize;

    const projectId = mongoose.Types.ObjectId.isValid(project_id) 
      ? new mongoose.Types.ObjectId(project_id) 
      : project_id;
    const query = { projectId: projectId };

    const total = await Bug.countDocuments(query);
    const bugs = await Bug.find(query)
      .skip(skip)
      .limit(pageSize)
      .sort({ createdDate: -1 });

    const bugList = bugs.map(bug => ({
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
      actual_result: bug.actualResult
    }));

    res.json({
      meta: {
        code: '1024-S200',
        message: 'Success'
      },
      data: {
        bugs: bugList,
        total
      }
    });
  } catch (error) {
    console.error('Get bug list error:', error);
    res.status(500).json({
      meta: {
        code: '1024-E01',
        message: 'Network error: Backend service unavailable'
      }
    });
  }
};

module.exports = {
  getBugList
};
