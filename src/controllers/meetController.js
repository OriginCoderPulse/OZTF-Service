const MeetRoom = require("../models/MeetRoom");
const Staff = require("../models/Staff");
const mongoose = require("mongoose");
const {
  addMeetingToPendingList,
  removeMeetingFromPendingList,
} = require("../utils/meetStatusScheduler");

/**
 * 生成唯一的会议ID，格式：xxx-xxxx-xxxx
 */
const generateMeetId = async () => {
  let meetId;
  let isUnique = false;

  while (!isUnique) {
    // 生成随机ID：xxx-xxxx-xxxx
    const part1 = Math.floor(Math.random() * 1000)
      .toString()
      .padStart(3, "0");
    const part2 = Math.floor(Math.random() * 10000)
      .toString()
      .padStart(4, "0");
    const part3 = Math.floor(Math.random() * 10000)
      .toString()
      .padStart(4, "0");
    meetId = `${part1}-${part2}-${part3}`;

    // 检查是否已存在
    const existing = await MeetRoom.findOne({ meetId });
    if (!existing) {
      isUnique = true;
    }
  }

  return meetId;
};

/**
 * 创建会议房间
 */
const createRoom = async (req, res) => {
  try {
    const { topic, description, organizerId, startTime, duration, password, innerParticipants } =
      req.body;

    // 参数验证
    if (!topic || !organizerId || !startTime || !duration) {
      return res.status(400).json({
        meta: {
          code: "1024-C01",
          message: "Invalid request data: Missing required fields",
        },
      });
    }

    // 验证 organizerId 是否为有效的 ObjectId
    if (!mongoose.Types.ObjectId.isValid(organizerId)) {
      return res.status(400).json({
        meta: {
          code: "1024-C01",
          message: "Invalid organizerId format",
        },
      });
    }

    // 验证 startTime 是否为有效日期
    const startTimeDate = new Date(startTime);
    if (isNaN(startTimeDate.getTime())) {
      return res.status(400).json({
        meta: {
          code: "1024-C01",
          message: "Invalid startTime format",
        },
      });
    }

    // 验证 duration 是否为有效数字
    if (typeof duration !== "number" || duration <= 0) {
      return res.status(400).json({
        meta: {
          code: "1024-C01",
          message: "Invalid duration: must be a positive number",
        },
      });
    }

    // 验证 innerParticipants 是否为数组（创建会议时，innerParticipants 仍然是 ObjectId 数组，用于预选参会人）
    // 实际加入会议时，会通过 addInnerParticipant 接口添加为对象格式
    let participantsArray = [];
    if (innerParticipants) {
      if (!Array.isArray(innerParticipants)) {
        return res.status(400).json({
          meta: {
            code: "1024-C01",
            message: "Invalid innerParticipants: must be an array",
          },
        });
      }
      // 验证数组中的每个元素是否为有效的 ObjectId，并转换为对象格式
      participantsArray = innerParticipants
        .filter((id) => {
          return mongoose.Types.ObjectId.isValid(id);
        })
        .map((id) => ({
          participantId: new mongoose.Types.ObjectId(id),
          device: "unknown",
          joinTime: new Date(),
        }));
    }

    // 生成唯一的 meetId
    const meetId = await generateMeetId();

    // 计算初始状态
    const now = new Date();
    let initialStatus = "Pending";
    if (startTimeDate <= now) {
      initialStatus = "InProgress";
    }

    // 创建会议房间
    const meetRoom = new MeetRoom({
      meetId,
      topic,
      description: description || "",
      organizerId: new mongoose.Types.ObjectId(organizerId),
      startTime: startTimeDate,
      duration,
      password: password || "",
      status: initialStatus,
      innerParticipants: participantsArray,
      outParticipants: [],
    });

    await meetRoom.save();

    // 将会议添加到待更新列表，启动全局定时任务
    addMeetingToPendingList(meetRoom._id);

    res.json({
      meta: {
        code: "1024-S200",
        message: "Success",
      },
      data: {
        meetId: meetRoom.meetId,
        topic: meetRoom.topic,
        description: meetRoom.description,
        organizerId: meetRoom.organizerId.toString(),
        startTime:
          meetRoom.startTime instanceof Date
            ? meetRoom.startTime.toISOString()
            : new Date(meetRoom.startTime).toISOString(),
        duration: meetRoom.duration,
        status: meetRoom.status,
        innerParticipants: meetRoom.innerParticipants.map((p) => ({
          participantId: p.participantId.toString(),
          device: p.device,
          joinTime:
            p.joinTime instanceof Date
              ? p.joinTime.toISOString()
              : new Date(p.joinTime).toISOString(),
        })),
        createdAt:
          meetRoom.createdAt instanceof Date
            ? meetRoom.createdAt.toISOString()
            : new Date(meetRoom.createdAt).toISOString(),
      },
    });
  } catch (error) {
    console.error("Create room error:", error);
    res.status(500).json({
      meta: {
        code: "1024-E01",
        message: "Network error: Backend service unavailable",
      },
    });
  }
};

