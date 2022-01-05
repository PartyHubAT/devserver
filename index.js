require('dotenv').config()
const express = require("express")
const http = require('http');
const serverLogic = require(process.env.GAMESERVERLOGICPATH)

const app = express();
const server = http.createServer(app);

const port = process.env.PORT
server.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
