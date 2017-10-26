require('dotenv').config()

let config = {
  "deploy": {
    "gzip": true,
    "awsAccessKey": process.env.AWS_ACCESS_KEY,
    "awsSecretKey": process.env.AWS_SECRET_KEY
  }
}

module.exports = config