/**
 * 获取当前用户能参加的会议或组织的会议
 * CEO可以参加所有会议
 */
const getRoom = async (req, res) => {
  try {
    const { userId } = req.body;

    // 参数验证
    if (!userId) {
      return res.status(400).json({
        meta: {
          code: "1024-C01",
          message: "Invalid request data: Missing userId",
        },
      });
    }

    // 验证 userId 是否为有效的 ObjectId
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        meta: {
          code: "1024-C01",
          message: "Invalid userId format",
        },
      });
    }

    const userObjectId = new mongoose.Types.ObjectId(userId);

    // 查询用户信息，判断是否是CEO
    const user = await Staff.findById(userObjectId).populate("department");
    if (!user) {
      return res.status(404).json({
        meta: {
          code: "1024-C01",
          message: "User not found",
        },
      });
    }

    // 判断是否是CEO（occupation为CEO且部门为CEO）
    const isCEO = user.occupation === "CEO" && user.department?.name === "CEO";

    let meetings;

    if (isCEO) {
      // CEO可以参加所有会议，但只返回进行中和待开始的会议
      meetings = await MeetRoom.find({
        status: { $in: ["InProgress", "Pending"] },
      })
        .populate("organizerId", "name occupation")
        .lean();
    } else {
      // 普通用户：获取组织的会议或作为参与者的会议，只返回进行中和待开始的会议
      meetings = await MeetRoom.find({
        $and: [
          {
            $or: [
              { organizerId: userObjectId },
              { "innerParticipants.participantId": userObjectId },
            ],
          },
          {
            status: { $in: ["InProgress", "Pending"] },
          },
        ],
      })
        .populate("organizerId", "name occupation")
        .lean();
    }

    // 排序：先按状态排序（InProgress在前，Pending在后），再按开始时间排序（距离当前时间近的在前）
    const now = new Date();
    const nowTime = now.getTime();
    meetings.sort((a, b) => {
      // 先按状态排序：InProgress = 0, Pending = 1
      const statusOrder = { InProgress: 0, Pending: 1 };
      const statusDiff = statusOrder[a.status] - statusOrder[b.status];

      if (statusDiff !== 0) {
        return statusDiff;
      }

      // 状态相同时，按开始时间排序（距离当前时间近的在前）
      const timeA = new Date(a.startTime).getTime();
      const timeB = new Date(b.startTime).getTime();

      if (a.status === "InProgress") {
        // 进行中的会议：开始时间越接近现在（开始得越晚）的排在前面（降序）
        return timeB - timeA;
      } else {
        // 待开始的会议：开始时间越接近现在（开始得越早）的排在前面（升序）
        return timeA - timeB;
      }
    });

    // 格式化返回数据（确保时间返回为ISO字符串格式）
    const dataList = meetings.map((meeting) => {
      return {
        meetId: meeting.meetId,
        topic: meeting.topic,
        description: meeting.description,
        organizer: {
          id: meeting.organizerId._id.toString(),
          name: meeting.organizerId.name,
          occupation: meeting.organizerId.occupation,
        },
        startTime:
          meeting.startTime instanceof Date
            ? meeting.startTime.toISOString()
            : new Date(meeting.startTime).toISOString(),
        duration: meeting.duration,
        status: meeting.status,
      };
    });

    res.json({
      meta: {
        code: "1024-S200",
        message: "Success",
      },
      data: {
        data_list: dataList,
        total: dataList.length,
      },
    });
  } catch (error) {
    console.error("Get room error:", error);
    res.status(500).json({
      meta: {
        code: "1024-E01",
        message: "Network error: Backend service unavailable",
      },
    });
  }
};

/**
 * 修改会议状态（取消或结束会议）
 */
