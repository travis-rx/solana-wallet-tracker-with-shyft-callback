require('dotenv').config();
var express = require("express");
var bodyParser = require("body-parser");
const fetch = require('node-fetch');
const ngrok = require('ngrok');

var app = express();

EXECUTE = process.env.EXECUTE;

// Middleware to parse JSON bodies
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

const port = 3000;

// Headers for API request
const myHeaders = {
    "x-api-key": process.env.SHYFT_API_KEY,
    "Content-Type": "application/json"
};

async function start(){

    await removeCallback()

createCallback()

}

if(EXECUTE === 'TRACK'){
    start()
}else if(EXECUTE === 'REMOVE'){
    removeCallback()
}else {
    return
}

// createCallback()
async function listCallbacks() {
    var requestOptions = {
        method: 'GET',
        headers: myHeaders,
        redirect: 'follow'
    };

    try {
        // To get the list of callbacks
        const response = await fetch("https://api.shyft.to/sol/v1/callback/list", requestOptions);
        const result = await response.json(); 
        // console.log(result);

        if (result.success && result.result) {

            return result.result.map(callback => callback._id);

        } else {
            throw new Error("Failed to fetch callbacks");
        }
    } catch (error) {
        console.log('error', error);
        throw error; 
    }
}

async function removeCallback() {
    try {
        const callbackIds = await listCallbacks();

        if(callbackIds.length === 0){ return }
        
        for (const callbackId of callbackIds) {
            var raw = JSON.stringify({
                "id": callbackId
            });

            var requestOptions = {
                method: 'DELETE',
                headers: myHeaders,
                body: raw,
                redirect: 'follow'
            };

            try {
                // Remove the callback
                const response = await fetch("https://api.shyft.to/sol/v1/callback/remove", requestOptions);
                const result = await response.text();
                console.log(`Removed callback with ID: ${callbackId}`);
                console.log(result);
                return result
            } catch (error) {
                console.log(`Error removing callback with ID: ${callbackId}`, error);
            }
        }
    } catch (error) {
        console.log('error', error);
        throw error; 
    }
}



async function startWebhook() {
    
    // Start the server
    app.listen(port, '0.0.0.0', async () => {
        console.log('Server listening on port', port);
 
        // Ngrok setup
        try {
            const url = await ngrok.connect({
                proto: 'http', 
                addr: port, 
                authtoken: process.env.NGROK_AUTH_TOKEN,
                hostname: process.env.NGROK_WEBHOOK, 
            });

            console.log(`ngrok tunnel created at: ${url}`);
        } catch (error) {
            console.error('Error setting up ngrok:', error);
        }
    });
}

async function createCallback() {
    await startWebhook();

    setTimeout(() => { }, 1000); 

    // The raw payload for Shyft API request
    var raw = JSON.stringify({
        "network": "mainnet-beta", 
        "addresses": [
            "AC5RDfQFmDS1deWZos921JfqscXdByf8BKHs5ACWjtW2",
            "H8sMJSCQxfKiFTCfDR3DUMLPwcRbM61LGFJ8N4dK3WjS",
            "G2YxRa6wt1qePMwfJzdXZG62ej4qaTC7YURzuh2Lwd3t"
        ],
        "callback_url": "https://" + `${process.env.NGROK_WEBHOOK}` + "/callback", // Replace with your webhook url or ngrok static url
        "events": [
            "SOL_TRANSFER"
        ]
    });

    // Setting up request options
    var requestOptions = {
        method: 'POST',
        headers: myHeaders,
        body: raw,
        redirect: 'follow'
    };

    try {
        // Create callback
        const response = await fetch("https://api.shyft.to/sol/v1/callback/create", requestOptions);
        const result = await response.text();
        console.log(result);
        return result;
    } catch (error) {
        console.log('error', error);
        throw error; 
    }
}

// Define the callback route
app.post('/callback', (req, res) => {
    const { signatures, actions } = req.body;
    
    // Check if actions array exists and extract info objects
    if (actions && actions.length > 0) {
        // actions.forEach((action, index) => {
        //     console.log(`Action ${index + 1} Info:`, action.info);
        // });
        console.log("Signatures", signatures[0])
        console.log(actions[actions.length - 1].info)
    } else {
        console.log('No actions found in callback.');
    }
    
    res.status(200).send('Callback received'); 
});

