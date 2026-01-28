const { getRedisClient, checkRedisAvailable } = require("../config/redis");

// 二维码状态存储（与 qrcodeController.js 保持一致）
const QRCODE_KEY_PREFIX = "qrcode:";
const getQrcodeKey = (qrcodeId) => `${QRCODE_KEY_PREFIX}${qrcodeId}`;

// 简单的消息ID生成器（用于可靠投递）
let globalMessageCounter = 0;
const generateMessageId = () => {
    globalMessageCounter = (globalMessageCounter + 1) % Number.MAX_SAFE_INTEGER;
    return `msg_${Date.now()}_${globalMessageCounter}`;
};

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
 * 向指定 socket 发送「可靠消息」
 * - 自动带上 messageId
 * - 等待前端 ack(messageId)，否则最多重发 3 次
 * @param {import("socket.io").Socket} socket
 * @param {string} event
 * @param {object} payload
 */
function sendReliableMessage(socket, event, payload) {
    if (!socket) return;

    // 为每个 socket 维护一份待确认消息表
    if (!socket._pendingMessages) {
        socket._pendingMessages = new Map(); // messageId -> { event, payload, retries, timer }
    }

    const messageId = generateMessageId();
    const maxRetries = 3;
    const retryInterval = 1000; // 1 秒

    const sendOnce = () => {
        if (!socket.connected) {
            return;
        }
        socket.emit(event, {
            messageId,
            ...payload,
        });
    };

    const scheduleRetry = () => {
        const entry = socket._pendingMessages.get(messageId);
        if (!entry) return;

        if (!socket.connected || entry.retries >= maxRetries) {
            // 超过重试次数或已断开，不再重发（业务可根据需要在此扩展离线存储）
            socket._pendingMessages.delete(messageId);
            return;
        }

        entry.retries += 1;
        entry.timer = setTimeout(() => {
            sendOnce();
            scheduleRetry();
        }, retryInterval);
    };

    // 记录待确认消息并发送第一次
    socket._pendingMessages.set(messageId, {
        event,
        payload,
        retries: 0,
        timer: null,
    });

    sendOnce();
    scheduleRetry();
}

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

        // 初始化 ack 处理：前端收到消息后会发送 ack({ messageId })
        socket.on('ack', (data) => {
            const { messageId } = data || {};
            if (!messageId || !socket._pendingMessages) return;
            const entry = socket._pendingMessages.get(messageId);
            if (entry) {
                if (entry.timer) {
                    clearTimeout(entry.timer);
                }
                socket._pendingMessages.delete(messageId);
            }
        });

        // 会议相关事件
        socket.on('subscribe:meet', () => {
            socket.subscribedMeet = true;
            socket.emit('subscribed:meet', { message: '已订阅会议列表更新' });
        });

        socket.on('unsubscribe:meet', () => {
            socket.subscribedMeet = false;
        });

        // 二维码相关事件
        socket.on('subscribe:qrcode', async (data) => {
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

            // 新增：订阅时立即下发当前二维码状态（如果 Redis 中存在）
            try {
                if (checkRedisAvailable()) {
                    const redis = getRedisClient();
                    const key = getQrcodeKey(qrcodeId);
                    const statusStr = await redis.get(key);
                    if (statusStr) {
                        const status = JSON.parse(statusStr);
                        // 使用可靠消息机制下发当前状态
                        sendReliableMessage(socket, 'qrcodeStatus', {
                            qrcodeId,
                            status: status.status,
                            statusText: status.statusText,
                            authorization: status.authorization || null,
                        });
                    }
                }
            } catch (e) {
                // 下发失败不影响正常订阅，不抛错
            }
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
                sendReliableMessage(socket, 'meetStatusChange', message);
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
                sendReliableMessage(socket, 'qrcodeStatus', message);
            });
        }
    }
}

module.exports = {
    initializeWebSocket,
    broadcastMeetStatusChange,
    broadcastQrcodeStatus,
};
