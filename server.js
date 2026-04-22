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
const productRoute=require(`${__dirname}/routes/product`);
const cartRoute=require(`${__dirname}/routes/cart`);
const orderRoute=require(`${__dirname}/routes/order`)
const aboutRoute =require(`${__dirname}/routes/about`)
const reviewRoute =require(`${__dirname}/routes/review`)





app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));



app.use('/v1/users',userRoute);
app.use('/v1/product',productRoute);
app.use('/v1/user/cart',cartRoute);
app.use('/v1/order',orderRoute);
app.use('/v1/about',aboutRoute);
app.use('/v1/review',reviewRoute);


const createUserModel=require(`${__dirname}/models/user`);
const createProductModel=require(`${__dirname}/models/product`);
const createCartModel=require(`${__dirname}/models/cart`);
const createOrderModel=require(`${__dirname}/models/order`)
const createAboutModel =require(`${__dirname}/models/about`)
const createReviewModel =require(`${__dirname}/models/review`)




let connections;

const startServer = async () => {
  connections = await config.connectDB();

// cluster connection three
const User = createUserModel(connections.conn3);
const About = createAboutModel(connections.conn3);

// cluster connection two
const Product = createProductModel(connections.conn2);
const Review = createReviewModel(connections.conn2);

// cluster connection one
const Cart = createCartModel(connections.conn1);
const Order = createOrderModel(connections.conn1);


app.locals.models = {
  User,
  Product,
  Cart,
  Order,
  About,
  Review
};

app.listen(PORT, () => {
  console.log("Server running on port", PORT);
});
};

startServer();



