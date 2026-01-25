const MeetRoom = require("../models/MeetRoom");
const schedule = require("node-schedule");
let broadcastMeetStatusChange = null; // 延迟加载，避免循环依赖

// 存储需要更新状态的会议ID集合
const pendingMeetings = new Set();

// 全局定时任务
let globalJob = null;

// 定时任务执行规则：每秒执行一次
const JOB_RULE = "* * * * * *"; // 每秒

/**
 * 更新单个会议状态
 * @returns {Promise<object|null>} 如果有状态变更，返回变更信息；否则返回 null
 */
const updateMeetingStatus = async (meetingId) => {
  try {
    const meeting = await MeetRoom.findById(meetingId);
    if (!meeting) {
      pendingMeetings.delete(meetingId.toString());
      return null;
    }

    // 如果会议已取消，从列表中移除
    if (meeting.status === "Cancelled") {
      pendingMeetings.delete(meetingId.toString());
      return null;
    }

    const now = new Date();
    const startTime = new Date(meeting.startTime);
    const endTime = new Date(startTime.getTime() + meeting.duration * 60 * 1000);

    let newStatus = meeting.status;

    // 根据当前时间判断状态
    if (now < startTime) {
      newStatus = "Pending";
    } else if (now >= startTime && now < endTime) {
      newStatus = "InProgress";
    } else if (now >= endTime) {
      newStatus = "Concluded";
    }

    // 只有当状态发生变化时才更新
    if (newStatus !== meeting.status) {
      const oldStatus = meeting.status;

      await MeetRoom.findByIdAndUpdate(meeting._id, {
        status: newStatus,
        updatedAt: now,
      });

      // 如果状态变为 'InProgress'，确保会议仍在待更新列表中（继续检测直到结束）
      if (newStatus === "InProgress") {
        pendingMeetings.add(meetingId.toString());
      }

      // 如果会议已结束，从待更新列表中移除
      if (newStatus === "Concluded") {
        pendingMeetings.delete(meetingId.toString());
      }

      // 返回状态变更信息，由 runGlobalTimer 统一批量发送
      return {
        meetId: meeting.meetId,
        status: newStatus,
        oldStatus: oldStatus,
      };
    }

    // 如果会议已结束，从待更新列表中移除
    if (newStatus === "Concluded") {
      pendingMeetings.delete(meetingId.toString());
    }

    // 没有状态变更，返回 null
    return null;
  } catch (error) {
    return null;
  }
};

/**
 * 全局定时任务，定期检查并更新所有待更新的会议状态
 */
const runGlobalTimer = async () => {
  if (pendingMeetings.size === 0) {
    // 如果没有待更新的会议，停止定时任务
    stopGlobalTimer();
    return;
  }

  // 并发更新所有会议状态，收集状态变更信息
  const updatePromises = Array.from(pendingMeetings).map(async (meetingIdStr) => {
    const change = await updateMeetingStatus(meetingIdStr);
    return change; // 返回状态变更信息，如果没有变更则返回 null
  });

  // 等待所有更新完成，收集所有状态变更
  const results = await Promise.all(updatePromises);
  const changes = results.filter(change => change !== null);

  // 如果有状态变更，批量发送 WebSocket 消息
  if (changes.length > 0) {
    const statusData = {
      changes: changes, // 发送所有变更的数组
      count: changes.length,
    };

    // 延迟加载，避免循环依赖
    if (!broadcastMeetStatusChange) {
      try {
        const { broadcastMeetStatusChange: broadcastFn } = require("./webSocket");
        broadcastMeetStatusChange = broadcastFn;
      } catch (error) {
      }
    }

    // 广播到Web端和PC端（默认同时发送到两个命名空间）
    if (broadcastMeetStatusChange) {
      broadcastMeetStatusChange(statusData);
    }
  }
};

/**
 * 启动全局定时任务（如果还没有启动）
 */
const startGlobalTimer = () => {
  if (globalJob) {
    // 定时任务已经在运行
    return;
  }

  // 使用 node-schedule 创建定时任务
  globalJob = schedule.scheduleJob(JOB_RULE, () => {
    runGlobalTimer();
  });

  // 立即执行一次
  runGlobalTimer();
};

/**
 * 停止全局定时任务
 */
const stopGlobalTimer = () => {
  if (globalJob) {
    globalJob.cancel();
    globalJob = null;
  }
};

/**
 * 添加会议到待更新列表
 * @param {String} meetingId - 会议 MongoDB ID
 */
const addMeetingToPendingList = (meetingId) => {
  const meetingIdStr = meetingId.toString();
  pendingMeetings.add(meetingIdStr);

  // 确保全局定时器正在运行
  startGlobalTimer();
};

/**
 * 从待更新列表中移除会议
 * @param {String} meetingId - 会议 MongoDB ID
 */
const removeMeetingFromPendingList = (meetingId) => {
  const meetingIdStr = meetingId.toString();
  pendingMeetings.delete(meetingIdStr);

  // 如果列表为空，停止定时器
  if (pendingMeetings.size === 0) {
    stopGlobalTimer();
  }
};

/**
 * 初始化所有待处理的会议任务
 * 在服务器启动时调用，恢复所有未结束的会议任务
 */
const initializeScheduledTasks = async () => {
  try {
    // 查找所有未结束且未取消的会议
    const meetings = await MeetRoom.find({
      status: { $in: ["Pending", "InProgress"] },
    });

    meetings.forEach((meeting) => {
      addMeetingToPendingList(meeting._id);
    });
  } catch (error) {
  }
};

module.exports = {
  addMeetingToPendingList,
  removeMeetingFromPendingList,
  startGlobalTimer,
  stopGlobalTimer,
  initializeScheduledTasks,
};
