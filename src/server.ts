import express from 'express';
import bodyParser from 'body-parser';
import { Blockchain, Transaction, Wallet } from './blockchain';
import solc from 'solc'; // Certifique-se de ter o solc instalado
import fs from 'fs';
import path from 'path';
import Web3 from 'web3';

const app = express();
const port = process.env.PORT || 3000;
const blockchain = new Blockchain(24000000); // Total de 24 milhões de tokens PIN
const web3 = new Web3(new Web3.providers.HttpProvider("http://localhost:8545"));

app.use(bodyParser.json());

app.post('/wallet', (req, res) => {
  const wallet = blockchain.createWallet();
  res.status(200).json(wallet);
});

app.post('/importWallet', (req, res) => {
  const { privateKey } = req.body;
  const account = web3.eth.accounts.privateKeyToAccount(privateKey);
  const wallet: Wallet = {
    id: account.address,
    publicKey: account.address,
    privateKey: account.privateKey,
    balance: 100 // Saldo inicial de 100 tokens
  };
  blockchain.wallets.push(wallet);
  blockchain.balances[wallet.publicKey] = { [blockchain.tokenName]: 100 }; // Saldo inicial de 100 tokens
  res.status(200).json(wallet);
});

app.get('/wallets', (req, res) => {
  const wallets = blockchain.getWallets();
  wallets.forEach(wallet => {
    wallet.balance = blockchain.getBalanceOfAddress(wallet.publicKey, blockchain.tokenName);
  });
  res.status(200).json(wallets);
});

app.get('/balance/:address/:tokenType', (req, res) => {
  const balance = blockchain.getBalanceOfAddress(req.params.address, req.params.tokenType);
  res.status(200).json({ balance });
});

app.post('/transaction', (req, res) => {
  const { fromAddress, toAddress, amount, tokenType } = req.body;
  const transaction: Transaction = { fromAddress, toAddress, amount, tokenType };
  try {
    blockchain.createTransaction(transaction);
    res.status(200).send('Transaction successful');
  } catch (error: any) {
    res.status(400).send(error.message);
  }
});

app.post('/mine', (req, res) => {
  const { miningRewardAddress } = req.body;
  blockchain.minePendingTransactions(miningRewardAddress);
  res.status(200).send('Mining complete');
});

app.get('/chain', (req, res) => {
  res.status(200).json(blockchain.chain);
});

// Endpoint para deploy de token
app.post('/deployToken', async (req, res) => {
  try {
    const source = fs.readFileSync(path.resolve(__dirname, '../src/contracts/ERC20Token.sol'), 'utf8');
    const compiled = solc.compile(source, 1);
    const contract = compiled.contracts[':ERC20Token'];

    const initialSupply = req.body.initialSupply;
    const contractInstance = new web3.eth.Contract(JSON.parse(contract.interface));
    const accounts = await web3.eth.getAccounts();

    const deployOptions = {
      data: '0x' + contract.bytecode,
      arguments: [initialSupply]
    };

    const sendOptions = {
      from: accounts[0],
      gas: '1500000',
      gasPrice: '30000000000'
    };

    const newContractInstance = await contractInstance.deploy(deployOptions).send(sendOptions);

    res.status(200).json({
      address: newContractInstance.options.address,
      contract: contract.interface
    });
  } catch (error: any) {
    res.status(400).send(error.message);
  }
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
