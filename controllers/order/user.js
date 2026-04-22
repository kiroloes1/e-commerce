// const Order=require(`${__dirname}/../../models/order`);
// const Product=require(`${__dirname}/../../models/product`);
// const Cart=require(`${__dirname}/../../models/cart`);



// cloudinary
const uploadToCloud=require(`${__dirname}/../../services/cloudinary`);
const mongoose=require('mongoose');

// Create order
exports.createOrder=async(req,res)=>{
    let  session;
    try{
        const Order = req.app.locals.models.Order;
const Product = req.app.locals.models.Product;
const Cart = req.app.locals.models.Cart;
        const {userId}=req.user;
        console.log(req.file)
        // remember that , items are objects and address is a object
        const {customerName,phone}=req.body;
        const items =
          typeof req.body.items === "string"
            ? JSON.parse(req.body.items)
            : req.body.items || [];

        const address =
      typeof req.body.address === "string"
        ? JSON.parse(req.body.address)
        : req.body.address || {};
    
    const payment =
      typeof req.body.payment === "string"
        ? JSON.parse(req.body.payment)
        : req.body.payment || {};

        console.log(address,payment,items)

        // check items 
        if(items.length==0){
            return res.status(400).json({
                message:"يجب علي الاقل لاتمام الطلب يوجد منتج واحد ! "
            })
        }

        // check personal info
        if(!customerName || !phone || !address?.city || !address?.street || !address?.building){
            return res.status(400).json({
                message:"يجب ملئ المعلومات الشخصيه لأتمام الطلب"
            }) 
        }

        // check proof image
        if(payment?.method==="wallet"){
            if(!req.file){
                 return res.status(400).json({
                message:" يجب عليك ارفاق اثبات الدفع اسكرين شوت"
            }) 
            }
            if(!payment?.walletPhone){
               return res.status(400).json({
                message:"يجب عليك ارفاق اثبات الدفع رقم المحفظه المحول منها"
            }) 
            }
        }

        

        // start sesion and transaction
          session=await mongoose.startSession();
        session.startTransaction();


             const cartExist=  await Cart.findOne(
            { user: userId }).session(session);;



        // reduce producr quantity + calc subtotal 
        for (const item of items){
                    if (!item.product || !item.quantity || !item.price) {
            throw new Error("يجب ارسال بيانات الطلب مع الطلب");
        }
        
        if (isNaN(item.quantity) || isNaN(item.price)) {
            throw new Error("الارقام غير صحيحه ");
        }
            const productRef=await Product.findById(item.product).session(session);
            if (!productRef) {
    throw new Error(`Product not found: ${item.product}`);
}
            if(item.unit_type=="قطعة"){

                if(productRef.totalUnits<item.quantity){
                     await Cart.updateOne(
                        { _id: cartExist._id },
                        {
                            $pull: {
                            items: { product:new mongoose.Types.ObjectId(item.product) }
                            }
                        }
                        );
                     throw Error(" الكميه المطلوبه اكبر من المخزون ")
                }else{
                    productRef.totalUnits-=item.quantity;
                    if(productRef.unit_type=="كرتونة"){
                        const count=Math.floor(productRef.totalUnits/productRef.unitsPerPackage);
                        productRef.availableQuantity=count
                        // productRef.totalUnits =( productRef.availableQuantity * productRef.unitsPerPackage) + (productRef.availableQuantity % productRef.unitsPerPackage );
                    }else{
                        productRef.availableQuantity-=item.quantity;
                        // productRef.totalUnits =( productRef.availableQuantity * productRef.unitsPerPackage) ;
                    }
                }

            }else if(item.unit_type=="كرتونة"){
                   if(productRef.availableQuantity<item.quantity){
                     await Cart.updateOne(
                        { _id: cartExist._id },
                        {
                            $pull: {
                            items: { product:new mongoose.Types.ObjectId(item.product) }
                            }
                        }
                        );
                     throw Error(" الكميه المطلوبه اكبر من المخزون ")
                }else{
                    productRef.availableQuantity-=item.quantity;  
                    productRef.totalUnits -=( item.quantity * productRef.unitsPerPackage) ;

                }

            }
            
            productRef._skipInventoryHook=true; 
            await productRef.save({ session });

            item.subtotal = Number(item.quantity) * Number(item.price);
            // item.subtotal=item.quantity * item.price;
         }


        //  calculate total price 
        const totalPrice = items.reduce(
        (acc, curr) => acc + (curr.quantity * curr.price),
        0
        );
        

        // delete cart related to user 
       await Cart.findOneAndUpdate(
            { user: userId },
            { $set: { items: [] } },
            { session }
         );


        // upload image
         let result;
        
        if (payment.method === "wallet") {
            if (!req.file) {
                throw new Error("يجب ارفاق صورة اثبات الدفع");
            }
        
            result = await uploadToCloud.uploadToCloud(
                req.file,
                "wallet/proofImageOrder"
            );
        }

        // create new order
        const createOrder=await Order.create([{
             user:userId,
             customerName,
             items,
             totalPrice:totalPrice,
             shippingPrice:req.body.shippingPrice || 0,
             phone,
             address,
             payment:{
                method:payment.method || "cash",
                walletPhone:payment.walletPhone,
                proofImage:result
             },
            finalPrice:(req.body.shippingPrice || 0)+totalPrice


        }], { session });

             await session.commitTransaction();
        session.endSession();

        res.status(201).json({
            message:"تم انشاء الطلب بنجاح ",
            createOrder
        })

   


    }catch (err) {

        // rollback
        if (session) {
            await session.abortTransaction();
            session.endSession();
        }

        res.status(500).json({
            message: err.message
        });
    }
}