const statusChange = async (req, res) => {
  try {
    const { meetId, status, userId } = req.body;

    // 参数验证
    if (!meetId || !status || !userId) {
      return res.status(400).json({
        meta: {
          code: "1024-C01",
          message: "Invalid request data: Missing required fields",
        },
      });
    }

    // 验证 status 是否为有效值
    const validStatuses = ["Cancelled", "Concluded"];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        meta: {
          code: "1024-C01",
          message: "Invalid status: must be Cancelled or Concluded",
        },
      });
    }

    // 验证 userId 是否为有效的 ObjectId
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        meta: {
          code: "1024-C01",
          message: "Invalid userId format",
        },
      });
    }

    const userObjectId = new mongoose.Types.ObjectId(userId);

    // 查询会议信息
    const meeting = await MeetRoom.findOne({ meetId }).populate("organizerId");
    if (!meeting) {
      return res.status(404).json({
        meta: {
          code: "1024-C01",
          message: "Meeting not found",
        },
      });
    }

    // 查询用户信息，判断是否是CEO
    const user = await Staff.findById(userObjectId);
    if (!user) {
      return res.status(404).json({
        meta: {
          code: "1024-C01",
          message: "User not found",
        },
      });
    }

    // 权限验证：只有CEO或会议组织者可以修改状态
    const isCEO = user.permission === "CEO";
    const isOrganizer = meeting.organizerId._id.toString() === userId;

    if (!isCEO && !isOrganizer) {
      return res.status(403).json({
        meta: {
          code: "1024-C01",
          message: "Permission denied: Only CEO or meeting organizer can change status",
        },
      });
    }

    // 状态验证
    if (status === "Cancelled") {
      // 只能取消 Pending 或 InProgress 状态的会议
      if (meeting.status !== "Pending" && meeting.status !== "InProgress") {
        return res.status(400).json({
          meta: {
            code: "1024-C01",
            message: "Cannot cancel meeting: Meeting is not in Pending or InProgress status",
          },
        });
      }
    } else if (status === "Concluded") {
      // 只能结束 InProgress 状态的会议
      if (meeting.status !== "InProgress") {
        return res.status(400).json({
          meta: {
            code: "1024-C01",
            message: "Cannot conclude meeting: Meeting is not in InProgress status",
          },
        });
      }
    }

    // 更新会议状态
    const now = new Date();
    const updateData = {
      status: status,
      updatedAt: now,
    };

    // 如果状态变为 Concluded（结束会议），清空所有参会人
    if (status === "Concluded") {
      updateData.innerParticipants = [];
      updateData.outParticipants = [];
    }

    await MeetRoom.findByIdAndUpdate(meeting._id, updateData);

    // 如果状态变为 Cancelled 或 Concluded，从调度器中移除
    if (status === "Cancelled" || status === "Concluded") {
      removeMeetingFromPendingList(meeting._id);
    }

    res.json({
      meta: {
        code: "1024-S200",
        message: "Success",
      },
      data: {
        meetId: meeting.meetId,
        status: status,
      },
    });
  } catch (error) {
    console.error("Status change error:", error);
    res.status(500).json({
      meta: {
        code: "1024-E01",
        message: "Network error: Backend service unavailable",
      },
    });
  }
};

/**
 * 生成18位随机字母数字ID
 * @returns {string} 18位随机ID
 */
function generateParticipantId() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < 18; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * 删除外部参会人（根据 trtcId）
 */
const removeOutParticipant = async (req, res) => {
  try {
    const { meetId, trtcId } = req.body;

    // 参数验证
    if (!meetId) {
      return res.status(400).json({
        meta: {
          code: "1024-C01",
          message: "Invalid request data: Missing meetId",
        },
      });
    }

    if (!trtcId) {
      return res.status(400).json({
        meta: {
          code: "1024-C01",
          message: "Invalid request data: Missing trtcId",
        },
      });
    }

    // 查找会议
    const meeting = await MeetRoom.findOne({ meetId });
    if (!meeting) {
      return res.status(404).json({
        meta: {
          code: "1024-C01",
          message: "Meeting not found",
        },
      });
    }

    // 删除该 trtcId 对应的参会人
    const initialLength = meeting.outParticipants.length;
    meeting.outParticipants = meeting.outParticipants.filter((p) => {
      return p.trtcId !== trtcId;
    });

    // 如果有删除，更新数据库
    if (meeting.outParticipants.length !== initialLength) {
      meeting.updatedAt = new Date();
      await meeting.save();
    }

    res.json({
      meta: {
        code: "1024-S200",
        message: "Success",
      },
      data: {
        meetId: meeting.meetId,
        participantCount: meeting.outParticipants.length,
        removed: initialLength - meeting.outParticipants.length > 0,
      },
    });
  } catch (error) {
    console.error("Remove out participant error:", error);
    res.status(500).json({
      meta: {
        code: "1024-E01",
        message: "Network error: Backend service unavailable",
      },
    });
  }
};

