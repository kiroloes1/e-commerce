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


const Order = require("./models/order");

async function createOrdersOnce() {
  try {
    // check if orders already exist
    const count = await Order.countDocuments();

    if (count > 3000) {
      console.log("Orders already exist, skipping seed...");
      return;
    }

    const originalOrder = {
      user: "69e43947c46dcc8052f0a969",
      items: [
        {
          product: "6a07143fd08d76e1728c2c60",
          comboId: null,
          productName: "كاتشب 400 جرام حار جود فرانس",
          unit_type: "كرتونة",
          quantity: 1,
          price: 365,
          subtotal: 365,
          isOfferItem: true,
          offerTitle: "مجله 2",
          isComboItem: false,
          comboTitle: "",
        },
      ],
      totalPrice: 365,
      shippingPrice: 74,
      finalPrice: 439,
      discount: 0,
      customerName: "kiroloes reda wassef",
      phone: "01270857659",
      address: {
        city: "القليوبية",
        region: "العبور",
        street: "شارع ماري منيب",
        building: "",
      },
      status: "pending",
      payment: {
        method: "cash",
        walletPhone: "",
        proofImage: null,
        status: "unpaid",
      },
    };

    const orders = Array.from({ length: 400 }, (_, i) => ({
      ...originalOrder,
      orderNumber: `ORD-${Date.now()}-${i}`,
    }));

    await Order.insertMany(orders);

    console.log("800 orders inserted successfully");
  } catch (error) {
    console.error("Seed error:", error);
  }
}

createOrdersOnce();
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




const PORT=process.env.PORT || 5000;
server.listen(PORT,()=>{
    console.log(`Server is running on port ${PORT}`);
})