// View my orders
exports.viewMyOrders = async (req, res) => {
    try {
        const Order = req.app.locals.models.Order;
const Product = req.app.locals.models.Product;
const Cart = req.app.locals.models.Cart;
        const { userId } = req.user;

        const orders = await Order.find({ user: userId }).populate("items.product" ,"image.url")
            .sort({ createdAt: -1 });

        res.status(200).json({
            results: orders.length,
            orders
        });

    } catch (err) {
        res.status(500).json({
            message: err.message
        });
    }
};

// my confirm order
exports.viewMyOrdersDeliverd = async (req, res) => {
    try {
        const Order = req.app.locals.models.Order;
const Product = req.app.locals.models.Product;
const Cart = req.app.locals.models.Cart;
        const { userId } = req.user;

        const orders = await Order.find({ user: userId , status:"delivered"}).populate("items.product" ,"image.url")
            .sort({ createdAt: -1 });

        res.status(200).json({
            results: orders.length,
            orders
        });

    } catch (err) {
        res.status(500).json({
            message: err.message
        });
    }
};


// view order by id
exports.viewMyOrder = async (req, res) => {
    try {
        const Order = req.app.locals.models.Order;
const Product = req.app.locals.models.Product;
const Cart = req.app.locals.models.Cart;
        const { userId } = req.user;
        const { id } = req.params;

        const order = await Order.findOne({
            _id: id,
            user: userId
        }).populate("items.product" ,"image.url");

        if (!order) {
            return res.status(404).json({
                message: "الطلب غير موجود"
            });
        }

        res.status(200).json({
            order
        });

    } catch (err) {
        res.status(500).json({
            message: err.message
        });
    }
};


// Delete pending order (cancel order)
exports.cancelOrder = async (req, res) => {
    let session;
    try {
        const Order = req.app.locals.models.Order;
const Product = req.app.locals.models.Product;
const Cart = req.app.locals.models.Cart;
        const { userId } = req.user;
        const { id } = req.params;

        session = await mongoose.startSession();
        session.startTransaction();

        const order = await Order.findOne({ _id: id, user: userId }).session(session);

        if (!order) {
            throw new Error("الطلب غير موجود");
        }

        if (order.status !== "pending") {
            throw new Error("لا يمكن الغاء الطلب بعد تأكيده");
        }

        // return all items
        for (const item of order.items) {
            const product = await Product.findById(item.product).session(session);

            if (!product) continue;

            if (item.unit_type === "قطعة") {
                product.totalUnits += item.quantity;

                if (product.unit_type === "كرتونة") {
                    product.availableQuantity = Math.floor(
                        product.totalUnits / product.unitsPerPackage
                    );
                } else {
                    product.availableQuantity += item.quantity;
                }

            } else if (item.unit_type === "كرتونة") {
                product.availableQuantity += item.quantity;
                product.totalUnits += item.quantity * product.unitsPerPackage;
            }

            product._skipInventoryHook = true;
            await product.save({ session });
        }

      
        // update order
        order.status = "cancelled";
        order.cancelledAt = new Date();

        await order.save({ session });

        await Order.deleteById(id).session(session)

        await session.commitTransaction();
        session.endSession();

        res.status(200).json({
            message: "تم الغاء الطلب بنجاح",
            order
        });

    } catch (err) {
        if (session) {
            await session.abortTransaction();
            session.endSession();
        }

        res.status(500).json({
            message: err.message
        });
    }
};


// bset seller

exports.bestSeller = async (req, res) => {
  try {
    const Order = req.app.locals.models.Order;
const Product = req.app.locals.models.Product;
const Cart = req.app.locals.models.Cart;
    let bestSellers = await Order.aggregate([
      // 1. تفكيك items array
      { $unwind: "$items" },

      // 2. تجميع المبيعات لكل product
      {
        $group: {
          _id: "$items.product",
          totalSold: { $sum: "$items.quantity" },
          totalRevenue: {
            $sum: {
              $multiply: ["$items.quantity", "$items.price"]
            }
          },
          productName: { $first: "$items.productName" }
        }
      },

      // 3. ترتيب حسب الأكثر مبيعًا
      { $sort: { totalSold: -1 } },

        { $limit: 20 },
      // 4. جلب بيانات المنتج من Product collection
      {
        $lookup: {
          from: "products", // اسم الكوليكشن في MongoDB
          localField: "_id",
          foreignField: "_id",
          as: "product"
        }
      },

      // 5. تحويل المنتج من array إلى object
      { $unwind: "$product" },

      // 6. شكل النتيجة النهائي
      {
        $project: {
          _id: 1,
          totalSold: 1,
          totalRevenue: 1,
          product: 1
        }
      }
    ]);

  

    res.status(200).json({
      success: true,
      count: bestSellers.length,
      data: bestSellers
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};
