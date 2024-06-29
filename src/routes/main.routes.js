const fileupload = require('../fileupload.middleware');

const router=require('express').Router();

router.post("/uploadimage",fileupload("CustomFolder",[{name:"image",maxCount:1}]))

module.exports=router;