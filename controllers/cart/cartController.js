const CartModel=require(`${__dirname}/../../models/cart`);
const ProductModel = require(`${__dirname}/../../models/product`);
// get cart by user must be login first
exports.getCartByUser = async (req, res) => {

  try {

    const { userId } = req.user;

    const cart = await CartModel
      .findOne({ user: userId })

      .populate(
        "items.product",
        "-purchasePrice"
      )

      .populate({
        path: "items.comboId",

        populate: {
          path: "items.product",

          select:
          "productName description image"
        }
      })

      .populate({
        path: "items.comboProducts.product",

        select:
        "productName description image unit_type"
      });

    return res
      .status(200)
      .json(
        cart || { items: [] }
      );

  }

  catch (err) {

    return res
      .status(500)
      .json({

        message:
        "Server error",

        error:
        err.message

      });

  }

};
// create 
exports.addToCart = async (req, res) => {
  try {

    const { userId } = req.user;
    const { items } = req.body;

    let cart = await CartModel.findOne({
      user: userId
    });

    if (!cart) {

      cart = new CartModel({
        user: userId,
        items: []
      });

    }

    for (const newItem of items) {

      const qty = Number(newItem.quantity);

      if (!qty || isNaN(qty) || qty <= 0)
        continue;

      /*
      ==================
      COMBO OFFER
      ==================
      */

      if (
        newItem.isCombo === true ||
        newItem.isCombo === "true"
      ) {

        const comboIndex =
          cart.items.findIndex(

            item =>

              item.isCombo === true &&

              item.comboId?.toString() ===
              newItem.comboId

          );

        if (comboIndex > -1) {

          cart.items[
            comboIndex
          ].quantity += qty;

        }

        else {

          cart.items.push({

            isCombo: true,

              allowedRemaining:
              Number(newItem.allowedRemaining) || 0,

            comboId:
              newItem.comboId,

            title:
              newItem.title ||

              "عرض مجمع",

            quantity: qty,

            offerPrice:
              newItem.offerPrice ||

              null,

            comboProducts:

              Array.isArray(
                newItem.items
              )

                ?

                newItem.items.map(
                  sub => ({

                    product:
                      sub.product,

                    productName:
                      sub.productName,

                    quantity:
                      sub.quantity

                  })
                )

                :

                [],

            product: null,

            unit_type: null,

            isOffer: false,

            maxPerUser: null

          });

        }

        continue;

      }

      /*
      ==================
      PRODUCT / OFFER
      ==================
      */

      const product =
        await ProductModel
          .findById(
            newItem.product
          );

      if (!product)
        continue;

      const maxStock =

        newItem.unit_type ===
          "قطعة"

          ?

          product.totalUnits

          :

          product.availableQuantity;

      const index =
        cart.items.findIndex(

          item =>

            !item.isCombo &&

            item.product &&

            item.product
              .toString()

            ===

            newItem.product

            &&

            item.unit_type ===
            newItem.unit_type

            &&

            item.isOffer ===

            (
              newItem.isOffer === true ||

              newItem.isOffer ===
              "true"
            )

        );

      const isOffer =

        newItem.isOffer === true ||

        newItem.isOffer ===
        "true";

      if (index > -1) {

        const currentQty =

          Number(

            cart.items[
              index
            ].quantity

          ) || 0;

        let finalQty =
          currentQty + qty;

        if (
          finalQty >
          maxStock
        ) {

          finalQty =
            maxStock;

        }

        cart.items[
          index
        ].quantity = finalQty;

      }

      else {

        cart.items.push({

            allowedRemaining:
    Number(newItem.allowedRemaining) || 0,

          product:
            newItem.product,

          quantity:

            qty > maxStock

              ?

              maxStock

              :

              qty,

          unit_type:
            newItem.unit_type,

          isOffer,

          offerPrice:

            isOffer

              ?

              Number(
                newItem.offerPrice
              )

              :

              null,

          maxPerUser:

            newItem.maxPerUser

              ?

              Number(
                newItem.maxPerUser
              )

              :

              null,

          isCombo: false,

          comboId: null,

          title: null,

          comboProducts: []

        });

      }

    }

    await cart.save();

    await cart.populate([

      {

        path:
          "items.product",

        select:
          "-purchasePrice"

      },

      {

        path:
          "items.comboId"

      },

      {

        path:
          "items.comboProducts.product"

      }

    ]);

    return res.status(200).json({

      message:
        "Cart updated successfully",

      cart

    });

  }

  catch (err) {

    return res.status(500).json({

      message:
        "Server error",

      error:
        err.message

    });

  }

};

