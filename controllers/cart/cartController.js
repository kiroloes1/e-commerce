// const CartModel=require(`${__dirname}/../../models/cart`);
// const ProductModel = require(`${__dirname}/../../models/product`);




// get cart by user must be login first
exports.getCartByUser = async (req, res) => {
    try {
      const CartModel = req.app.locals.models.Cart;
const ProductModel = req.app.locals.models.Product;
        const { userId } = req.user;

    const cart = await CartModel.findOne({ user: userId })
  .populate("items.product", "-purchasePrice") || [];



        return res.status(200).json(cart);

    } catch (err) {
        return res.status(500).json({ message: "Server error", error: err.message });
    }
};

// create 
exports.addToCart = async (req, res) => {
  try {
    const CartModel = req.app.locals.models.Cart;
const ProductModel = req.app.locals.models.Product;
    const { userId } = req.user;
    const { items } = req.body;

    let cart = await CartModel.findOne({ user: userId });

    if (!cart) {
      cart = new CartModel({ user: userId, items: [] });
    }

    for (const newItem of items) {
      const qty = Number(newItem.quantity);
      if (!qty || isNaN(qty)) continue;

  
      const product = await ProductModel.findById(newItem.product);
      if (!product) continue;

      const maxStock =
        newItem.unit_type === "قطعة"
          ? product.totalUnits
          : product.availableQuantity;

      const index = cart.items.findIndex(
        (item) =>
          item.product.toString() === newItem.product &&
          item.unit_type === newItem.unit_type
      );

      if (index > -1) {
        const currentQty = Number(cart.items[index].quantity) || 0;

        let newQty = currentQty + qty;

        //  CLAMP
        if (newQty > maxStock) {
          newQty = maxStock;
        }

        cart.items[index].quantity = newQty;
      } else {
        cart.items.push({
          product: newItem.product,
          unit_type: newItem.unit_type,
          quantity: qty > maxStock ? maxStock : qty
        });
      }
    }

    await cart.save();

    return res.status(200).json({
      message: "Cart updated with stock validation",
      cart
    });

  } catch (err) {
    return res.status(500).json({
      message: "Server error",
      error: err.message
    });
  }
};

// update
exports.updateCart = async (req, res) => {
  try {
    const CartModel = req.app.locals.models.Cart;
const ProductModel = req.app.locals.models.Product;
    const { userId } = req.user;
    const { items } = req.body;

    let cart = await CartModel.findOne({ user: userId });

    if (!cart) {
      return res.status(404).json({
        message: "Cart not found"
      });
    }

    const newItems = [];

    for (const item of items) {
      const qty = Number(item.quantity);
      if (!qty || isNaN(qty)) continue;

      const product = await ProductModel.findById(item.product);
      if (!product) continue;



      newItems.push({
        product: item.product,
        unit_type: item.unit_type,
        quantity: qty 
      });
    }

    cart.items = newItems;

    await cart.save();

    return res.status(200).json({
      message: "Cart replaced with validation",
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
      const CartModel = req.app.locals.models.Cart;
const ProductModel = req.app.locals.models.Product;
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