/**
 * 添加外部参会人
 * 前端生成 18 位唯一 ID，后端直接使用
 */
const addOutParticipant = async (req, res) => {
  try {
    const { meetId, trtcId, participantInfo } = req.body;

    // 参数验证
    if (!meetId) {
      return res.status(400).json({
        meta: {
          code: "1024-C01",
          message: "Invalid request data: Missing meetId",
        },
      });
    }

    if (!trtcId) {
      return res.status(400).json({
        meta: {
          code: "1024-C01",
          message: "Invalid request data: Missing trtcId",
        },
      });
    }

    // 解析参会人信息（可能是 JSON 字符串）
    let participantData = {};
    if (participantInfo) {
      try {
        participantData =
          typeof participantInfo === "string" ? JSON.parse(participantInfo) : participantInfo;
      } catch (parseError) {
        // 如果解析失败，使用默认值
        console.warn("解析参会人信息失败，使用默认值:", parseError);
      }
    }

    // 查找会议
    const meeting = await MeetRoom.findOne({ meetId });
    if (!meeting) {
      return res.status(404).json({
        meta: {
          code: "1024-C01",
          message: "Meeting not found",
        },
      });
    }

    // 检查该 trtcId 是否已存在
    const existingParticipant = meeting.outParticipants.find((p) => {
      return p.trtcId === trtcId;
    });

    // 构建参会人信息对象
    const participantObject = {
      trtcId: trtcId,
      name: participantData.name || "匿名用户",
      device: participantData.device || "unknown",
      joinTime: participantData.joinTime ? new Date(participantData.joinTime) : new Date(),
    };

    if (existingParticipant) {
      // 如果已存在，更新信息
      const index = meeting.outParticipants.findIndex((p) => {
        return p.trtcId === trtcId;
      });
      if (index !== -1) {
        meeting.outParticipants[index] = participantObject;
      }
    } else {
      // 如果不存在，添加新的参会人
      meeting.outParticipants.push(participantObject);
    }

    meeting.updatedAt = new Date();
    await meeting.save();

    res.json({
      meta: {
        code: "1024-S200",
        message: "Success",
      },
      data: {
        meetId: meeting.meetId,
        trtcId: trtcId,
        participantCount: meeting.outParticipants.length,
      },
    });
  } catch (error) {
    console.error("Add out participant error:", error);
    res.status(500).json({
      meta: {
        code: "1024-E01",
        message: "Network error: Backend service unavailable",
      },
    });
  }
};

/**
 * 添加内部参会人
 */
