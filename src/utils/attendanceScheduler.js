const schedule = require("node-schedule");
const Attendance = require("../models/Attendance");
const Staff = require("../models/Staff");

// 定时任务执行规则：每天 10:00 执行
const JOB_RULE = "0 10 * * *"; // 每天 10:00

// 定时任务实例
let dailyJob = null;

/**
 * 为所有在职员工创建当天的考勤记录
 * 默认打卡时间为空，考勤状态为空
 */
const createDailyAttendanceRecords = async () => {
  try {
    // 获取所有在职员工（Active 和 Probation 状态）
    const activeStaff = await Staff.find({
      status: { $in: ["Active", "Probation"] },
    }).select("_id").lean();

    if (activeStaff.length === 0) {
      return;
    }

    // 获取今天的日期（00:00:00）
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // 为每个员工创建考勤记录
    const attendancePromises = activeStaff.map(async (staff) => {
      try {
        // 检查是否已存在当天的考勤记录
        const existingRecord = await Attendance.findOne({
          staffId: staff._id,
          date: today,
        });

        // 如果已存在，跳过
        if (existingRecord) {
          return null;
        }

        // 创建新的考勤记录
        const attendance = new Attendance({
          staffId: staff._id,
          date: today,
          clockIn: {
            time: null,
            status: null,
          },
          clockOut: {
            time: null,
            status: null,
          },
        });

        return attendance.save();
      } catch (error) {
        // 单个员工创建失败不影响其他员工
        return null;
      }
    });

    // 等待所有记录创建完成
    await Promise.all(attendancePromises);
  } catch (error) {
    // 定时任务失败不影响系统运行
  }
};

/**
 * 为指定员工创建指定日期的考勤记录
 * @param {String|ObjectId} staffId - 员工ID
 * @param {Date} date - 日期（可选，默认为今天）
 */
const createAttendanceRecordForStaff = async (staffId, date = null) => {
  try {
    const targetDate = date || new Date();
    targetDate.setHours(0, 0, 0, 0);

    // 检查是否已存在考勤记录
    const existingRecord = await Attendance.findOne({
      staffId: staffId,
      date: targetDate,
    });

    if (existingRecord) {
      return existingRecord;
    }

    // 创建新的考勤记录
    const attendance = new Attendance({
      staffId: staffId,
      date: targetDate,
      clockIn: {
        time: null,
        status: null,
      },
      clockOut: {
        time: null,
        status: null,
      },
    });

    return await attendance.save();
  } catch (error) {
    return null;
  }
};

/**
 * 启动定时任务
 */
const startDailyScheduler = () => {
  if (dailyJob) {
    // 定时任务已经在运行
    return;
  }

  // 使用 node-schedule 创建定时任务
  dailyJob = schedule.scheduleJob(JOB_RULE, () => {
    createDailyAttendanceRecords();
  });

  // 立即执行一次（用于测试或初始化）
  // createDailyAttendanceRecords();
};

/**
 * 停止定时任务
 */
const stopDailyScheduler = () => {
  if (dailyJob) {
    dailyJob.cancel();
    dailyJob = null;
  }
};

/**
 * 初始化定时任务
 * 在服务器启动时调用
 */
const initializeAttendanceScheduler = async () => {
  try {
    startDailyScheduler();
  } catch (error) {
    // 初始化失败不影响系统运行
  }
};

module.exports = {
  createDailyAttendanceRecords,
  createAttendanceRecordForStaff,
  startDailyScheduler,
  stopDailyScheduler,
  initializeAttendanceScheduler,
};
