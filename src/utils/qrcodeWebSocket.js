/**
 * 二维码 WebSocket 服务
 * 用于实时推送二维码状态变更
 */

// 存储每个二维码ID对应的WebSocket连接
const qrcodeConnections = new Map(); // Map<qrcodeId, Set<socket>>

/**
 * 初始化二维码 WebSocket 服务
 * @param {Server} io - Socket.IO 服务器实例
 */
function initializeQrcodeWebSocket(io) {
    // 创建二维码命名空间
    const qrcodeNamespace = io.of('/qrcode');

    qrcodeNamespace.on('connection', (socket) => {

        // 客户端订阅二维码状态
        socket.on('subscribe', (data) => {
            const { qrcodeId } = data;
            if (!qrcodeId) {
                socket.emit('error', { message: 'qrcodeId is required' });
                return;
            }

            // 将socket加入到该二维码的连接集合中
            if (!qrcodeConnections.has(qrcodeId)) {
                qrcodeConnections.set(qrcodeId, new Set());
            }
            qrcodeConnections.get(qrcodeId).add(socket);
            socket.qrcodeId = qrcodeId; // 保存到socket对象上，方便断开时清理
            socket.emit('subscribed', { qrcodeId });
        });

        // 客户端取消订阅
        socket.on('unsubscribe', (data) => {
            const { qrcodeId } = data;
            if (qrcodeId && qrcodeConnections.has(qrcodeId)) {
                qrcodeConnections.get(qrcodeId).delete(socket);
                if (qrcodeConnections.get(qrcodeId).size === 0) {
                    qrcodeConnections.delete(qrcodeId);
                }
            }
            socket.qrcodeId = null;
        });

        // 客户端断开连接
        socket.on('disconnect', () => {
            if (socket.qrcodeId) {
                const qrcodeId = socket.qrcodeId;
                if (qrcodeConnections.has(qrcodeId)) {
                    qrcodeConnections.get(qrcodeId).delete(socket);
                    if (qrcodeConnections.get(qrcodeId).size === 0) {
                        qrcodeConnections.delete(qrcodeId);
                    }
                }
            }
        });
    });
}

/**
 * 推送二维码状态变更
 * @param {string} qrcodeId - 二维码ID
 * @param {object} statusData - 状态数据 { status, statusText, authorization }
 */
function broadcastQrcodeStatus(qrcodeId, statusData) {
    if (!qrcodeConnections.has(qrcodeId)) {
        return; // 没有订阅者，直接返回
    }

    const connections = qrcodeConnections.get(qrcodeId);
    const message = {
        qrcodeId,
        ...statusData,
    };

    // 向所有订阅该二维码的客户端推送状态
    connections.forEach((socket) => {
        socket.emit('status', message);
    });
}

module.exports = {
    initializeQrcodeWebSocket,
    broadcastQrcodeStatus,
};
