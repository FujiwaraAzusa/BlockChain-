const crypto = require('crypto');

class Block {
    constructor(index, timestamp, data, previousHash = '') {
        this.index = index;
        this.timestamp = timestamp;
        this.data = data;
        this.previousHash = previousHash;
        this.nonce = 0;
        this.hash = this.calculateHash();
    }

    calculateHash() {
        return crypto
            .createHash('sha256')
            .update(this.index + this.timestamp + JSON.stringify(this.data) + this.previousHash + this.nonce)
            .digest('hex');
    }

    mineBlock(difficulty) {
        while (!this.hash.startsWith('0'.repeat(difficulty))) {
            this.nonce++;
            this.hash = this.calculateHash();
        }
        console.log(`Block mined: ${this.hash}`);
    }
}

class Blockchain {
    constructor() {
        this.chain = []; // ブロックチェーンのデータ
        this.pendingTransactions = []; // 未確認トランザクション
        this.createGenesisBlock();
    }

    createGenesisBlock() {
        const genesisBlock = this.createBlock([], '0');
        this.chain.push(genesisBlock);
    }

    createBlock(transactions, previousHash) {
        return {
            index: this.chain.length + 1,
            timestamp: Date.now(),
            transactions,
            previousHash,
        };
    }

    addTransaction(transaction) {
        this.pendingTransactions.push(transaction);
    }

    minePendingTransactions(minerAddress) {
        const block = this.createBlock(this.pendingTransactions, this.getLatestBlockHash());
        this.chain.push(block);

        // マイニング報酬を追加
        this.pendingTransactions = [
            {
                from: null,
                to: minerAddress,
                amount: 10, // 報酬（簡易設定）
            },
        ];
    }

    getLatestBlockHash() {
        return this.chain[this.chain.length - 1].previousHash || '0';
    }

    getBalanceOfAddress(address) {
        let balance = 0;
        this.chain.forEach((block) => {
            block.transactions.forEach((transaction) => {
                if (transaction.from === address) balance -= transaction.amount;
                if (transaction.to === address) balance += transaction.amount;
            });
        });
        return balance;
    }
}

module.exports = Blockchain;
