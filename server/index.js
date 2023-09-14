require('dotenv').config(); // Load environment variables from .env file
const axios = require('axios');

const express = require('express');
const bodyParser = require('body-parser');

const { Client, Config, CheckoutAPI } = require("@adyen/api-library");

const cors = require('cors');

const corsOptions = {
    origin: 'http://localhost:3000', // Replace with the origin(s) you want to allow
  };
  
const app = express();
const port = 3001;

app.use(cors(corsOptions));
app.use(bodyParser.json());

  // Adyen Node.js API library boilerplate (configuration, etc.)
  const config = new Config();
  config.apiKey = process.env.ADYEN_API_KEY;
  const client = new Client({ config });
  client.setEnvironment("TEST");  // change to LIVE for production
  const checkout = new CheckoutAPI(client);


const adyenCreatePaymentSession = async (req, res) => {
    try {
        // unique ref for the transaction
        const orderRef = "order";
        const organizationId = "KATOrgId";

        const reqBody = req.body;
        console.log(reqBody);

        const currency = reqBody.currency;
        const countryCode = reqBody.countryCode;
        const price =  reqBody.price; 
        const lineItems = reqBody.lineItems;

        const paymentReference = `SAMPLE_PAYMENT_${organizationId}`;
        // Allows for gitpod support
        const localhost = req.get('host');
        // const isHttps = req.connection.encrypted;
        const protocol = req.socket.encrypted? 'https' : 'http';
        // Ideally the data passed here should be computed based on business logic
        const response = await checkout.PaymentsApi.sessions({
          amount: { currency: currency, value: price }, // value is 100€ in minor units
          countryCode: countryCode,
          merchantAccount: process.env.ADYEN_MERCHANT_ACCOUNT, // required
          reference: orderRef, // required: your Payment Reference
          returnUrl: `${protocol}://${localhost}/checkout?orderRef=${orderRef}`, // set redirect URL required for some payment methods (ie iDEAL)
          lineItems: lineItems
        });
    
       return res.status(200).json(response);
      } catch (err) {
        console.error(`Error: ${err.message}, error code: ${err.errorCode}`);
        return res.status(err.statusCode || 500).json(err.message);
      }

}


const adyenCheckPaymentInfo = async (sessionId, sessionResult, res) => {
  try {
      const response = await checkout.PaymentsApi.getResultOfPaymentSession(sessionId,{
        params: { sessionResult },
      });
      console.log(response)
     return res.status(200).json(response);
    } catch (err) {
      console.error(`Error: ${err.message}, error code: ${err.errorCode}`);
      return res.status(err.statusCode || 500).json(err.message);
    }

}

const getGenesisOrgData = async (orgId, res) => {
  try {
      const username = process.env.GENESIS_USERNAME;
      const password = process.env.GENESIS_PASSWORD;

      // Create a base64-encoded string for Basic Authentication
      const authString = Buffer.from(`${username}:${password}`).toString('base64');

      const response =  await axios.get(`${process.env.GENESIS_URL}/v1/organizations/${orgId}`, {
        headers: {
          'Authorization': `Basic ${authString}`
        }
      });
      console.log("response from genesis", response.data)
      return res.status(200).json(response.data);
    } catch (err) {
      console.error(`Error: ${err.message}, error code: ${err.errorCode}`);
      return res.status(err.statusCode || 500).json(err.message);
    }

}

app.post('/api/sessions', async (req, res) => {
    return adyenCreatePaymentSession(req, res);
});

app.get('/api/sessions/:sessionId', async (req, res) => {
  const sessionId = req.params.sessionId;
  const sessionResult = req.query.sessionResult;
  console.log("Session id", sessionId);
  console.log("Session result", sessionResult);
  return adyenCheckPaymentInfo(sessionId, sessionResult, res);
});

app.get('/api/genesis-org/:genesisOrgId', async (req, res) => {
  const orgId = req.params.genesisOrgId;
  console.log("Org id", orgId);
  return getGenesisOrgData(orgId, res);
});




app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});