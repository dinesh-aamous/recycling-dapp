const express = require('express');
const mysql = require('mysql');
const { Web3 } = require('web3');
const cors = require('cors');
const dotenv = require('dotenv');
const app = express();
const PORT = 3000;

// Load environment variables
dotenv.config();

// Enable CORS
app.use(cors());
app.use(express.json());

// MySQL Connection using XAMPP
const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '', // Default password is empty in XAMPP
    database: 'recycling'
});

// Connect to MySQL
db.connect(err => {
    if (err) {
        console.error('Error connecting to MySQL:', err);
        return;
    }
    console.log('Connected to MySQL database.');
});

// Web3 setup
const web3 = new Web3(process.env.INFURA_URL); // Use Infura, Alchemy, or your local node URL
const contractAddress = process.env.CONTRACT_ADDRESS; // Your deployed contract address
const contractABI = [
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "_initialSupply",
          "type": "uint256"
        }
      ],
      "stateMutability": "nonpayable",
      "type": "constructor"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "address",
          "name": "owner",
          "type": "address"
        },
        {
          "indexed": true,
          "internalType": "address",
          "name": "spender",
          "type": "address"
        },
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "value",
          "type": "uint256"
        }
      ],
      "name": "Approval",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "address",
          "name": "from",
          "type": "address"
        },
        {
          "indexed": true,
          "internalType": "address",
          "name": "to",
          "type": "address"
        },
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "value",
          "type": "uint256"
        }
      ],
      "name": "Transfer",
      "type": "event"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "",
          "type": "address"
        },
        {
          "internalType": "address",
          "name": "",
          "type": "address"
        }
      ],
      "name": "allowance",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function",
      "constant": true
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "",
          "type": "address"
        }
      ],
      "name": "balanceOf",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function",
      "constant": true
    },
    {
      "inputs": [],
      "name": "decimals",
      "outputs": [
        {
          "internalType": "uint8",
          "name": "",
          "type": "uint8"
        }
      ],
      "stateMutability": "view",
      "type": "function",
      "constant": true
    },
    {
      "inputs": [],
      "name": "name",
      "outputs": [
        {
          "internalType": "string",
          "name": "",
          "type": "string"
        }
      ],
      "stateMutability": "view",
      "type": "function",
      "constant": true
    },
    {
      "inputs": [],
      "name": "symbol",
      "outputs": [
        {
          "internalType": "string",
          "name": "",
          "type": "string"
        }
      ],
      "stateMutability": "view",
      "type": "function",
      "constant": true
    },
    {
      "inputs": [],
      "name": "totalSupply",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function",
      "constant": true
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "_to",
          "type": "address"
        },
        {
          "internalType": "uint256",
          "name": "_value",
          "type": "uint256"
        }
      ],
      "name": "transfer",
      "outputs": [
        {
          "internalType": "bool",
          "name": "success",
          "type": "bool"
        }
      ],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "_spender",
          "type": "address"
        },
        {
          "internalType": "uint256",
          "name": "_value",
          "type": "uint256"
        }
      ],
      "name": "approve",
      "outputs": [
        {
          "internalType": "bool",
          "name": "success",
          "type": "bool"
        }
      ],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "_from",
          "type": "address"
        },
        {
          "internalType": "address",
          "name": "_to",
          "type": "address"
        },
        {
          "internalType": "uint256",
          "name": "_value",
          "type": "uint256"
        }
      ],
      "name": "transferFrom",
      "outputs": [
        {
          "internalType": "bool",
          "name": "success",
          "type": "bool"
        }
      ],
      "stateMutability": "nonpayable",
      "type": "function"
    }
]; // Parse contract ABI
const contract = new web3.eth.Contract(contractABI, contractAddress);

// Wallet setup (admin account for transactions)
const adminAddress = process.env.ADMIN_ADDRESS; // Your admin wallet address
const privateKey = process.env.PRIVATE_KEY; // Your admin wallet private key

// Connect wallet endpoint
app.post('/api/connect', (req, res) => {
    const { address } = req.body;
    const query = 'INSERT IGNORE INTO users (address) VALUES (?)';
    db.query(query, [address], (err, result) => {
        if (err) {
            console.error('Error inserting address:', err);
            return res.json({ success: false });
        }
        return res.json({ success: true });
    });
});

// Submit recycling data endpoint
app.post('/api/submit', async (req, res) => {
    const { address, plastic, metal, others } = req.body;
    const totalTokens = plastic + metal + others; // Calculate total tokens to send

    // Update database
    const query = 'UPDATE users SET plastic = plastic + ?, metal = metal + ?, others = others + ? WHERE address = ?';
    db.query(query, [plastic, metal, others, address], async (err, result) => {
        if (err) {
            console.error('Error updating recycling data:', err);
            return res.json({ success: false });
        }

        try {
            const decimals = await contract.methods.decimals().call();

            // Convert totalTokens to BigInt
            const totalTokensBigInt = BigInt(totalTokens);

            // Calculate token amount using BigInt
            const tokenAmount = totalTokensBigInt * BigInt(10) ** BigInt(decimals);

            // Estimate gas price and gas limit
            const gasPrice = await web3.eth.getGasPrice();
            const gasLimit = 650000; // Reasonable gas limit for ERC-20 transfer

            // Check Ether balance before sending the transaction
            const balanceWei = await web3.eth.getBalance(adminAddress);
            const balanceEther = web3.utils.fromWei(balanceWei, 'ether');
            console.log('Admin Balance in Ether:', balanceEther);

            // Check if balance is sufficient
            const totalGasCost = BigInt(gasPrice) * BigInt(gasLimit);
            if (BigInt(balanceWei) < totalGasCost) {
                console.error('Insufficient funds for gas');
                return res.json({ success: false, message: 'Insufficient funds for gas' });
            }

            // Create transaction object
            const tx = {
                from: adminAddress,
                to: contractAddress,
                gas: gasLimit,
                gasPrice: gasPrice,
                data: contract.methods.transfer(address, tokenAmount.toString()).encodeABI()
            };

            // Sign the transaction
            const signedTx = await web3.eth.accounts.signTransaction(tx, privateKey);

            // Send the signed transaction
            const receipt = await web3.eth.sendSignedTransaction(signedTx.rawTransaction);
            console.log('Transaction receipt:', receipt);

            return res.json({ success: true, transactionHash: receipt.transactionHash });
        } catch (error) {
            console.error('Error submitting recycling data:', error);
            return res.json({ success: false });
        }
    });
});

// Server listening
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
