const express = require('express');
require('dotenv').config()
const app = express();
const path = require("path");
const cookieParser = require('cookie-parser');
app.use(cookieParser());
app.set('trust proxy', true);
const cors =require('cors')
const bodyParser = require('body-parser');
const notification = require('./models/notification');
app.use(cors({
  origin: true,
  credentials: true
}));


const server =require("http").createServer(app);
const { init } = require(`${__dirname}/sockets/socket`);
init(server);
const config=require(`${__dirname}/config/configDB`);
const userRoute=require(`${__dirname}/routes/user`);
const productRoute=require(`${__dirname}/routes/product`)
const cartRoute=require(`${__dirname}/routes/cart`);
const orderRoute=require(`${__dirname}/routes/order`);
const aboutRoute =require(`${__dirname}/routes/about`);
const reviewRoute =require(`${__dirname}/routes/review`);
const adminRoute =require(`${__dirname}/routes/admin`);
const notificationRoute =require(`${__dirname}/routes/notification`);
const reportsRoute =require(`${__dirname}/routes/reports`);
const backupRoute = require("./backup/backup");
const couponRoute = require("./routes/coupon");
const offerRoute = require("./routes/offer");
const compoOffer = require("./routes/compoOffer");



require(`${__dirname}/jobs/cleanNotifications`);

config.connectDB("mongodb+srv://kiroloesreda_db_user:MKwmoPdDgpNP14cs@cluster0.ie9ekij.mongodb.net/plastic?retryWrites=true&w=majority");




app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));



app.use('/v1/users',userRoute);
app.use('/v1/product',productRoute);
app.use('/v1/user/cart',cartRoute);
app.use('/v1/order',orderRoute);
app.use('/v1/about',aboutRoute);
app.use('/v1/review',reviewRoute);
app.use('/v1/admin',adminRoute);
app.use('/v1/notification',notificationRoute);
app.use('/v1/reports',reportsRoute);
app.use("/v1/coupons",couponRoute );
app.use("/v1/offer",offerRoute );
app.use("/v1/compoOffer",compoOffer );


app.use("/v1", backupRoute);

const Review = require("./models/review");
const mongoose=require('mongoose')
async function seedReviews() {
    try {

        const reviews = [];

        for (let i = 0; i < 500; i++) {
            reviews.push({
                userId: new mongoose.Types.ObjectId(), // أو User ID حقيقي
                productId: new mongoose.Types.ObjectId("6a04a8f5d08d76e1728c1be5"),
                rating: Math.floor(Math.random() * 5) + 1,
                comment: `Review Number ${i + 1}`
            });
        }

        await Review.insertMany(reviews);

        console.log("500 Reviews Inserted Successfully");
        process.exit();
    } catch (err) {
        console.error(err);
    }
}

seedReviews();




const PORT=process.env.PORT || 5000;
server.listen(PORT,()=>{
    console.log(`Server is running on port ${PORT}`);
})
