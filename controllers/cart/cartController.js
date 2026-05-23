const CartModel = require(`${__dirname}/../../models/cart`);
const ProductModel = require(`${__dirname}/../../models/product`);

// 1. جلب العربة مع عمل Populate كامل لكل أنواع المنتجات (عادية + داخل الكومبو)
exports.getCartByUser = async (req, res) => {
    try {
        const { userId } = req.user;

        let cart = await CartModel.findOne({ user: userId })
            .populate("items.product", "-purchasePrice")
            .populate("items.comboProducts.product", "-purchasePrice");

        if (!cart) {
            return res.status(200).json({ user: userId, items: [] });
        }

        return res.status(200).json(cart);

    } catch (err) {
        return res.status(500).json({ message: "Server error", error: err.message });
    }
};

// 2. إضافة منتجات أو عروض مجمعة إلى العربة دون عمل Overwrite
exports.addToCart = async (req, res) => {
    try {
        const { userId } = req.user;
        const { items } = req.body;

        let cart = await CartModel.findOne({ user: userId });

        if (!cart) {
            cart = new CartModel({ user: userId, items: [] });
        }

        for (const newItem of items) {
            const qty = Number(newItem.quantity);
            if (!qty || isNaN(qty) || qty <= 0) continue;

            const isCombo = newItem.isCombo === true || newItem.isCombo === 'true';

            // --- أ. معالجة عروض الكومبو المجمعة (Combo Offer) ---
            if (isCombo) {
                if (!newItem.comboId) continue;

                // البحث هل نفس الكومبو مضاف مسبقاً بنفس المعرف؟
                const index = cart.items.findIndex(
                    (item) => item.isCombo === true && item.comboId.toString() === newItem.comboId.toString()
                );

                if (index > -1) {
                    // الكومبو موجود بالفعل -> زود الكمية فقط
                    cart.items[index].quantity += qty;
                } else {
                    // كومبو جديد تماماً -> ضيف السطر بكامل بياناته
                    cart.items.push({
                        isCombo: true,
                        comboId: newItem.comboId,
                        title: newItem.title || "عرض كومبو مجمع",
                        quantity: qty,
                        offerPrice: newItem.offerPrice ? Number(newItem.offerPrice) : null,
                        comboProducts: Array.isArray(newItem.items) ? newItem.items.map(subItem => ({
                            product: subItem.product,
                            productName: subItem.productName,
                            quantity: subItem.quantity
                        })) : [],
                        product: null,
                        unit_type: null,
                        isOffer: false,
                        maxPerUser: newItem.maxPerUser ? Number(newItem.maxPerUser) : null
                    });
                }
                continue; // انتقل للعنصر التالي في المصفوفة
            }

            // --- ب. معالجة المنتجات العادية وعروض مجلة العروض المنفردة ---
            if (!newItem.product) continue;
            const product = await ProductModel.findById(newItem.product);
            if (!product) continue;

            // حساب الحد الأقصى للمخزون المتاح بناءً على نوع الوحدة
            const maxStock = newItem.unit_type === "قطعة" ? product.totalUnits : product.availableQuantity;
            const isOffer = newItem.isOffer === true || newItem.isOffer === 'true';

            // البحث عن المنتج المتطابق (نفس الـ ID، ونفس نوع الوحدة، ونفس حالة العرض)
            const index = cart.items.findIndex(
                (item) =>
                    item.isCombo !== true &&
                    item.product && item.product.toString() === newItem.product.toString() &&
                    item.unit_type === newItem.unit_type &&
                    item.isOffer === isOffer
            );

            if (index > -1) {
                const currentQty = Number(cart.items[index].quantity) || 0;
                let newQty = currentQty + qty;

                // تثبيت الكمية عند الحد الأقصى للمخزون إذا تخطته (CLAMP)
                if (newQty > maxStock) {
                    newQty = maxStock;
                }

                // التحقق من شرط الـ maxPerUser للعروض المنفردة
                if (isOffer && newItem.maxPerUser) {
                    const maxAllowed = Number(newItem.maxPerUser);
                    if (newQty > maxAllowed) {
                        newQty = maxAllowed; 
                    }
                }

                cart.items[index].quantity = newQty;
            } else {
                // منتج أو عرض منفرد جديد تماماً على العربة
                let finalQty = qty > maxStock ? maxStock : qty;

                if (isOffer && newItem.maxPerUser) {
                    const maxAllowed = Number(newItem.maxPerUser);
                    if (finalQty > maxAllowed) {
                        finalQty = maxAllowed;
                    }
                }

                cart.items.push({
                    product: newItem.product,
                    unit_type: newItem.unit_type,
                    quantity: finalQty,
                    isOffer: isOffer,
                    offerPrice: isOffer && newItem.offerPrice ? Number(newItem.offerPrice) : null,
                    maxPerUser: isOffer && newItem.maxPerUser ? Number(newItem.maxPerUser) : null,
                    isCombo: false,
                    comboId: null,
                    title: null,
                    comboProducts: []
                });
            }
        }

        await cart.save();

        // عمل Populate لضمان عودة البيانات كاملة للفرونت إند مباشرة بعد الإضافة
        await cart.populate([
            { path: "items.product", select: "-purchasePrice" },
            { path: "items.comboProducts.product", select: "-purchasePrice" }
        ]);

        return res.status(200).json({
            message: "Cart updated with stock and offers validation",
            cart
        });

    } catch (err) {
        return res.status(500).json({
            message: "Server error",
            error: err.message
        });
    }
};

// 3. تحديث السلة بالكامل (الاستبدال الشامل المتوافق مع العروض والكومبو)
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

            // معالجة الكومبو
            if (item.isCombo === true || item.isCombo === 'true') {
                newItems.push({
                    isCombo: true,
                    comboId: item.comboId,
                    title: item.title || "عرض كومبو مجمع",
                    quantity: qty,
                    offerPrice: item.offerPrice ? Number(item.offerPrice) : null,
                    comboProducts: Array.isArray(item.items) ? item.items.map(subItem => ({
                        product: subItem.product,
                        productName: subItem.productName,
                        quantity: subItem.quantity
                    })) : [],
                    product: null,
                    unit_type: null,
                    isOffer: false,
                    maxPerUser: item.maxPerUser ? Number(item.maxPerUser) : null
                });
                
                hasOfferItems = true;
                continue;
            }

            // معالجة المنتج العادي أو العرض المنفرد
            if (!item.product) continue;
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
                isCombo: false,
                comboId: null,
                title: null,
                comboProducts: []
            });
        }

        cart.items = newItems;
        await cart.save();

        await cart.populate([
            { path: "items.product", select: "-purchasePrice" },
            { path: "items.comboProducts.product", select: "-purchasePrice" }
        ]);

        return res.status(200).json({
            message: hasOfferItems ? "تم تحديث السلة بنجاح مع دعم العروض المجمعة والخاصة" : "تم تحديث السلة بنجاح",
            cart
        });

    } catch (err) {
        return res.status(500).json({
            message: "Server error",
            error: err.message
        });
    }
};

// 4. مسح العربة بالكامل عند تسجيل الخروج أو إتمام الطلب
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
