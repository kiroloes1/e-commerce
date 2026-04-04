const express = require('express');
require('dotenv').config()
const app = express();
const path = require("path");
const cookieParser = require('cookie-parser');
app.use(cookieParser());
app.set('trust proxy', true);
const cors =require('cors')
const bodyParser = require('body-parser');
app.use(cors({
  origin: true,
  credentials: true
}));
const config=require(`${__dirname}/config/configDB`);

config.connectDB("mongodb://localhost:27017/elliaDB");




app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));





const PORT=process.env.PORT || 5000;
app.listen(PORT,()=>{
    console.log(`Server is running on port ${PORT}`);
})
