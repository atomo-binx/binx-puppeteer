const dotenv = require("dotenv");
const main = require("./src/main");

dotenv.config({
  path: ".env",
});

main.register();
