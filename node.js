const WebSocket = require('ws');

// DNSシードサーバーのアドレス（IPv4）
const SERVER_URL = 'ws://127.0.0.1:7000'; // IPv4でlocalhostを指定

// クライアントのポート番号（コマンドライン引数で指定）
const clientPort = process.argv[2] || 6000;
console.log(`サーバーを開始します。ポート:${clientPort}`);

// 接続済みノードの管理（接続済みノードのIP:ポートを保持）
const connectedNodes = new Set();
let serverIP;

// DNSシードサーバーへの接続
const ws = new WebSocket(SERVER_URL);

// サーバーの作成（他のノードからの接続を待機）
const server = new WebSocket.Server({ port: clientPort });
console.log(`ローカルサーバーがポート ${clientPort} で待機中...`);

server.on('connection', (socket) => {
    // 他のノードからメッセージを受け取る
    socket.on('message', (message) => {
        try {
            // メッセージがバイナリの場合はUTF-8にデコードしてからJSONとしてパース
            const messageString = message.toString('utf8');
            const parsedMessage = JSON.parse(messageString);

            // 受信したメッセージに基づいて処理
            if (parsedMessage.type === 'connected') {
                console.log(`新たなノードが接続しました: ${parsedMessage.serverIP}:${parsedMessage.port}`);
                // 接続元ノードを接続済みリストに追加
                const clientId = `${parsedMessage.serverIP}:${parsedMessage.port}`;
                connectedNodes.add(clientId);
            } else {
                console.log('メッセージを受信:', parsedMessage);
            }
        } catch (err) {
            console.error('メッセージのパースエラー:', err);
        }
    });

    // 接続が切断されたときの処理
    socket.on('close', () => {
        console.log(`${clientAddress} との接続が切断されました`);
        connectedNodes.delete(clientId);
    });

    // エラー処理
    socket.on('error', (error) => {
        console.error('接続エラー:', error);
    });
});


// DNSシードサーバーとの接続が開いたとき
ws.on('open', () => {
    console.log('DNSシードサーバーに接続しました');

    // 自身のポート番号をサーバーに登録
    ws.send(JSON.stringify({ type: 'register', port: clientPort }));

    // 最初のリスト取得要求
    ws.send(JSON.stringify({ type: 'requestList' }));

    // 30秒ごとにリストを再取得
    setInterval(() => {
        console.log("30秒経過したので、ノードリストを再取得します...");
        ws.send(JSON.stringify({ type: 'requestList' }));
    }, 30000);
});

// メッセージを受け取ったとき
ws.on('message', (data) => {
    try {
        const message = JSON.parse(data);

        if (message.type === 'connected') {
            console.log(`このノードのアドレス: ${message.serverIP}:${clientPort}`);
            serverIP = message.serverIP;
        }

        if (message.type === 'list') {
            console.log('ノードクライアントリストを受信しました:', message.list);

            // 新たに追加されたノードに接続する処理
            message.list.forEach((node) => {
                const nodeId = `${node.ip}:${node.port}`;

                // 自分自身をスキップ（IPとポートの両方を確認）
                if ((node.ip == serverIP || node.ip == "127.0.0.1" || node.ip == "localhost") && node.port === clientPort) {
                    console.log("自身をスキップしました。");
                    return;
                }

                // 既に接続済みのノードかどうかをチェック
                if (connectedNodes.has(nodeId)) {
                    console.log(`ノード ${nodeId} はすでに接続されています。スキップします。`);
                    return;
                }

                // ノードへの接続を試みる
                const nodeWs = new WebSocket(`ws://${node.ip}:${node.port}`);

                nodeWs.on('open', () => {
                    console.log(`ノードへの新たな接続確立: ${nodeId}`);
                    connectedNodes.add(nodeId); // 接続成功したらセットに追加

                    // 相手ノードに接続通知を送信（AからBへの接続完了を伝える）
                    nodeWs.send(JSON.stringify({ type: 'connected', serverIP: serverIP, port: clientPort }));
                });

                nodeWs.on('close', () => {
                    console.log(`ノードから切断されました: ${nodeId}`);
                    connectedNodes.delete(nodeId); // 接続が切断されたらセットから削除
                });

                nodeWs.on('error', (error) => {
                    console.error(`ノード間の接続エラー: ${nodeId}`, error);
                });
            });
        }
    } catch (err) {
        console.error('エラー:', err);
    }
});

// 接続が閉じられたとき
ws.on('close', () => {
    console.log('DNSシードサーバーから切断されました');
});

// WebSocketのエラー処理
ws.on('error', (error) => {
    console.error('WebSocketエラー:', error);
});
