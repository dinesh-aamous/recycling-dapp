// Initialize Web3
let web3;
let userAddress;
let plasticCount = 0;
let metalCount = 0;
let othersCount = 0;

// Check if the user has MetaMask installed
if (typeof window.ethereum !== 'undefined') {
    web3 = new Web3(window.ethereum);
    console.log("MetaMask is installed!");
} else {
    alert("Please install MetaMask to use this app!");
}

// Connect wallet
document.getElementById("connectButton").addEventListener("click", async () => {
    try {
        const accounts = await ethereum.request({ method: 'eth_requestAccounts' });
        userAddress = accounts[0];
        console.log("Connected address:", userAddress);
        document.getElementById('walletAddress').innerHTML = `<strong>Connected Wallet Address:</strong> ${userAddress}`;

        // Send user address to the server
        fetch('http://localhost:3000/api/connect', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ address: userAddress })
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                document.getElementById("recycleForm").style.display = "block";
            } else {
                alert("Error connecting to the server!");
            }
        });
    } catch (error) {
        console.error("Error connecting to wallet:", error);
    }
});

// Add item buttons
document.getElementById("addPlastic").addEventListener("click", () => {
    plasticCount++;
    updateCount();
});

document.getElementById("addMetal").addEventListener("click", () => {
    metalCount++;
    updateCount();
});

document.getElementById("addOthers").addEventListener("click", () => {
    othersCount++;
    updateCount();
});

function updateCount() {
    document.getElementById("plasticCount").innerText = plasticCount;
    document.getElementById("metalCount").innerText = metalCount;
    document.getElementById("othersCount").innerText = othersCount;
    console.log("Plastic:", plasticCount, "Metal:", metalCount, "Others:", othersCount);
}

// Submit form
document.getElementById("submitButton").addEventListener("click", () => {
    const data = {
        address: userAddress,
        plastic: plasticCount,
        metal: metalCount,
        others: othersCount
    };

    // Send data to the server
    fetch('http://localhost:3000/api/submit', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            alert("Data submitted successfully! Tokens will be sent to your wallet.");
            // Reset counts
            plasticCount = 0;
            metalCount = 0;
            othersCount = 0;
            updateCount();
        } else {
            alert("Error submitting data!");
        }
    });
});
