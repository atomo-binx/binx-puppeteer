const axios = require("axios");
const dotenv = require("dotenv");

dotenv.config({
  path: ".env",
});

const enviroment = process.env.ENVIROMENT;

let baseURL =
  enviroment === "development"
    ? process.env.API_LOCAL
    : "https://api.binx.com.br/api";

const api = axios.create({ baseURL: baseURL, timeout: 300000 });

module.exports = api;
