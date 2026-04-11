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
};

// create 
exports.addToCart = async (req, res) => {
  try {
    const { userId } = req.user;
    const { items } = req.body;

    let cart = await CartModel.findOne({ user: userId });

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
          item.product.toString() === newItem.product &&
          item.unit_type === newItem.unit_type
      );

      if (index > -1) {
        // 🔥 merge
        cart.items[index].quantity += newItem.quantity;
      } else {
        cart.items.push(newItem);
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