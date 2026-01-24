/**
 * 会议 WebSocket 服务
 * 用于实时推送会议状态变更
 */

// 存储所有订阅会议列表的WebSocket连接
const meetConnections = new Set(); // Set<socket>

/**
 * 初始化会议 WebSocket 服务
 * @param {Server} io - Socket.IO 服务器实例
 */
function initializeMeetWebSocket(io) {
    // 创建会议命名空间
    const meetNamespace = io.of('/meet');

    meetNamespace.on('connection', (socket) => {
        // 客户端订阅会议列表更新
        socket.on('subscribe', () => {
            // 将socket加入到连接集合中
            meetConnections.add(socket);
            socket.subscribed = true; // 标记已订阅
            socket.emit('subscribed', { message: '已订阅会议列表更新' });
        });

        // 客户端取消订阅
        socket.on('unsubscribe', () => {
            meetConnections.delete(socket);
            socket.subscribed = false;
        });

        // 客户端断开连接
        socket.on('disconnect', () => {
            if (socket.subscribed) {
                meetConnections.delete(socket);
            }
        });
    });
}

/**
 * 广播会议状态变更
 * @param {object} statusData - 状态数据 { changes: [{ meetId, status, oldStatus }], count } 或单个变更 { meetId, status, oldStatus }
 */
function broadcastMeetStatusChange(statusData) {
    if (meetConnections.size === 0) {
        return; // 没有订阅者，直接返回
    }

    // 支持批量变更和单个变更两种格式
    let changes = [];
    if (statusData.changes && Array.isArray(statusData.changes)) {
        // 批量变更格式
        changes = statusData.changes;
    } else if (statusData.meetId) {
        // 单个变更格式（向后兼容）
        changes = [statusData];
    } else {
        return;
    }

    const message = {
        type: 'statusChange',
        changes: changes,
        count: changes.length,
        timestamp: new Date().toISOString(),
    };

    // 向所有订阅的客户端推送状态变更
    meetConnections.forEach((socket) => {
        if (socket.subscribed) {
            socket.emit('meetStatusChange', message);
        }
    });
}

module.exports = {
    initializeMeetWebSocket,
    broadcastMeetStatusChange,
};
