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
         region:String,
         street:String,
         building:String,
         floor:String,
     },
      phoneNumber: {
      type: String,
      unique: true,
      match: [/^(010|011|012|015)[0-9]{8}$/, 'Invalid Egyptian phone number']
      },
     role:{
        type:String,
        enum:["superadmin",'customer','admin'],
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
        pandding:Date,
        notes:{type:String}

},{timestamps:true});

const User=mongoose.model("User",userSchema);

module.exports=User;
