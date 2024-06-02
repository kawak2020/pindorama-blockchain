"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Blockchain = void 0;
const uuid_1 = require("uuid");
const crypto_1 = require("crypto");
class Blockchain {
    constructor(totalTokens) {
        this.chain = [this.createGenesisBlock()];
        this.difficulty = 2;
        this.pendingTransactions = [];
        this.miningReward = 50; // Recompensa por minerar é de 50 tokens PIN
        this.totalTokens = totalTokens;
        this.remainingTokens = totalTokens;
        this.tokenName = 'PIN';
        this.wallets = [];
        this.balances = {};
    }
    createGenesisBlock() {
        return {
            index: 0,
            timestamp: Date.now(),
            transactions: [],
            previousHash: "0",
            hash: this.calculateHash(Date.now().toString()),
            nonce: 0
        };
    }
    calculateHash(data) {
        return (0, crypto_1.createHash)('sha256').update(data).digest('hex');
    }
    getLatestBlock() {
        return this.chain[this.chain.length - 1];
    }
    minePendingTransactions(miningRewardAddress) {
        if (this.remainingTokens < this.miningReward) {
            console.log('Not enough tokens remaining to reward mining.');
            return;
        }
        const rewardTx = {
            fromAddress: '',
            toAddress: miningRewardAddress,
            amount: this.miningReward,
            tokenType: this.tokenName
        };
        this.pendingTransactions.push(rewardTx);
        const block = {
            index: this.chain.length,
            timestamp: Date.now(),
            transactions: [...this.pendingTransactions],
            previousHash: this.getLatestBlock().hash,
            hash: '',
            nonce: 0
        };
        block.hash = this.proofOfWork(block);
        this.chain.push(block);
        this.pendingTransactions.forEach(tx => this.updateBalances(tx));
        this.pendingTransactions = [];
        this.remainingTokens -= this.miningReward;
    }
    proofOfWork(block) {
        while (!block.hash.startsWith(Array(this.difficulty + 1).join("0"))) {
            block.nonce++;
            block.hash = this.calculateHash(JSON.stringify(block));
        }
        return block.hash;
    }
    createTransaction(transaction) {
        if (this.verifyTransaction(transaction)) {
            this.pendingTransactions.push(transaction);
            this.minePendingTransactions(this.getWalletWithHighestBalance().publicKey);
        }
        else {
            throw new Error('Invalid transaction');
        }
    }
    getWalletWithHighestBalance() {
        return this.wallets.reduce((prev, current) => (this.getBalanceOfAddress(current.publicKey, this.tokenName) > this.getBalanceOfAddress(prev.publicKey, this.tokenName)) ? current : prev);
    }
    getBalanceOfAddress(address, tokenType) {
        if (!this.balances[address]) {
            return 0;
        }
        return this.balances[address][tokenType] || 0;
    }
    isChainValid() {
        for (let i = 1; i < this.chain.length; i++) {
            const currentBlock = this.chain[i];
            const previousBlock = this.chain[i - 1];
            if (currentBlock.hash !== this.calculateHash(JSON.stringify(currentBlock))) {
                return false;
            }
            if (currentBlock.previousHash !== previousBlock.hash) {
                return false;
            }
        }
        return true;
    }
    createWallet() {
        const id = (0, uuid_1.v4)();
        const publicKey = '0x' + (0, crypto_1.createHash)('sha256').update(id).digest('hex').slice(0, 40).toUpperCase();
        const privateKey = (0, crypto_1.createHash)('sha256').update(publicKey).digest('hex');
        const wallet = { id, publicKey, privateKey, balance: 100 }; // Saldo inicial de 100 tokens
        this.wallets.push(wallet);
        this.balances[wallet.publicKey] = { [this.tokenName]: 100 }; // Saldo inicial de 100 tokens
        return wallet;
    }
    importWallet(privateKey) {
        const publicKey = '0x' + (0, crypto_1.createHash)('sha256').update(privateKey).digest('hex').slice(0, 40).toUpperCase();
        const wallet = { id: (0, uuid_1.v4)(), publicKey, privateKey, balance: 100 }; // Saldo inicial de 100 tokens
        this.wallets.push(wallet);
        this.balances[wallet.publicKey] = { [this.tokenName]: 100 }; // Saldo inicial de 100 tokens
        return wallet;
    }
    getWallets() {
        return this.wallets;
    }
    verifyTransaction(transaction) {
        return this.getBalanceOfAddress(transaction.fromAddress, transaction.tokenType) >= transaction.amount;
    }
    updateBalances(transaction) {
        if (transaction.fromAddress) {
            this.balances[transaction.fromAddress][transaction.tokenType] =
                (this.balances[transaction.fromAddress][transaction.tokenType] || 0) - transaction.amount;
        }
        this.balances[transaction.toAddress][transaction.tokenType] =
            (this.balances[transaction.toAddress][transaction.tokenType] || 0) + transaction.amount;
    }
}
exports.Blockchain = Blockchain;