const addInnerParticipant = async (req, res) => {
  try {
    const { meetId, participantId, trtcId, participantInfo } = req.body;

    // 参数验证
    if (!meetId || !participantId) {
      return res.status(400).json({
        meta: {
          code: "1024-C01",
          message: "Invalid request data: Missing meetId or participantId",
        },
      });
    }

    if (!trtcId) {
      return res.status(400).json({
        meta: {
          code: "1024-C01",
          message: "Invalid request data: Missing trtcId",
        },
      });
    }

    // 验证 participantId 是否为有效的 ObjectId
    if (!mongoose.Types.ObjectId.isValid(participantId)) {
      return res.status(400).json({
        meta: {
          code: "1024-C01",
          message: "Invalid participantId format",
        },
      });
    }

    // 解析参会人信息（可能是 JSON 字符串）
    let participantData = {};
    if (participantInfo) {
      try {
        participantData =
          typeof participantInfo === "string" ? JSON.parse(participantInfo) : participantInfo;
      } catch (parseError) {
        console.warn("解析参会人信息失败，使用默认值:", parseError);
      }
    }

    // 先检查会议是否存在
    const existingMeeting = await MeetRoom.findOne({ meetId });
    if (!existingMeeting) {
      return res.status(404).json({
        meta: {
          code: "1024-C01",
          message: "Meeting not found",
        },
      });
    }

    // 检查该参会人是否已经存在
    const existingParticipant = existingMeeting.innerParticipants.find(
      (p) => p.participantId.toString() === participantId
    );

    let meeting;
    if (existingParticipant) {
      // 如果已存在，使用 $set 更新信息
      meeting = await MeetRoom.findOneAndUpdate(
        {
          meetId,
          "innerParticipants.participantId": new mongoose.Types.ObjectId(participantId),
        },
        {
          $set: {
            "innerParticipants.$.trtcId": trtcId,
            "innerParticipants.$.device":
              participantData.device || existingParticipant.device || "unknown",
            "innerParticipants.$.joinTime": participantData.joinTime
              ? new Date(participantData.joinTime)
              : existingParticipant.joinTime || new Date(),
            updatedAt: new Date(),
          },
        },
        {
          new: true,
          runValidators: true,
        }
      );
    } else {
      // 如果不存在，使用 $push 添加新的参会人
      meeting = await MeetRoom.findOneAndUpdate(
        { meetId },
        {
          $push: {
            innerParticipants: {
              participantId: new mongoose.Types.ObjectId(participantId),
              trtcId: trtcId,
              device: participantData.device || "unknown",
              joinTime: participantData.joinTime ? new Date(participantData.joinTime) : new Date(),
            },
          },
          $set: {
            updatedAt: new Date(),
          },
        },
        {
          new: true,
          runValidators: true,
        }
      );
    }

    res.json({
      meta: {
        code: "1024-S200",
        message: "Success",
      },
      data: {
        meetId: meeting.meetId,
        participantId: participantId,
        participantCount: meeting.innerParticipants.length,
      },
    });
  } catch (error) {
    console.error("Add inner participant error:", error);
    res.status(500).json({
      meta: {
        code: "1024-E01",
        message: "Network error: Backend service unavailable",
      },
    });
  }
};

/**
 * 删除内部参会人
 */
const removeInnerParticipant = async (req, res) => {
  try {
    const { meetId, participantId } = req.body;

    // 参数验证
    if (!meetId || !participantId) {
      return res.status(400).json({
        meta: {
          code: "1024-C01",
          message: "Invalid request data: Missing meetId or participantId",
        },
      });
    }

    // 验证 participantId 是否为有效的 ObjectId
    if (!mongoose.Types.ObjectId.isValid(participantId)) {
      return res.status(400).json({
        meta: {
          code: "1024-C01",
          message: "Invalid participantId format",
        },
      });
    }

    // 使用 findOneAndUpdate 原子性地删除参会人，避免版本冲突
    const meeting = await MeetRoom.findOneAndUpdate(
      { meetId },
      {
        $pull: {
          innerParticipants: {
            participantId: new mongoose.Types.ObjectId(participantId),
          },
        },
        $set: {
          updatedAt: new Date(),
        },
      },
      {
        new: true, // 返回更新后的文档
        runValidators: true,
      }
    );

    if (!meeting) {
      return res.status(404).json({
        meta: {
          code: "1024-C01",
          message: "Meeting not found",
        },
      });
    }

    res.json({
      meta: {
        code: "1024-S200",
        message: "Success",
      },
      data: {
        meetId: meeting.meetId,
        participantId: participantId,
        participantCount: meeting.innerParticipants.length,
      },
    });
  } catch (error) {
    console.error("Remove inner participant error:", error);
    res.status(500).json({
      meta: {
        code: "1024-E01",
        message: "Network error: Backend service unavailable",
      },
    });
  }
};

/**
 * 获取会议的所有参会人（内部和外部）
 */
