const Attendance = require("../models/Attendance");
const mongoose = require("mongoose");

/**
 * @api {post} /oztf/api/v1/attendance/getDailyRecord 获取员工当天考勤记录
 * @apiName AttendanceGetDailyRecord
 * @apiGroup Attendance
 *
 * @apiBody {String} staffId 员工ID
 * @apiBody {String} date    日期 (格式: YYYY-MM-DD)
 *
 * @apiSuccess (200) {Object} meta
 * @apiSuccess (200) {String} meta.code
 * @apiSuccess (200) {String} meta.message
 * @apiSuccess (200) {Object|null} data 考勤记录数据，如果没有记录则返回null
 * @apiSuccess (200) {Object} data.clockIn 上班打卡信息
 * @apiSuccess (200) {Date|null} data.clockIn.time 上班打卡时间
 * @apiSuccess (200) {String|null} data.clockIn.status 上班考勤状态
 * @apiSuccess (200) {Object} data.clockOut 下班打卡信息
 * @apiSuccess (200) {Date|null} data.clockOut.time 下班打卡时间
 * @apiSuccess (200) {String|null} data.clockOut.status 下班考勤状态
 */
const getDailyRecord = async (req, res) => {
  try {
    const { staffId, date } = req.body;

    if (!staffId || !date) {
      return res.error("Invalid request data: staffId and date are required", "1024-C01", 400);
    }

    // 验证 staffId 格式
    const staffIdObj = mongoose.Types.ObjectId.isValid(staffId)
      ? new mongoose.Types.ObjectId(staffId)
      : null;

    if (!staffIdObj) {
      return res.error("Invalid staffId format", "1024-C01", 400);
    }

    // 解析日期，设置为当天的 00:00:00
    const dateObj = new Date(date);
    if (isNaN(dateObj.getTime())) {
      return res.error("Invalid date format. Expected format: YYYY-MM-DD", "1024-C01", 400);
    }

    // 设置为当天的开始时间 (00:00:00)
    const startOfDay = new Date(dateObj);
    startOfDay.setHours(0, 0, 0, 0);

    // 查询考勤记录
    const attendance = await Attendance.findOne({
      staffId: staffIdObj,
      date: startOfDay,
    }).lean();

    if (!attendance) {
      // 如果没有找到记录，返回null
      return res.success(null);
    }

    // 格式化返回数据，只返回考勤相关数据
    res.success({
      clockIn: {
        time: attendance.clockIn.time,
        status: attendance.clockIn.status,
      },
      clockOut: {
        time: attendance.clockOut.time,
        status: attendance.clockOut.status,
      },
    });
  } catch (error) {
    res.error();
  }
};

module.exports = {
  getDailyRecord,
};
