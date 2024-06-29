const createUserDetails = require('../controller/main.controller');
const fileupload = require('../fileupload.middleware');

const router=require('express').Router();

router.post("/uploadimage",fileupload("CustomFolder",[{name:"image",maxCount:1}]),createUserDetails)

module.exports=router;