const createUserDetails = require('../controller/main.controller');
const fileupload = require('../fileuploadversion1.middleware');

const router=require('express').Router();

router.post("/uploadimage",fileupload([{name:"image",maxCount:1,folderName:"images",isOptional:false}]),createUserDetails);
//router.post("/uploadmultiimage",fileupload("CustomMultiFolder",[{name:"image",maxCount:5}]),createUserDetails);
router.post("/uploadFieldmultiImage",fileupload([
    {name:"image1",maxCount:1,folderName:"images1",isOptional:false},
    {name:"image2",maxCount:1,folderName:"images2",isOptional:true},
    {name:"pdf",maxCount:1,folderName:"pdfs",isOptional:false}
]),createUserDetails);

module.exports=router;