const getRoomProperties = async (req, res) => {
  try {
    let { meetId } = req.body;

    if (!meetId) {
      return res.status(400).json({
        meta: {
          code: "1024-C01",
          message: "Invalid request data: Missing meetId",
        },
      });
    }

    // 去除前后空格并验证格式
    meetId = typeof meetId === "string" ? meetId.trim() : String(meetId).trim();

    if (!meetId) {
      return res.status(400).json({
        meta: {
          code: "1024-C01",
          message: "Invalid request data: meetId cannot be empty",
        },
      });
    }

    // 查找会议并填充内部参会人的用户信息
    const meeting = await MeetRoom.findOne({ meetId })
      .populate("innerParticipants.participantId", "name occupation")
      .lean();

    if (!meeting) {
      return res.status(404).json({
        meta: {
          code: "1024-C01",
          message: "Meeting not found",
        },
      });
    }

    // 格式化内部参会人数据
    const innerParticipants = meeting.innerParticipants.map((p) => {
      // 处理 populate 后的 participantId（可能是对象或 ObjectId）
      let participantIdStr;
      let participantName = "未知用户";
      let participantOccupation = "";

      if (p.participantId && typeof p.participantId === "object") {
        // 如果被 populate，participantId 是一个对象
        if (p.participantId._id) {
          participantIdStr = p.participantId._id.toString();
        } else {
          participantIdStr = p.participantId.toString();
        }
        participantName = p.participantId.name || participantName;
        participantOccupation = p.participantId.occupation || participantOccupation;
      } else {
        // 如果没有被 populate，participantId 是 ObjectId
        participantIdStr = p.participantId.toString();
      }

      return {
        participantId: participantIdStr,
        trtcId: p.trtcId || participantIdStr, // 如果没有 trtcId，使用 participantId 作为 fallback
        name: participantName,
        occupation: participantOccupation,
        device: p.device || "unknown",
        joinTime:
          p.joinTime instanceof Date
            ? p.joinTime.toISOString()
            : new Date(p.joinTime).toISOString(),
        type: "inner", // 标记为内部参会人
      };
    });

    // 格式化外部参会人数据
    const outParticipants = meeting.outParticipants.map((p) => ({
      trtcId: p.trtcId,
      name: p.name || "匿名用户",
      occupation: "",
      device: p.device || "unknown",
      joinTime:
        p.joinTime instanceof Date
          ? p.joinTime.toISOString()
          : new Date(p.joinTime).toISOString(),
      type: "out", // 标记为外部参会人
    }));

    res.json({
      meta: {
        code: "1024-S200",
        message: "Success",
      },
      data: {
        meetId: meeting.meetId,
        topic: meeting.topic || "",
        duration: meeting.duration || 0,
        startTime:
          meeting.startTime instanceof Date
            ? meeting.startTime.toISOString()
            : meeting.startTime
              ? new Date(meeting.startTime).toISOString()
              : "",
        organizerId: meeting.organizerId ? meeting.organizerId.toString() : null,
        innerParticipants,
        outParticipants,
        totalCount: innerParticipants.length + outParticipants.length,
      },
    });
  } catch (error) {
    console.error("Get room properties error:", error);
    res.status(500).json({
      meta: {
        code: "1024-E01",
        message: "Network error: Backend service unavailable",
      },
    });
  }
};

/**
 * 根据 meetId 获取单个会议信息（用于外部访问）
 */
const getMeetingByMeetId = async (req, res) => {
  try {
    let { meetId } = req.body;

    if (!meetId) {
      return res.status(400).json({
        meta: {
          code: "1024-C01",
          message: "Invalid request data: Missing meetId",
        },
      });
    }

    // 去除前后空格并验证格式
    meetId = typeof meetId === "string" ? meetId.trim() : String(meetId).trim();

    if (!meetId) {
      return res.status(400).json({
        meta: {
          code: "1024-C01",
          message: "Invalid request data: meetId cannot be empty",
        },
      });
    }

    // 添加调试日志
    console.log("查询会议，meetId:", meetId);

    const meeting = await MeetRoom.findOne({ meetId })
      .populate("organizerId", "name occupation")
      .lean();

    if (!meeting) {
      console.log("会议未找到，meetId:", meetId);
      // 尝试查找所有会议，用于调试
      const allMeetings = await MeetRoom.find({}).select("meetId").lean();
      console.log(
        "数据库中所有会议的meetId:",
        allMeetings.map((m) => m.meetId)
      );

      return res.status(404).json({
        meta: {
          code: "1024-C01",
          message: "Meeting not found",
        },
      });
    }

    res.json({
      meta: {
        code: "1024-S200",
        message: "Success",
      },
      data: {
        meetId: meeting.meetId,
        topic: meeting.topic,
        description: meeting.description,
        status: meeting.status,
        startTime:
          meeting.startTime instanceof Date
            ? meeting.startTime.toISOString()
            : new Date(meeting.startTime).toISOString(),
        duration: meeting.duration,
      },
    });
  } catch (error) {
    console.error("Get meeting by meetId error:", error);
    res.status(500).json({
      meta: {
        code: "1024-E01",
        message: "Network error: Backend service unavailable",
      },
    });
  }
};

module.exports = {
  createRoom,
  getRoom,
  statusChange,
  addOutParticipant,
  removeOutParticipant,
  addInnerParticipant,
  removeInnerParticipant,
  getRoomProperties,
  getMeetingByMeetId,
};
