const Order=require(`${__dirname}/../../models/order`);
const Product=require(`${__dirname}/../../models/product`);
const Cart=require(`${__dirname}/../../models/cart`);

// cloudinary
const uploadToCloud=require(`${__dirname}/../../services/cloudinary`);
const mongoose=require('mongoose');

// Create order
exports.createOrder=async(req,res)=>{
    try{
        const {userId}=req.user;
        // remember that , items are objects and address is a object
        const {customerName,phone,address,payment}=req.body;
        const items = req.body.items || [];

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
        const session=await mongoose.startSession();
        session.startTransaction();

        // reduce producr quantity + calc subtotal 
        for (const item of items){
            const productRef=await Product.findById(item.product).session(session);
            if(item.unit_type=="قطعة"){

                if(productRef.totalUnits<item.quantity){
                     throw Error(" الكميه المطلوبه اكبر من المخزون ")
                }else{
                    productRef.totalUnits-=item.quantity;
                    if(productRef.unit_type=="كرتونه"){
                        productRef.availableQuantity= Math.floor(productRef.totalUnits /productRef.unitsPerPackage );
                        productRef.totalUnits =( productRef.availableQuantity * productRef.unitsPerPackage) + (productRef.availableQuantity % productRef.unitsPerPackage );
                    }else{
                        productRef.availableQuantity-=item.quantity;
                        productRef.totalUnits =( productRef.availableQuantity * productRef.unitsPerPackage) ;
                    }
                }

            }else if(item.unit_type=="كرتونه"){
                   if(productRef.availableQuantity<item.quantity){
                     throw Error(" الكميه المطلوبه اكبر من المخزون ")
                }else{
                    productRef.availableQuantity-=item.quantity;  
                    productRef.totalUnits =( productRef.availableQuantity * productRef.unitsPerPackage) ;

                }

            }
            
            productRef._skipInventoryHook=true; 
            await productRef.save({ session });

            item.subtotal=item.quantity * item.price;
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
         if(req.file) {
          result = await uploadToCloud.uploadToCloud(req.file, `${folderBase}/proofImageOrder`);
         }


        // create new order
        const createOrder=await Order.create([{
             user:userId,
             items,
             totalPrice:totalPrice,
             shippingPrice:req.shippingPrice || 0,
             phone,
             address,
             payment:{
                method:payment.method || "cash",
                walletPhone:payment.walletPhone,
                proofImage:result
             }


        }], { session });

        res.status(201).json({
            message:"تم انشاء الطلب بنجاح ",
            createOrder
        })

        await session.commitTransaction();
        session.endSession();


    }catch (err) {

        // rollback
        await session.abortTransaction();
        session.endSession();

        res.status(500).json({
            message: err.message
        });
    }
}


// View my orders


// view order


// Delete pending order (cancel order)


