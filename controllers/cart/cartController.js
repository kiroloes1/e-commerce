const CartModel=require(`${__dirname}/../../models/cart`);

// get cart by user must be login first
exports.getCartByUser = async (req, res) => {
    try {
        const { userId } = req.user;

    const cart = await CartModel.findOne({ user: userId })
  .populate("items.product", "-purchasePrice");

        if (!cart) {
            return res.status(404).json({ message: "Cart not found" });
        }

        return res.status(200).json(cart);

    } catch (err) {
        return res.status(500).json({ message: "Server error", error: err.message });
    }
};const CartModel=require(`${__dirname}/../../models/cart`);

// get cart by user must be login first
exports.getCartByUser = async (req, res) => {
    try {
        const { userId } = req.user;

    const cart = await CartModel.findOne({ user: userId })
  .populate("items.product", "-purchasePrice");

        if (!cart) {
            return res.status(404).json({ message: "Cart not found" });
        }

        return res.status(200).json(cart);

    } catch (err) {
        return res.status(500).json({ message: "Server error", error: err.message });
    }
};

// create 
exports.addToCart = async (req, res) => {
  try {
    const { userId } = req.user;
    const { items } = req.body;

    let cart = await CartModel.findOne({ user: userId }).populate("items.product");

    if (!cart) {
      cart = await CartModel.create({
        user: userId,
        items
      });

      return res.status(201).json({
        message: "Cart created",
        cart
      });
    }

    items.forEach((newItem) => {
      const index = cart.items.findIndex(
        (item) =>
          item.product._id.toString() === newItem.product &&
          item.unit_type === newItem.unit_type
      );

      let maxQty = 0;

      const product = newItem.product;

      if (newItem.unit_type === "قطعة") {
        maxQty = product.totalUnits;
      } else {
        maxQty = product.availableQuantity;
      }

      if (index > -1) {
        let newQty =
          cart.items[index].quantity + newItem.quantity;

        // clamp
        cart.items[index].quantity = Math.min(newQty, maxQty);
      } else {
        cart.items.push({
          product: newItem.product,
          quantity: Math.min(newItem.quantity, maxQty),
          unit_type: newItem.unit_type
        });
      }
    });

    await cart.save();

    return res.status(200).json({
      message: "Item added to cart",
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
    const { userId } = req.user;
    const { items } = req.body;

    let cart = await CartModel.findOne({ user: userId });

    if (!cart) {
      return res.status(404).json({
        message: "Cart not found"
      });
    }

    // 🔥 replace كامل
    cart.items = items;

    await cart.save();

    return res.status(200).json({
      message: "Cart updated (replaced)",
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
