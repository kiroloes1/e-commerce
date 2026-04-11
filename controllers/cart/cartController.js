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
      cart = new CartModel({ user: userId, items: [] });
    }

items.forEach((newItem) => {
  const qty = Number(newItem.quantity);

  // ❌ block invalid values
  if (!qty || isNaN(qty) || qty <= 0) return;

  const index = cart.items.findIndex(
    (item) =>
      item.product.toString() === newItem.product &&
      item.unit_type === newItem.unit_type
  );

  if (index > -1) {
    const currentQty = Number(cart.items[index].quantity) || 0;

    const newQty = currentQty + qty;

    cart.items[index].quantity = isNaN(newQty) ? currentQty : newQty;
  } else {
    cart.items.push({
      product: newItem.product,
      quantity: qty,
      unit_type: newItem.unit_type
    });
  }
});
    await cart.save();

    return res.status(200).json({
      message: "Cart updated with stock limit",
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

    cart.items = (items || []).map((item) => ({
      product: item.product,
      quantity: Number(item.quantity) || 1,
      unit_type: item.unit_type
    }));

    await cart.save();

    return res.json({
      message: "Cart replaced",
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
