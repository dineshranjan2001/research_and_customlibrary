const createUserDetails = require('../controller/main.controller');
const fileupload = require('../fileuploadversion1.middleware');

const router=require('express').Router();

router.post("/uploadimage",fileupload([{name:"image",maxCount:1,folderName:"images",isOptional:true}]),createUserDetails);
//router.post("/uploadmultiimage",fileupload("CustomMultiFolder",[{name:"image",maxCount:5}]),createUserDetails);
router.post("/uploadFieldmultiImage",fileupload([
    {name:"image1",maxCount:1,folderName:"images1",isOptional:true},
    {name:"image2",maxCount:1,folderName:"images2",isOptional:false},
    {name:"pdf",maxCount:1,folderName:"pdfs",isOptional:false}
]),createUserDetails);

module.exports=router;