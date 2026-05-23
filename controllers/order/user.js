const Order=require(`${__dirname}/../../models/order`);
const Product=require(`${__dirname}/../../models/product`);
const Cart=require(`${__dirname}/../../models/cart`);
const UserModel=require(`${__dirname}/../../models/user`)
const { getIO } = require(`${__dirname}/../../sockets/socket`);
const { createNotification } = require(`${__dirname}/../../controllers/notification/notification`);
const Offer = require(`${__dirname}/../../models/offer`);
const ComboOffer =require(`${__dirname}/../../models/compoOffer`)
// cloudinary
const uploadToCloud=require(`${__dirname}/../../services/cloudinary`);
const mongoose=require('mongoose');

// Create order
exports.createOrder=async(req,res)=>{
    let  session;
    try{
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

                const admins = await UserModel.find({
            role: { $in: ["admin", "superadmin"] }
        })



        for (const admin of admins) {
    const order = createOrder[0];

    await createNotification(
        admin._id.toString(),
        "طلب جديد",
        `طلب #${order.orderNumber} | ${order.customerName} | ${order.items.length} منتجات | ${order.finalPrice} ج.م`
    );
}
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


// Create order
// exports.createOrderV2 = async (req, res) => {
//   let session;

//   try {
//     const { userId } = req.user;

//     const { customerName, phone } = req.body;

//     const items =
//       typeof req.body.items === "string"
//         ? JSON.parse(req.body.items)
//         : req.body.items || [];

//     const address =
//       typeof req.body.address === "string"
//         ? JSON.parse(req.body.address)
//         : req.body.address || {};

//     const payment =
//       typeof req.body.payment === "string"
//         ? JSON.parse(req.body.payment)
//         : req.body.payment || {};

//     if (items.length == 0) {
//       return res.status(400).json({
//         message: "يجب علي الاقل لاتمام الطلب يوجد منتج واحد ! ",
//       });
//     }

//     if (
//       !customerName ||
//       !phone ||
//       !address?.city ||
//       !address?.street ||
//       !address?.building
//     ) {
//       return res.status(400).json({
//         message: "يجب ملئ المعلومات الشخصيه لأتمام الطلب",
//       });
//     }

//     if (payment?.method === "wallet") {
//       if (!req.file) {
//         return res.status(400).json({
//           message: " يجب عليك ارفاق اثبات الدفع اسكرين شوت",
//         });
//       }
//       if (!payment?.walletPhone) {
//         return res.status(400).json({
//           message: "يجب عليك ارفاق اثبات الدفع رقم المحفظه المحول منها",
//         });
//       }
//     }

//     session = await mongoose.startSession();
//     session.startTransaction();

//     const cartExist = await Cart.findOne({ user: userId }).session(session);

//     for (const item of items) {
//       if (!item.product || !item.quantity || !item.price) {
//         throw new Error("يجب ارسال بيانات الطلب مع الطلب");
//       }

//       if (isNaN(item.quantity) || isNaN(item.price)) {
//         throw new Error("الارقام غير صحيحه ");
//       }

//       const productRef = await Product.findById(item.product).session(
//         session
//       );

//       if (!productRef) {
//         throw new Error(`Product not found: ${item.product}`);
//       }

//       // =========================
//       // OFFER PRICE ONLY (NO STOCK CHANGE LOGIC HERE)
//       // =========================
//       let price = item.price;
//       let isOfferItem = item.isOfferItem === true;
//       let offerTitle = "";

//       if (isOfferItem) {
//         const offer = await Offer.findOne({
//           "products.product": item.product,
//           active: true,
//         }).session(session);

//         if (offer) {
//           const offerProduct = offer.products.find(
//             (p) =>
//               p.product.toString() === item.product.toString()
//           );

//           if (offerProduct) {
//             price = offerProduct.offerPrice;
//             offerTitle = offer.title;
//           }
//         }
//       }

//       // =========================
//       // STOCK LOGIC (UNCHANGED - ALWAYS PRODUCT STOCK)
//       // =========================
//       if (item.unit_type == "قطعة") {
//         if (productRef.totalUnits < item.quantity) {
//           await Cart.updateOne(
//             { _id: cartExist._id },
//             {
//               $pull: {
//                 items: {
//                   product: new mongoose.Types.ObjectId(item.product),
//                 },
//               },
//             }
//           );
//           throw Error(" الكميه المطلوبه اكبر من المخزون ");
//         } else {
//           productRef.totalUnits -= item.quantity;

//           if (productRef.unit_type == "كرتونة") {
//             const count = Math.floor(
//               productRef.totalUnits /
//                 productRef.unitsPerPackage
//             );
//             productRef.availableQuantity = count;
//           } else {
//             productRef.availableQuantity -= item.quantity;
//           }
//         }
//       } else if (item.unit_type == "كرتونة") {
//         if (productRef.availableQuantity < item.quantity) {
//           await Cart.updateOne(
//             { _id: cartExist._id },
//             {
//               $pull: {
//                 items: {
//                   product: new mongoose.Types.ObjectId(item.product),
//                 },
//               },
//             }
//           );
//           throw Error(" الكميه المطلوبه اكبر من المخزون ");
//         } else {
//           productRef.availableQuantity -= item.quantity;
//           productRef.totalUnits -=
//             item.quantity *
//             productRef.unitsPerPackage;
//         }
//       }

//       productRef._skipInventoryHook = true;
//       await productRef.save({ session });

//       // =========================
//       // FINAL ITEM CALCULATION
//       // =========================
//       item.price = price;
//       item.subtotal =
//         Number(item.quantity) * Number(price);

//       item.isOfferItem = isOfferItem;
//       item.offerTitle = offerTitle;
//     }

//     const totalPrice = items.reduce(
//       (acc, curr) =>
//         acc + curr.quantity * curr.price,
//       0
//     );

//     await Cart.findOneAndUpdate(
//       { user: userId },
//       { $set: { items: [] } },
//       { session }
//     );

//     let result;

//     if (payment.method === "wallet") {
//       if (!req.file) {
//         throw new Error("يجب ارفاق صورة اثبات الدفع");
//       }

//       result =
//         await uploadToCloud.uploadToCloud(
//           req.file,
//           "wallet/proofImageOrder"
//         );
//     }

//     const createOrder = await Order.create(
//       [
//         {
//           user: userId,
//           customerName,
//           items,
//           totalPrice,
//           shippingPrice:
//             req.body.shippingPrice || 0,
//           phone,
//           discout: req.body.discount || 0,
//           address,
//           payment: {
//             method: payment.method || "cash",
//             walletPhone:
//               payment.walletPhone,
//             proofImage: result,
//           },
//           finalPrice:
//             (req.body.shippingPrice || 0) +
//             totalPrice -
//             (req.body.discount || 0),
//         },
//       ],
//       { session }
//     );

//     await session.commitTransaction();
//     session.endSession();

//     const admins = await UserModel.find({
//       role: { $in: ["admin", "superadmin"] },
//     });

//     for (const admin of admins) {
//       const order = createOrder[0];

//       await createNotification(
//         admin._id.toString(),
//         "طلب جديد",
//         `طلب #${order.orderNumber} | ${order.customerName} | ${order.items.length} منتجات | ${order.finalPrice} ج.م`
//       );
//     }

//     res.status(201).json({
//       message: "تم انشاء الطلب بنجاح ",
//       createOrder,
//     });
//   } catch (err) {
//     if (session) {
//       await session.abortTransaction();
//       session.endSession();
//     }

//     res.status(500).json({
//       message: err.message,
//     });
//   }
// };

// Create order (Fixed & Clean Version)
exports.createOrderV2 = async (req, res) => {
  let session;

  try {
    const { userId } = req.user;
    const { customerName, phone } = req.body;

    const inputItems = typeof req.body.items === "string" ? JSON.parse(req.body.items) : req.body.items || [];
    const address = typeof req.body.address === "string" ? JSON.parse(req.body.address) : req.body.address || {};
    const payment = typeof req.body.payment === "string" ? JSON.parse(req.body.payment) : req.body.payment || {};

    if (inputItems.length === 0) return res.status(400).json({ message: "يجب إضافة منتج واحد على الأقل" });

    const shippingPrice = Number(req.body.shippingPrice || 0);
    const now = new Date(); 

    session = await mongoose.startSession();
    session.startTransaction();

    const cartExist = await Cart.findOne({ user: userId }).session(session);
    if (!cartExist) throw new Error("عربة التسوق غير موجودة");


    const finalOrderItems = [];

    for (const item of inputItems) {
      const quantity = Number(item.quantity);


  // ==========================================
      // 1. معالجة العرض المجمع (COMBO OFFER)
      // ==========================================
      if (item.isCombo === true || item.isCombo === "true") {
        const combo = await ComboOffer.findById(item.comboId).session(session);

        if (!combo) throw new Error("العرض المجمع غير موجود");
        if (!combo.isAvailable) throw new Error("العرض المجمع غير متاح حالياً أو انتهت مدته");

        // التحقق من الحد الأقصى لكل مستخدم وللعرض الإجمالي
        const customerUsed = combo.customersUsed.find(c => c.user?.toString() === userId.toString());
        const used = customerUsed?.count || 0;
        if (used + quantity > combo.maxPerUser) {
          throw new Error(`الحد الأقصى المسموح به لك من عرض "${combo.title}" هو ${combo.maxPerUser} مرات فقط`);
        }
        if (combo.soldCount + quantity > combo.totalLimit) {
          throw new Error(`عذراً، نفدت الكمية المتاحة من العرض المجمع: ${combo.title}`);
        }

        let singleComboOriginalPrice = 0;
        const freshComboProducts = [];

        // جلب المنتجات وحساب السعر بناءً على الـ unit_type المحددة في الكومبو
        for (const subItem of combo.items) {
          const prod = await Product.findById(subItem.product).session(session);
          if (!prod) throw new Error("أحد المنتجات المكونة للكومبو لم يعد متاحاً بالسيستم");
          
          // تحديد نوع الوحدة من تفاصيل الكومبو (كرتونة أو قطعة)
          const currentUnitType = subItem.unit_type || prod.unit_type; 
          
          // تحديد سعر الوحدة بناءً على النوع المختار في الكومبو
          const basePrice = currentUnitType === "قطعة" ? prod.pieceSellingPrice : prod.packageSellingPrice;
          
          singleComboOriginalPrice += subItem.quantity * basePrice;
          
          freshComboProducts.push({ 
            prod, 
            requiredQtyPerCombo: subItem.quantity,
            unitType: currentUnitType,
            basePrice
          });
        }

        if (singleComboOriginalPrice === 0) throw new Error("فشل في حساب السعر الأصلي لمكونات الكومبو");

        // حساب عامل الخصم (Multiplier)
        let discountMultiplier = 1; 
        if (combo.discountType === "percentage") {
          discountMultiplier = (100 - combo.discountValue) / 100;
        } else if (combo.discountType === "fixed") {
          const finalComboPrice = Math.max(0, singleComboOriginalPrice - combo.discountValue);
          discountMultiplier = finalComboPrice / singleComboOriginalPrice;
        }

        // تحديث مخزون المنتجات وحفظها بناءً على الـ unit_type المحددة
        for (const { prod, requiredQtyPerCombo, unitType, basePrice } of freshComboProducts) {
          const totalNeedQty = requiredQtyPerCombo * quantity;

          // سحب المخزون بذكاء حسب نوع الوحدة (قطعة أو كرتونة)
          if (unitType === "قطعة") {
            if (prod.totalUnits < totalNeedQty) {
              throw new Error(`المخزون غير كافي من [${prod.productName}] لتلبية العرض المجمع`);
            }
            prod.totalUnits -= totalNeedQty;
            prod.availableQuantity = prod.unit_type === "كرتونة" 
              ? Math.floor(prod.totalUnits / prod.unitsPerPackage) 
              : prod.totalUnits;
          } else {
            // كرتونة
            if (prod.availableQuantity < totalNeedQty) {
              throw new Error(`المخزون غير كافي من [${prod.productName}] لتلبية العرض المجمع`);
            }
            prod.availableQuantity -= totalNeedQty;
            prod.totalUnits -= totalNeedQty * prod.unitsPerPackage;
          }
          
          await prod.save({ session });

          // حساب السعر النهائي للقطعة/الكرتونة داخل الكومبو بعد الخصم
          let subItemPriceAfterDiscount = basePrice * discountMultiplier;
          subItemPriceAfterDiscount = Math.max(0, Number(subItemPriceAfterDiscount.toFixed(2)));

          finalOrderItems.push({
            product: prod._id,
            comboId: combo._id,
            productName: prod.productName,
            unit_type: unitType, // تم التثبيت هنا بناءً على العرض
            quantity: totalNeedQty,
            price: subItemPriceAfterDiscount,
            subtotal: Number((subItemPriceAfterDiscount * totalNeedQty).toFixed(2)),
            isOfferItem: false,
            offerTitle: "",
            isComboItem: true,
            comboTitle: combo.title
          });
        }

        // تحديث عدادات الكومبو
        if (customerUsed) {
          customerUsed.count += quantity;
        } else {
          combo.customersUsed.push({ user: userId, count: quantity });
        }
        combo.soldCount += quantity;
        await combo.save({ session });

        processedCartItemIds.push({ comboId: combo._id.toString(), isCombo: true });
        continue; 
      }


      const productRef = await Product.findById(item.product).session(session);
      if (!productRef) throw new Error("أحد المنتجات المطلوبة غير موجود بالسيرفر");

      let price = 0;
      let isOfferItem = item.isOffer === true || item.isOffer === "true";
      let offerTitle = "";

      if (isOfferItem) {
        const offer = await Offer.findOne({
          active: true,
          startDate: { $lte: now },
          endDate: { $gte: now },
          "products.product": productRef._id
        }).session(session);

        if (offer && offer.soldCount < offer.totalLimit) {
          const offerProduct = offer.products.find(
            (p) => p.product.toString() === productRef._id.toString()
          );

          if (offerProduct) {
            price = Number(offerProduct.offerPrice);
            offerTitle = offer.title;
            offer.soldCount += quantity || 1;

            const existCustomerUsed = offer.customersUsed.find(e => e.id.toString() === userId.toString());
            if (existCustomerUsed) {
              const existProduct = existCustomerUsed.order.find(o => o.product.toString() === productRef._id.toString());
              if (existProduct) {
                existProduct.count += quantity;
              } else {
                existCustomerUsed.order.push({ product: productRef._id, count: quantity });
              }
            } else {
              offer.customersUsed.push({
                id: userId,
                order: [{ product: productRef._id, count: quantity }]
              });
            }
            await offer.save({ session });
          }
        }

        if (!price || isNaN(price)) {
          isOfferItem = false;
          price = item.unit_type === "قطعة" ? productRef.pieceSellingPrice : productRef.packageSellingPrice;
        }
      } else {
        price = item.unit_type === "قطعة" ? productRef.pieceSellingPrice : productRef.packageSellingPrice;
      }

  
      let outOfStock = false;
      if (item.unit_type === "قطعة") {
        if (productRef.totalUnits < quantity) outOfStock = true;
        else {
          productRef.totalUnits -= quantity;
          productRef.availableQuantity = productRef.unit_type === "كرتونة" 
            ? Math.floor(productRef.totalUnits / productRef.unitsPerPackage) 
            : productRef.totalUnits;
        }
      } else {
        if (productRef.availableQuantity < quantity) outOfStock = true;
        else {
          productRef.availableQuantity -= quantity;
          productRef.totalUnits -= quantity * productRef.unitsPerPackage;
        }
      }

      if (outOfStock) {
        cartExist.items = cartExist.items.filter(c => !(c.product?.toString() === item.product?.toString() && c.unit_type === item.unit_type));
        await cartExist.save({ session });
        throw new Error(`المخزون نفد وغير كافٍ للمنتج العادي: ${productRef.productName}`);
      }

      await productRef.save({ session });

   
      finalOrderItems.push({
        product: productRef._id,
        comboId: null,
        productName: productRef.productName,
        unit_type: item.unit_type,
        quantity: quantity,
        price: price,
        subtotal: Number((quantity * price).toFixed(2)),
        isOfferItem: isOfferItem,
        offerTitle: offerTitle,
        isComboItem: false,
        comboTitle: ""
      });
    }


    const totalPrice = finalOrderItems.reduce((acc, curr) => acc + curr.subtotal, 0);

    let proofImage = null;
    if (payment.method === "wallet") {
      proofImage = await uploadToCloud.uploadToCloud(req.file, "wallet/proofImageOrder");
    }

    const discount = Number(req.body.discount || 0);
    const finalPrice = Math.max(0, (totalPrice + shippingPrice) - discount);


    const [order] = await Order.create([{
      user: userId,
      customerName,
      phone,
      items: finalOrderItems, 
      totalPrice: Number(totalPrice.toFixed(2)),
      shippingPrice,
      discount,
      address,
      payment: { ...payment, proofImage },
      finalPrice: Number(finalPrice.toFixed(2))
    }], { session });


    cartExist.items = [];
    await cartExist.save({ session });

    await session.commitTransaction();
    session.endSession();

    return res.status(201).json({ message: "تم تسجيل وتجهيز طلبك بنجاح", order });

  } catch (err) {
    if (session) { 
      await session.abortTransaction(); 
      session.endSession(); 
    }
    console.error("Critical Failure in createOrderV2: ", err);
    return res.status(500).json({ message: err.message || "حدث خطأ غير متوقع أثناء معالجة الطلب" });
  }
};

// View my orders
exports.viewMyOrders = async (req, res) => {
    try {
        const { userId } = req.user;

        const orders = await Order.find({ user: userId }).populate("items.product" ,"image.url  description")
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
        const { userId } = req.user;
        const { id } = req.params;

        const order = await Order.findOne({
            _id: id,
            user: userId
        }).populate("items.product" ,"image.url  description");

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

          await Order.findByIdAndDelete(id).session(session)

const admins = await UserModel.find({
    role: { $in: ["admin", "superadmin"] }
});

for (const admin of admins) {


    await createNotification(
        admin._id.toString(),
        "تم إلغاء طلب",
        `تم إلغاء الطلب #${order.orderNumber}`
    );
}
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

        { $limit: 5 },
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
