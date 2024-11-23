const WebSocket = require('ws');
const os = require('os');
const clients = new Map(); // クライアントのIPとポートを記録

// DNSシードサーバーのポート番号
const port = 7000;
const server = new WebSocket.Server({ port: port });

console.log(`DNSシードサーバーを開始しました ${port} ポート`);

// IPv4アドレスのみを取得する
const getLocalIP = () => {
    const interfaces = os.networkInterfaces();
    for (const iface of Object.values(interfaces)) {
        for (const details of iface) {
            if (details.family === 'IPv4' && !details.internal) {
                return details.address;
            }
        }
    }
    return '127.0.0.1'; // IPv4ループバックアドレス
};

// 接続元のIPをIPv4形式に変換する（IPv6-mapped IPv4の場合も処理）
const getClientIP = (rawIP) => {
    const ipv6Pattern = /^::ffff:/; // IPv4-mapped IPv6のプレフィックス
    if (ipv6Pattern.test(rawIP)) {
        return rawIP.replace(ipv6Pattern, ''); // IPv6-mapped IPv4をIPv4に変換
    }
    return rawIP; // IPv6またはIPv4の場合そのまま
};

server.on('connection', (ws, req) => {
    const clientAddress = getClientIP(req.socket.remoteAddress); // クライアントのIPアドレスを取得し、IPv4に変換

    console.log(`新たな接続: ${clientAddress}`);

    // 接続元に自分のIPを通知
    ws.send(JSON.stringify({ type: 'connected', serverIP: clientAddress }));
    
    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message);
            if (data.type === 'register') {
                // クライアントからポート番号を受信して登録
                const clientInfo = { ip: clientAddress, port: data.port };
                clients.set(ws, clientInfo);
                console.log(`登録: ${clientAddress}:${data.port}`);
            } else if (data.type === 'requestList') {
                // クライアントがリストを要求
                const list = Array.from(clients.values());
                ws.send(JSON.stringify({ type: 'list', list }));
            }
        } catch (err) {
            console.error('エラー:', err);
        }
    });

    ws.on('close', () => {
        // クライアントが切断された場合に削除
        if (clients.has(ws)) {
            const clientInfo = clients.get(ws);
            console.log(`切断: ${clientInfo.ip}:${clientInfo.port}`);
            clients.delete(ws);
        }
    });

    ws.on('error', (error) => {
        console.error('WebSocketエラー:', error);
    });
});