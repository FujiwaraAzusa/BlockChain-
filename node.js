const Blockchain = require('./blockchain');
const P2PNetwork = require('./p2p');
const fs = require('fs');
const path = require('path');
const WebSocket = require('ws');

const port = process.argv[2]; // ノードのポート指定
const peers = process.argv.slice(3);

const blockchain = new Blockchain();
const p2pNetwork = new P2PNetwork(blockchain);

// DNSシードのアドレス
const dnsSeedAddress = 'ws://localhost:7000';

function connectToDNSSeed(p2pNetwork) {
    const socket = new WebSocket(dnsSeedAddress);
    socket.on('open', () => {
        console.log('Connected to DNS seed');
        // 自身をDNSシードに登録
        socket.send(
            JSON.stringify({
                type: 'ANNOUNCE',
                data: { address: 'localhost', port},
            })
        );
        // ノードリストをリクエスト
        socket.send(
            JSON.stringify({
                type: 'REQUEST',
                data: null,
            })
        );
    });
    // ノードリストを受け取る
    socket.on('message', (message) => {
        const { type, data } = JSON.parse(message);
        if (type === 'NODE_LIST') {
            console.log('Received node list from DNS seed:', data);
            data.forEach((node) => {
                if (node.address && node.port) { // アドレスとポートが存在する場合のみ接続
                    const peer = `ws://${node.address}:${node.port}`;
                    if (!p2pNetwork.sockets.find((s) => s.url === peer)) {
                        p2pNetwork.connectToPeer(peer);
                    }
                }
            });
        }
    });
}
// 起動時にDNSシードに接続
connectToDNSSeed(p2pNetwork);

// データ保存ディレクトリ
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}
const saveFilePath = path.join(dataDir, `node${port}.json`);

// ブロック生成ループ
setInterval(() => {
    console.log('Mining block...');
    blockchain.minePendingTransactions(`node-${port}`);
    p2pNetwork.broadcastChain(); // 最新のチェーンをブロードキャスト
}, 60 * 1000); // 1分ごとにブロック生成


// ブロックチェーンデータの保存
setInterval(() => {
    fs.writeFileSync(saveFilePath, JSON.stringify(blockchain.chain, null, 2));
}, 30 * 1000); // 30秒ごとにデータ保存


// ウォレットアドレス
const walletAddress = `node-${port}`;

// ピアに接続
peers.forEach((peer) => p2pNetwork.connectToPeer(peer));

// トランザクションの送信
function createTransaction(to, amount) {
    const balance = blockchain.getBalanceOfAddress(walletAddress);
    if (balance < amount) {
        console.error('Insufficient balance');
        return;
    }

    const transaction = {
        from: walletAddress,
        to,
        amount,
    };
    blockchain.addTransaction(transaction);
    p2pNetwork.broadcastTransaction(transaction);
}

// 定期的に残高を表示
setInterval(() => {
    const balance = blockchain.getBalanceOfAddress(walletAddress);
    console.log(`Balance of ${walletAddress}: ${balance}`);
}, 15 * 1000);

// CLIで送金コマンドを受付
process.stdin.on('data', (data) => {
    const [command, to, amount] = data.toString().trim().split(' ');
    if (command === 'send') {
        createTransaction(to, parseInt(amount, 10));
    }
});

console.log(`Node started on port ${port}`);