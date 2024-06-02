import { v4 as uuidv4 } from 'uuid';
import { createHash } from 'crypto';

interface Transaction {
  fromAddress: string;
  toAddress: string;
  amount: number;
  tokenType: string;
}

interface Block {
  index: number;
  timestamp: number;
  transactions: Transaction[];
  previousHash: string;
  hash: string;
  nonce: number;
}

interface Wallet {
  id: string;
  publicKey: string;
  privateKey: string;
  balance: number;
}

class Blockchain {
  chain: Block[];
  difficulty: number;
  pendingTransactions: Transaction[];
  miningReward: number;
  totalTokens: number;
  remainingTokens: number;
  tokenName: string;
  wallets: Wallet[];
  balances: { [key: string]: { [tokenType: string]: number } };

  constructor(totalTokens: number) {
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

  createGenesisBlock(): Block {
    return {
      index: 0,
      timestamp: Date.now(),
      transactions: [],
      previousHash: "0",
      hash: this.calculateHash(Date.now().toString()),
      nonce: 0
    };
  }

  calculateHash(data: string): string {
    return createHash('sha256').update(data).digest('hex');
  }

  getLatestBlock(): Block {
    return this.chain[this.chain.length - 1];
  }

  minePendingTransactions(miningRewardAddress: string) {
    if (this.remainingTokens < this.miningReward) {
      console.log('Not enough tokens remaining to reward mining.');
      return;
    }

    const rewardTx: Transaction = {
      fromAddress: '',
      toAddress: miningRewardAddress,
      amount: this.miningReward,
      tokenType: this.tokenName
    };

    this.pendingTransactions.push(rewardTx);

    const block: Block = {
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

  proofOfWork(block: Block): string {
    while (!block.hash.startsWith(Array(this.difficulty + 1).join("0"))) {
      block.nonce++;
      block.hash = this.calculateHash(JSON.stringify(block));
    }
    return block.hash;
  }

  createTransaction(transaction: Transaction) {
    if (this.verifyTransaction(transaction)) {
      this.pendingTransactions.push(transaction);
      this.minePendingTransactions(this.getWalletWithHighestBalance().publicKey);
    } else {
      throw new Error('Invalid transaction');
    }
  }

  getWalletWithHighestBalance(): Wallet {
    return this.wallets.reduce((prev, current) => 
      (this.getBalanceOfAddress(current.publicKey, this.tokenName) > this.getBalanceOfAddress(prev.publicKey, this.tokenName)) ? current : prev
    );
  }

  getBalanceOfAddress(address: string, tokenType: string): number {
    if (!this.balances[address]) {
      return 0;
    }
    return this.balances[address][tokenType] || 0;
  }

  isChainValid(): boolean {
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

  createWallet(): Wallet {
    const id = uuidv4();
    const publicKey = '0x' + createHash('sha256').update(id).digest('hex').slice(0, 40).toUpperCase();
    const privateKey = createHash('sha256').update(publicKey).digest('hex');
    const wallet = { id, publicKey, privateKey, balance: 100 }; // Saldo inicial de 100 tokens
    this.wallets.push(wallet);

    this.balances[wallet.publicKey] = { [this.tokenName]: 100 }; // Saldo inicial de 100 tokens
    return wallet;
  }

  importWallet(privateKey: string): Wallet {
    const publicKey = '0x' + createHash('sha256').update(privateKey).digest('hex').slice(0, 40).toUpperCase();
    const wallet = { id: uuidv4(), publicKey, privateKey, balance: 100 }; // Saldo inicial de 100 tokens
    this.wallets.push(wallet);
    this.balances[wallet.publicKey] = { [this.tokenName]: 100 }; // Saldo inicial de 100 tokens
    return wallet;
  }

  getWallets(): Wallet[] {
    return this.wallets;
  }

  verifyTransaction(transaction: Transaction): boolean {
    return this.getBalanceOfAddress(transaction.fromAddress, transaction.tokenType) >= transaction.amount;
  }

  updateBalances(transaction: Transaction) {
    if (transaction.fromAddress) {
      this.balances[transaction.fromAddress][transaction.tokenType] =
        (this.balances[transaction.fromAddress][transaction.tokenType] || 0) - transaction.amount;
    }
    this.balances[transaction.toAddress][transaction.tokenType] =
      (this.balances[transaction.toAddress][transaction.tokenType] || 0) + transaction.amount;
  }
}

export { Blockchain, Transaction, Wallet };
