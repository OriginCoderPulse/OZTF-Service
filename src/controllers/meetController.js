const MeetRoom = require('../models/MeetRoom');
const Staff = require('../models/Staff');
const mongoose = require('mongoose');
const { addMeetingToPendingList } = require('../utils/meetStatusScheduler');

/**
 * 生成唯一的会议ID，格式：xxx-xxxx-xxxx
 */
const generateMeetId = async () => {
    let meetId;
    let isUnique = false;
    
    while (!isUnique) {
        // 生成随机ID：xxx-xxxx-xxxx
        const part1 = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
        const part2 = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
        const part3 = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
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
        const {
            topic,
            description,
            organizerId,
            startTime,
            duration,
            password,
            innerParticipants
        } = req.body;

        // 参数验证
        if (!topic || !organizerId || !startTime || !duration) {
            return res.status(400).json({
                meta: {
                    code: '1024-C01',
                    message: 'Invalid request data: Missing required fields'
                }
            });
        }

        // 验证 organizerId 是否为有效的 ObjectId
        if (!mongoose.Types.ObjectId.isValid(organizerId)) {
            return res.status(400).json({
                meta: {
                    code: '1024-C01',
                    message: 'Invalid organizerId format'
                }
            });
        }

        // 验证 startTime 是否为有效日期
        const startTimeDate = new Date(startTime);
        if (isNaN(startTimeDate.getTime())) {
            return res.status(400).json({
                meta: {
                    code: '1024-C01',
                    message: 'Invalid startTime format'
                }
            });
        }

        // 验证 duration 是否为有效数字
        if (typeof duration !== 'number' || duration <= 0) {
            return res.status(400).json({
                meta: {
                    code: '1024-C01',
                    message: 'Invalid duration: must be a positive number'
                }
            });
        }

        // 验证 innerParticipants 是否为数组
        let participantsArray = [];
        if (innerParticipants) {
            if (!Array.isArray(innerParticipants)) {
                return res.status(400).json({
                    meta: {
                        code: '1024-C01',
                        message: 'Invalid innerParticipants: must be an array'
                    }
                });
            }
            // 验证数组中的每个元素是否为有效的 ObjectId
            participantsArray = innerParticipants.filter(id => {
                return mongoose.Types.ObjectId.isValid(id);
            }).map(id => new mongoose.Types.ObjectId(id));
        }

        // 生成唯一的 meetId
        const meetId = await generateMeetId();

        // 计算初始状态
        const now = new Date();
        let initialStatus = 'Pending';
        if (startTimeDate <= now) {
            initialStatus = 'InProgress';
        }

        // 创建会议房间
        const meetRoom = new MeetRoom({
            meetId,
            topic,
            description: description || '',
            organizerId: new mongoose.Types.ObjectId(organizerId),
            startTime: startTimeDate,
            duration,
            password: password || '',
            status: initialStatus,
            innerParticipants: participantsArray,
            outParticipants: []
        });

        await meetRoom.save();

        // 将会议添加到待更新列表，启动全局定时任务
        addMeetingToPendingList(meetRoom._id);

        res.json({
            meta: {
                code: '1024-S200',
                message: 'Success'
            },
            data: {
                meetId: meetRoom.meetId,
                topic: meetRoom.topic,
                description: meetRoom.description,
                organizerId: meetRoom.organizerId.toString(),
                startTime: meetRoom.startTime,
                duration: meetRoom.duration,
                status: meetRoom.status,
                innerParticipants: meetRoom.innerParticipants.map(id => id.toString()),
                createdAt: meetRoom.createdAt
            }
        });
    } catch (error) {
        console.error('Create room error:', error);
        res.status(500).json({
            meta: {
                code: '1024-E01',
                message: 'Network error: Backend service unavailable'
            }
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
                    code: '1024-C01',
                    message: 'Invalid request data: Missing userId'
                }
            });
        }

        // 验证 userId 是否为有效的 ObjectId
        if (!mongoose.Types.ObjectId.isValid(userId)) {
            return res.status(400).json({
                meta: {
                    code: '1024-C01',
                    message: 'Invalid userId format'
                }
            });
        }

        const userObjectId = new mongoose.Types.ObjectId(userId);

        // 查询用户信息，判断是否是CEO
        const user = await Staff.findById(userObjectId).populate('department');
        if (!user) {
            return res.status(404).json({
                meta: {
                    code: '1024-C01',
                    message: 'User not found'
                }
            });
        }

        // 判断是否是CEO（occupation为CEO且部门为CEO）
        const isCEO = user.occupation === 'CEO' && user.department?.name === 'CEO';

        let meetings;

        if (isCEO) {
            // CEO可以参加所有会议，但只返回进行中和待开始的会议
            meetings = await MeetRoom.find({
                status: { $in: ['InProgress', 'Pending'] }
            })
                .populate('organizerId', 'name occupation')
                .sort({ startTime: -1 })
                .lean();
        } else {
            // 普通用户：获取组织的会议或作为参与者的会议，只返回进行中和待开始的会议
            meetings = await MeetRoom.find({
                $and: [
                    {
                        $or: [
                            { organizerId: userObjectId },
                            { innerParticipants: userObjectId }
                        ]
                    },
                    {
                        status: { $in: ['InProgress', 'Pending'] }
                    }
                ]
            })
                .populate('organizerId', 'name occupation')
                .sort({ startTime: -1 })
                .lean();
        }

        // 格式化返回数据
        const dataList = meetings.map(meeting => {
            return {
                meetId: meeting.meetId,
                topic: meeting.topic,
                description: meeting.description,
                organizer: {
                    id: meeting.organizerId._id.toString(),
                    name: meeting.organizerId.name,
                    occupation: meeting.organizerId.occupation
                },
                startTime: meeting.startTime,
                duration: meeting.duration,
                status: meeting.status
            };
        });

        res.json({
            meta: {
                code: '1024-S200',
                message: 'Success'
            },
            data: {
                data_list: dataList,
                total: dataList.length
            }
        });
    } catch (error) {
        console.error('Get room error:', error);
        res.status(500).json({
            meta: {
                code: '1024-E01',
                message: 'Network error: Backend service unavailable'
            }
        });
    }
};

module.exports = {
    createRoom,
    getRoom
};
