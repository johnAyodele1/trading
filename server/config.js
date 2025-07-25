const dotenv = require("dotenv");
dotenv.config({ path: "./config.env" });

module.exports = {
  TWELVE_DATA_API_KEY: process.env.TWELVE_DATA_API_KEY,
  MONGODB_URI: process.env.MONGODB_URI,
  PORT: process.env.PORT || 5000,
};
