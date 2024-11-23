const Blockchain = require('./blockchain');
const Transaction = require('./transaction');
const P2PNetwork = require('./p2p');
const DNSSeed = require('./dns-seed');

const myBlockchain = new Blockchain();
const p2pNetwork = new P2PNetwork();
const dnsSeed = new DNSSeed();

// DNSシードにノードを追加
dnsSeed.addNode('ws://localhost:6001');
dnsSeed.addNode('ws://localhost:6002');

// トランザクションを作成
myBlockchain.createTransaction(new Transaction('address1', 'address2', 50));
myBlockchain.createTransaction(new Transaction('address2', 'address1', 20));

// マイニング
console.log('Starting the miner...');
myBlockchain.minePendingTransactions('miner-address');

console.log('Blockchain valid?', myBlockchain.isChainValid());
console.log(JSON.stringify(myBlockchain, null, 2));
