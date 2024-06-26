const multer=require("multer");
const path=require("path");
const { Constants } = require("../utils/constant");
const { v4: uuidv4 } = require("uuid");
const minioClient = require('../utils/minioClient');
const config = require('../config/config');
const chosenConfig = config.minioClient;



const fileupload=(folderName,fieldNameDetails=[{name:"image",maxCount:10}])=>{

    //? use the memory storage to store the image for temporary periods of time
    const storage=multer.memoryStorage();

    //? use the storage to upload the image/images using multer and it return a function
    const upload=multer({
        storage,
        limits:{fileSize:10*1024*1024},
        fileFilter:(req,file,cb)=>{
            const allowedExtensions = ['.jpg', '.jpeg', '.png', '.pdf'];
            const extname = path.extname(file.originalname).toLowerCase();
            if(allowedExtensions.includes(extname)){
                cb(null,true);
            }else{
                cb(new new multer.MulterError('LIMIT_UNSUPPORTED_FILE_TYPE'), false);
            }
        },
    }).fields(fieldNameDetails.map((field)=>({name:field.name})));
    console.log("upload ",upload);
    return async (req,res,next)=>{
        console.log("fieldNameDetails ",fieldNameDetails[1].name.length);
           //? fileupload function 
             upload(req,res,async (error)=>{
                //? if the error is the instance of multer error then handle the error here
                if(error instanceof multer.MulterError){
                    switch(error.code){
                        case "LIMIT_FILE_SIZE":
                            throw new Error({"statusCode":Constants.HTTPBADREQUEST,"status":Constants.failedStatus,"message":"File size exceeds the limit."});
                        case "LIMIT_UNSUPPORTED_FILE_TYPE":
                            throw  new Error({"statusCode":Constants.HTTPBADREQUEST,"status":Constants.failedStatus,"message":"Invalid file type. Only images (.jpg, .jpeg, .png) and PDFs (.pdf) are allowed."});
                        default:
                            throw new Error({"statusCode":Constants.HTTPINTERNALSERVERERROR,"status":Constants.failedStatus,"message":"File upload error"});  
                    }
                }else if(error){
                    throw  new Error({"statusCode":Constants.HTTPINTERNALSERVERERROR,"status":Constants.failedStatus,"message":"Unknown error"});
                }

                //? receiving the file/files after uploading the image/ images     
                const files=req?.files;
                console.log("files ",files);
                const uploadedFiles={};

                let missingFields = [];
                if(Object.keys(files).length===0){
                    return res.status(Constants.HTTPBADREQUEST).json({"statusCode":Constants.HTTPBADREQUEST,"status":Constants.failedStatus,"message": `No files provided`});
                }
                if(Object.keys(files).length!==0){
                    console.log(Object.keys(files))
                    fieldNameDetails.forEach((field)=>{
                        if(!Object.keys(files).includes(field.name)){
                            missingFields.push(field.name);
                        }
                    });
                    if(missingFields.length>0){
                        return res.status(Constants.HTTPBADREQUEST).json({"statusCode":Constants.HTTPBADREQUEST,"status":Constants.failedStatus,"message":`Empty fields :${missingFields.join(", ")}`});
                    }
                }

                console.log("keys ",Object.keys(files),files.length);
                await Promise.all(Object.entries(files).map(async ([fieldName,files])=>{
                    const fieldDetails = fieldNameDetails.find((f) => f.name === fieldName);
                    const maxCount=fieldDetails?.maxCount || 10;
                    uploadedFiles[`${fieldName}`]=[];

                    //? check the file/ files present or not or null or it's length is equals to zero then handle here
                    if(files.length>maxCount){
                        return res.status(Constants.HTTPBADREQUEST).json({"statusCode":Constants.HTTPBADREQUEST,"status":Constants.failedStatus,"message":`Maximum ${maxCount} files allowed in ${fieldName}`});
                    }
                    console.log(uploadedFiles);
                    await Promise.all(files.map(async(file)=>{
                        const uniqueFileName=`${uuidv4()}_${file.originalname.replace(/\s+/g, '_')}`;
                        const metaData={'Content-type':file.mimetype};
                        await minioClient.putObject(chosenConfig.BUCKET_NAME, `${folderName}/${fieldName}/${uniqueFileName}`, file.buffer, metaData).then(()=>{
                            uploadedFiles[fieldName].push(uniqueFileName);
                        }).catch((error)=>{
                            console.log(error);
                            throw new Error({"statusCode":Constants.HTTPINTERNALSERVERERROR,"status":Constants.failedStatus,"message":error.message});
                        });
                    }));    
                }));            
                //? adding the uploadedFilesOne and uploadedFilesTwo array of object into the request object for next task
                req.uploadedFiles=uploadedFiles;
                console.log("uploadedFiles ",uploadedFiles);
                next();
            }); 
    }
};

module.exports=fileupload;