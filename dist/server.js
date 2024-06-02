"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const body_parser_1 = __importDefault(require("body-parser"));
const blockchain_1 = require("./blockchain");
const solc_1 = __importDefault(require("solc")); // Certifique-se de ter o solc instalado
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const web3_1 = __importDefault(require("web3"));
const app = (0, express_1.default)();
const port = process.env.PORT || 3000;
const blockchain = new blockchain_1.Blockchain(24000000); // Total de 24 milhões de tokens PIN
const web3 = new web3_1.default(new web3_1.default.providers.HttpProvider("http://localhost:8545"));
app.use(body_parser_1.default.json());
app.post('/wallet', (req, res) => {
    const wallet = blockchain.createWallet();
    res.status(200).json(wallet);
});
app.post('/importWallet', (req, res) => {
    const { privateKey } = req.body;
    const account = web3.eth.accounts.privateKeyToAccount(privateKey);
    const wallet = {
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
    const transaction = { fromAddress, toAddress, amount, tokenType };
    try {
        blockchain.createTransaction(transaction);
        res.status(200).send('Transaction successful');
    }
    catch (error) {
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
app.post('/deployToken', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const source = fs_1.default.readFileSync(path_1.default.resolve(__dirname, '../src/contracts/ERC20Token.sol'), 'utf8');
        const compiled = solc_1.default.compile(source, 1);
        const contract = compiled.contracts[':ERC20Token'];
        const initialSupply = req.body.initialSupply;
        const contractInstance = new web3.eth.Contract(JSON.parse(contract.interface));
        const accounts = yield web3.eth.getAccounts();
        const deployOptions = {
            data: '0x' + contract.bytecode,
            arguments: [initialSupply]
        };
        const sendOptions = {
            from: accounts[0],
            gas: '1500000',
            gasPrice: '30000000000'
        };
        const newContractInstance = yield contractInstance.deploy(deployOptions).send(sendOptions);
        res.status(200).json({
            address: newContractInstance.options.address,
            contract: contract.interface
        });
    }
    catch (error) {
        res.status(400).send(error.message);
    }
}));
app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
