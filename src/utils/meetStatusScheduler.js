const MeetRoom = require("../models/MeetRoom");

// 存储需要更新状态的会议ID集合
const pendingMeetings = new Set();

// 全局定时器，只有一个任务在运行
let globalTimer = null;

// 定时器检查间隔（毫秒），默认30秒
const CHECK_INTERVAL = 30 * 1000;

/**
 * 更新单个会议状态
 */
const updateMeetingStatus = async (meetingId) => {
  try {
    const meeting = await MeetRoom.findById(meetingId);
    if (!meeting) {
      console.log(`会议 ${meetingId} 不存在，从待更新列表中移除`);
      pendingMeetings.delete(meetingId.toString());
      return;
    }

    // 如果会议已取消，从列表中移除
    if (meeting.status === "Cancelled") {
      pendingMeetings.delete(meetingId.toString());
      console.log(`会议 ${meeting.meetId} 已取消，从待更新列表中移除`);
      return;
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
      await MeetRoom.findByIdAndUpdate(meeting._id, {
        status: newStatus,
        updatedAt: now,
      });
      console.log(`会议 ${meeting.meetId} 状态已更新: ${meeting.status} -> ${newStatus}`);

      // 如果状态变为 'InProgress'，确保会议仍在待更新列表中（继续检测直到结束）
      if (newStatus === "InProgress") {
        pendingMeetings.add(meetingId.toString());
        console.log(`会议 ${meeting.meetId} 已开始，继续监测直到结束`);
      }
    }

    // 如果会议已结束，从待更新列表中移除
    if (newStatus === "Concluded") {
      pendingMeetings.delete(meetingId.toString());
      console.log(`会议 ${meeting.meetId} 已结束，从待更新列表中移除`);
    }
  } catch (error) {
    console.error(`更新会议 ${meetingId} 状态错误:`, error);
  }
};

/**
 * 全局定时任务，定期检查并更新所有待更新的会议状态
 */
const runGlobalTimer = async () => {
  if (pendingMeetings.size === 0) {
    // 如果没有待更新的会议，停止定时器
    if (globalTimer) {
      clearInterval(globalTimer);
      globalTimer = null;
      console.log("没有待更新的会议，已停止全局定时器");
    }
    return;
  }

  console.log(`开始检查 ${pendingMeetings.size} 个待更新的会议状态...`);

  // 并发更新所有会议状态
  const updatePromises = Array.from(pendingMeetings).map((meetingIdStr) => {
    return updateMeetingStatus(meetingIdStr);
  });

  await Promise.all(updatePromises);
};

/**
 * 启动全局定时器（如果还没有启动）
 */
const startGlobalTimer = () => {
  if (globalTimer) {
    // 定时器已经在运行
    return;
  }

  console.log("启动全局会议状态更新定时器");
  globalTimer = setInterval(() => {
    runGlobalTimer();
  }, CHECK_INTERVAL);

  // 立即执行一次
  runGlobalTimer();
};

/**
 * 停止全局定时器
 */
const stopGlobalTimer = () => {
  if (globalTimer) {
    clearInterval(globalTimer);
    globalTimer = null;
    console.log("已停止全局定时器");
  }
};

/**
 * 添加会议到待更新列表
 * @param {String} meetingId - 会议 MongoDB ID
 */
const addMeetingToPendingList = (meetingId) => {
  const meetingIdStr = meetingId.toString();
  pendingMeetings.add(meetingIdStr);
  console.log(`会议 ${meetingIdStr} 已添加到待更新列表，当前列表大小: ${pendingMeetings.size}`);

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
  console.log(`会议 ${meetingIdStr} 已从待更新列表中移除，当前列表大小: ${pendingMeetings.size}`);

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

    console.log(`发现 ${meetings.length} 个待处理的会议，正在添加到待更新列表...`);

    meetings.forEach((meeting) => {
      addMeetingToPendingList(meeting._id);
    });

    console.log(`所有会议已添加到待更新列表，共 ${pendingMeetings.size} 个会议`);
  } catch (error) {
    console.error("初始化会议定时任务错误:", error);
  }
};

module.exports = {
  addMeetingToPendingList,
  removeMeetingFromPendingList,
  startGlobalTimer,
  stopGlobalTimer,
  initializeScheduledTasks,
};
