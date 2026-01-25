/**
 * 统一 WebSocket 服务
 * 根据不同的命名空间处理不同的功能
 * - /web: Web端会议状态推送（只监听会议）
 * - /pc: PC端统一连接（会议+二维码）
 */

// ========== /web 命名空间相关 ==========
const webConnections = new Set(); // Set<socket>

// ========== /pc 命名空间相关 ==========
const pcConnections = new Set(); // Set<socket>
const pcQrcodeConnections = new Map(); // Map<qrcodeId, Set<socket>>

/**
 * 初始化所有 WebSocket 服务
 * @param {Server} io - Socket.IO 服务器实例
 */
function initializeWebSocket(io) {
    // ========== /web 命名空间：Web端会议（只监听会议） ==========
    const webNamespace = io.of('/web');
    webNamespace.on('connection', (socket) => {

        socket.on('subscribe', () => {
            webConnections.add(socket);
            socket.subscribed = true;
            socket.emit('subscribed', { message: '已订阅会议列表更新' });
        });

        socket.on('unsubscribe', () => {
            webConnections.delete(socket);
            socket.subscribed = false;
        });

        socket.on('disconnect', () => {
            if (socket.subscribed) {
                webConnections.delete(socket);
            }
        });
    });

    // ========== /pc 命名空间：PC端统一连接 ==========
    const pcNamespace = io.of('/pc');
    pcNamespace.on('connection', (socket) => {
        pcConnections.add(socket);

        // 会议相关事件
        socket.on('subscribe:meet', () => {
            socket.subscribedMeet = true;
            socket.emit('subscribed:meet', { message: '已订阅会议列表更新' });
        });

        socket.on('unsubscribe:meet', () => {
            socket.subscribedMeet = false;
        });

        // 二维码相关事件
        socket.on('subscribe:qrcode', (data) => {
            const { qrcodeId } = data;
            if (!qrcodeId) {
                socket.emit('error', { message: 'qrcodeId is required' });
                return;
            }

            if (!pcQrcodeConnections.has(qrcodeId)) {
                pcQrcodeConnections.set(qrcodeId, new Set());
            }
            pcQrcodeConnections.get(qrcodeId).add(socket);

            if (!socket.qrcodeIds) {
                socket.qrcodeIds = new Set();
            }
            socket.qrcodeIds.add(qrcodeId);

            socket.emit('subscribed:qrcode', { qrcodeId });
        });

        socket.on('unsubscribe:qrcode', (data) => {
            const { qrcodeId } = data;
            if (qrcodeId && pcQrcodeConnections.has(qrcodeId)) {
                pcQrcodeConnections.get(qrcodeId).delete(socket);
                if (pcQrcodeConnections.get(qrcodeId).size === 0) {
                    pcQrcodeConnections.delete(qrcodeId);
                }
            }
            if (socket.qrcodeIds) {
                socket.qrcodeIds.delete(qrcodeId);
            }
        });

        socket.on('disconnect', () => {
            // 清理会议订阅
            if (socket.subscribedMeet) {
                pcConnections.delete(socket);
            }

            // 清理二维码订阅
            if (socket.qrcodeIds) {
                socket.qrcodeIds.forEach((qrcodeId) => {
                    if (pcQrcodeConnections.has(qrcodeId)) {
                        pcQrcodeConnections.get(qrcodeId).delete(socket);
                        if (pcQrcodeConnections.get(qrcodeId).size === 0) {
                            pcQrcodeConnections.delete(qrcodeId);
                        }
                    }
                });
            }

            pcConnections.delete(socket);
        });
    });
}

/**
 * 广播会议状态变更
 * @param {object} statusData - 状态数据 { changes: [{ meetId, status, oldStatus }], count } 或单个变更 { meetId, status, oldStatus }
 * @param {string|Array<string>} namespaces - 要发送到的命名空间，默认为 ['/web', '/pc']
 */
function broadcastMeetStatusChange(statusData, namespaces = ['/web', '/pc']) {
    const targetNamespaces = Array.isArray(namespaces) ? namespaces : [namespaces];

    // 支持批量变更和单个变更两种格式
    let changes = [];
    if (statusData.changes && Array.isArray(statusData.changes)) {
        changes = statusData.changes;
    } else if (statusData.meetId) {
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

    // 发送到 /web 命名空间（Web端）
    if (targetNamespaces.includes('/web')) {
        webConnections.forEach((socket) => {
            if (socket.subscribed) {
                socket.emit('meetStatusChange', message);
            }
        });
    }

    // 发送到 /pc 命名空间（PC端）
    if (targetNamespaces.includes('/pc')) {
        pcConnections.forEach((socket) => {
            if (socket.subscribedMeet) {
                socket.emit('meetStatusChange', message);
            }
        });
    }
}

/**
 * 推送二维码状态变更
 * @param {string} qrcodeId - 二维码ID
 * @param {object} statusData - 状态数据 { status, statusText, authorization }
 * @param {string|Array<string>} namespaces - 要发送到的命名空间，默认为 ['/pc']
 */
function broadcastQrcodeStatus(qrcodeId, statusData, namespaces = ['/pc']) {
    const targetNamespaces = Array.isArray(namespaces) ? namespaces : [namespaces];

    const message = {
        qrcodeId,
        ...statusData,
    };

    // 发送到 /pc 命名空间（PC端）
    if (targetNamespaces.includes('/pc')) {
        if (pcQrcodeConnections.has(qrcodeId)) {
            const connections = pcQrcodeConnections.get(qrcodeId);
            connections.forEach((socket) => {
                socket.emit('qrcodeStatus', message);
            });
        }
    }
}

module.exports = {
    initializeWebSocket,
    broadcastMeetStatusChange,
    broadcastQrcodeStatus,
};
