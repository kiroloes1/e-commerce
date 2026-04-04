const mongoose=require("mongoose");

const userSchema=new mongoose.Schema({
    // personal information
     userName:{
        type:String,
        required:true
     },
     email:{
        type:String,
        required:true,
        unique:true,
        match: /^\S+@\S+\.\S+$/
     },
     password:{
        type:String,
        required:true
     },
     address:{
         city:String,
         street:String,
         building:String,
         floor:String,
     },
     phoneNumber:[{
        type:String,
        match: /^\+?[1-9]\d{1,14}$/
        }],
       profileImage:{
         url:String,
         publicId:String
     },
     role:{
        type:String,
        enum:['customer','admin','supplier'],
        default:'customer'
     },
     
    //  account status
    active:{
        type:Boolean,
        default:true
    },
     lastLogin:{
        type:Date,
        default:Date.now
     },
     lastChangePassword:{
        type:Date,
        default:Date.now
     },
        passwordResetCode: {type: String},
        passwordResetExpires: Date,
        passwordResetAttempts :{
        type: Number,
        default:0
        },
        pandding:Date

},{timestamps:true});

const User=mongoose.model("User",userSchema);

module.exports=User;