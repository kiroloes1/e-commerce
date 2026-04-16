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
const userRoute=require(`${__dirname}/routes/user`);
const productRoute=require(`${__dirname}/routes/product`)
const cartRoute=require(`${__dirname}/routes/cart`);
const orderRoute=require(`${__dirname}/routes/order`)

config.connectDB("mongodb+srv://kiroloesreda_db_user:MKwmoPdDgpNP14cs@cluster0.ie9ekij.mongodb.net/plastic?retryWrites=true&w=majority");




app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));



app.use('/v1/users',userRoute);
app.use('/v1/product',productRoute);
app.use('/v1/user/cart',cartRoute);
app.use('/v1/order',orderRoute);

const PORT=process.env.PORT || 5000;
app.listen(PORT,()=>{
    console.log(`Server is running on port ${PORT}`);
})
