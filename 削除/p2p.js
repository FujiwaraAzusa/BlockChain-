const WebSocket = require('ws');

class P2PNetwork {
    constructor(blockchain) {
        this.blockchain = blockchain;
        this.sockets = [];
    }

    connectToPeer(peer) {
        const socket = new WebSocket(peer);

        socket.on('open', () => {
            this.sockets.push(socket);
            this.setupSocket(socket);
            console.log(`Connected to peer: ${peer}`);
        });

        socket.on('error', (err) => console.error(`Connection failed: ${err.message}`));
    }

    setupSocket(socket) {
        socket.on('message', (message) => {
            const { type, data } = JSON.parse(message);

            if (type === 'CHAIN') {
                console.log('Received blockchain data.');
                if (this.blockchain.replaceChain(data)) {
                    console.log('Blockchain replaced with received chain.');
                } else {
                    console.log('Received chain rejected.');
                }
            } else if (type === 'TRANSACTION') {
                this.blockchain.addTransaction(data);
                console.log('Received transaction:', data);
            }
        });
    }

    broadcastTransaction(transaction) {
        this.sockets.forEach((socket) =>
            socket.send(
                JSON.stringify({
                    type: 'TRANSACTION',
                    data: transaction,
                })
            )
        );
    }

    broadcastChain() {
        const chainData = JSON.stringify({
            type: 'CHAIN',
            data: this.blockchain.chain,
        });

        this.sockets.forEach((socket) => socket.send(chainData));
    }
}

module.exports = P2PNetwork;