// update
// exports.updateCart = async (req, res) => {
//   try {
//     const { userId } = req.user;
//     const { items } = req.body;

//     let cart = await CartModel.findOne({ user: userId });

//     if (!cart) {
//       return res.status(404).json({
//         message: "Cart not found"
//       });
//     }

//     const newItems = [];

//     for (const item of items) {
//       const qty = Number(item.quantity);
//       if (!qty || isNaN(qty)) continue;

//       const product = await ProductModel.findById(item.product);
//       if (!product) continue;



//       newItems.push({
//         product: item.product,
//         unit_type: item.unit_type,
//         quantity: qty 
//       });
//     }

//     cart.items = newItems;

//     await cart.save();

//     return res.status(200).json({
//       message: "Cart replaced with validation",
//       cart
//     });

//   } catch (err) {
//     return res.status(500).json({
//       message: "Server error",
//       error: err.message
//     });
//   }
// };

// update cart with offers support
exports.updateCart = async (req, res) => {
  try {
    const { userId } = req.user; 
    const { items } = req.body; 

    let cart = await CartModel.findOne({ user: userId });

    if (!cart) {
      cart = new CartModel({ user: userId, items: [] });
    }

    const newItems = [];
    let hasOfferItems = false; 

    for (const item of items) {
      const qty = Number(item.quantity);
      if (!qty || isNaN(qty) || qty <= 0) continue;

      if (item.isCombo === true || item.isCombo === 'true') {
        newItems.push({
          isCombo: true,
          comboId: item.comboId,
          title: item.title || "عرض كومبو مجمع",
          quantity: qty,
          offerPrice: item.offerPrice ? Number(item.offerPrice) : null,

          
    allowedRemaining:
      Number(item.allowedRemaining) || 0,
          comboProducts: Array.isArray(item.items) ? item.items.map(subItem => ({
            product: subItem.product,
            productName: subItem.productName,
            quantity: subItem.quantity
          })) : [],

          product: null,
          unit_type: null,
          isOffer: false,
          maxPerUser: item.maxPerUser ? Number(item.maxPerUser) : 1
        });
        
        hasOfferItems = true;
        continue;
      }


      const product = await ProductModel.findById(item.product);
      if (!product) continue; 

      const isOffer = item.isOffer === true || item.isOffer === 'true';
      let offerPrice = null;

      if (isOffer && item.offerPrice) {
        offerPrice = Number(item.offerPrice);
        hasOfferItems = true; 
      }

      newItems.push({
        product: item.product,
        unit_type: item.unit_type,
        quantity: qty,
        isOffer: isOffer,      
        offerPrice: offerPrice || null,
        maxPerUser: item.maxPerUser ? Number(item.maxPerUser) : null,
  allowedRemaining:
    Number(item.allowedRemaining) || 0,
        isCombo: false,
        comboId: null,
        title: null,
        comboProducts: []
      });
    }


    cart.items = newItems;
    await cart.save();


    await cart.populate([
      { path: "items.product" },
      { path: "items.comboProducts.product" }
    ]);

    if (hasOfferItems) {
      return res.status(200).json({
        message: "تم تحديث السلة بنجاح مع دعم العروض المجمعة والخاصة",
        cart
      });
    }

    return res.status(200).json({
      message: "تم تحديث السلة بنجاح",
      cart
    });

  } catch (err) {
    return res.status(500).json({
      message: "Server error",
      error: err.message
    });
  }
};

// delete cart by user must be login first
exports.deleteCartByUser = async (req, res) => {
    try {
        const { userId } = req.user;

        const cart = await CartModel.findOneAndDelete({ user: userId });

        if (!cart) {
            return res.status(404).json({ message: "Cart not found" });
        }

        return res.status(200).json({
            message: "Cart deleted successfully"
        });

    } catch (err) {
        return res.status(500).json({ message: "Server error", error: err.message });
    }
};
