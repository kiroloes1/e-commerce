const jwt=require('jsonwebtoken');
const User=require(`${__dirname}/../models/user`);
exports.protected=async(req,res,next)=>{
    const authHeader=req.headers.authorization;;
    if(!authHeader || !authHeader.startsWith('Bearer')){
        return res.status(401).json({message:"يجب عليك التسجيل اولا"});
    }
    const token=authHeader.split(" ")[1];
    if(!token){
        return res.status(401).json({message:"يجب عليك التسجيل اولا"});
    }
    try{
     const decoded=jwt.verify(token,process.env.ACCESS_JWT_SECRET);
     if(!decoded){
        return res.status(401).json({message:"Invalid token"});
     }
     const user=await User.findById(decoded.userId).select('-password');
     if(!user){
        return res.status(401).json({message:"هذا الحساب لم يعد موجودا "});
     }
     if(!user.active){
        return res.status(401).json({message:"هذا الحساب تم حظره من قبل الأدمن "});

     }
     req.user=decoded;
     next();

    }catch(error){
        res.status(401).json({message:"Invalid token",error:error.message});
    }
}