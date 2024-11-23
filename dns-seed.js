const WebSocket = require('ws');

class DNSSeed {
    constructor(port) {
        this.port = port || 7000; // デフォルトポート
        this.nodes = []; // ノードリスト
    }

    start() {
        const server = new WebSocket.Server({ port: this.port });

        server.on('connection', (socket) => {
            console.log('New connection to DNS seed');
            
            socket.on('message', (message) => {
                const { type, data } = JSON.parse(message);

                if (type === 'ANNOUNCE') {
                    this.addNode(data);
                } else if (type === 'REQUEST') {
                    this.sendNodeList(socket);
                }
            });
        });

        console.log(`DNS Seed running on port ${this.port}`);
    }

    addNode(nodeInfo) {
        if (!nodeInfo.address || !nodeInfo.port) {
            console.error('Invalid node info:', nodeInfo);
            return;
        }
    
        const exists = this.nodes.find(
            (node) => node.address === nodeInfo.address && node.port === nodeInfo.port
        );
    
        if (!exists) {
            this.nodes.push(nodeInfo);
            console.log(`Node added: ${nodeInfo.address}:${nodeInfo.port}`);
        }
    }    

    sendNodeList(socket) {
        socket.send(JSON.stringify({ type: 'NODE_LIST', data: this.nodes }));
    }
}

// 実行
const dnsSeed = new DNSSeed(7000);
dnsSeed.start();