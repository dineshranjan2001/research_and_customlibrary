const multer=require('multer');
const path=require('path');
const fs=require('fs');
const { v4: uuidv4 } = require("uuid");
const config = require('./config/config');
const fileUploadConfig=config.fileUploadSettings;

let bucketClient;
let bucketConfig;
let uploadFunction;

// find the package.json file in the project folder
const findPackageJsonPath=(function (startDir){
    let currentDir=startDir;
    while(true){
        const packagePath=path.join(currentDir,'package.json');
        if(fs.existsSync(packagePath)){
            return packagePath;
        }
        const parentDir=path.resolve(currentDir,'..');

        // if i have reached the root directory, then stop the loop searching...
        if(parentDir===currentDir){
            return null;
        }
        currentDir=parentDir;
    }
})(process.cwd());
// end of find the package.json file in the project folder

const packageJson= JSON.parse(fs.readFileSync(findPackageJsonPath,'utf8'));

console.log("package json ",packageJson);


// check the dependencies and find then minio dependency and setup the minio and upload the file
if(packageJson.dependencies['minio']){
    const Minio = require('minio')
    bucketConfig = config.cloudBucketConfig;
    bucketClient = new Minio.Client(bucketConfig);
    uploadFunction= async(bucketName,folderName,file,metaData)=>{
        const uniqueFileName=`${uuidv4()}_${file.originalname.replace(/\s+/g, '_')}`;
       try {
         await bucketClient.putObject(bucketName,`${folderName}/${uniqueFileName}`, file.buffer, metaData);
       } catch (error) {
        await bucketClient.removeObject(bucketConfig.bucketName,`${folderName}/${uniqueFileName}`);
         return res.status(500).json({"statusCode":500,"status":false,"message":error.message});
       }
       return uniqueFileName;
    }
}
// end of check the dependencies and find then minio dependency and setup the minio and upload the file

// file upload function
const fileupload=(fieldNameDetails=[{name:"image",maxCount:10,folderName:"images",isOptional:false}])=>{
    console.log(fieldNameDetails);

    // use the memory storage to store the image for temporary periods of time
    const storage=multer.memoryStorage();

    // use the storage to upload the image/images using multer and it return a function
    const upload=multer({
        storage,
        limits:{fileSize:fileUploadConfig.maxFileSize || Infinity},
        fileFilter:(req,file,cb)=>{
            const allowedExtensions = fileUploadConfig.allowedExtensions;
            const extname = path.extname(file.originalname).toLowerCase();
            if(allowedExtensions.length===0 || allowedExtensions.includes(extname)){
                cb(null,true);
            }else{
                cb(new multer.MulterError('LIMIT_UNSUPPORTED_FILE_TYPE'), false);
            }
        },
    }).fields(fieldNameDetails.map((field)=>({name:field.name})));


    return async (req,res,next)=>{
        upload(req,res,async (error)=>{
            // if the error is the instance of multer error then handle the error here
            if(error instanceof multer.MulterError){
                switch(error.code){
                    case "LIMIT_FILE_SIZE":
                        return res.status(400).json({"statusCode":400,"status":false,"message":"File size exceeds the limit."});
                    case "LIMIT_UNSUPPORTED_FILE_TYPE":
                        return res.status(400).json({"statusCode":400,"status":false,"message":"Invalid file type. Only images (.jpg, .jpeg, .png) and PDFs (.pdf) are allowed."});
                    default:
                        return res.status(500).json({"statusCode":500,"status":false,"message":"File upload error"});  
                }
            }else if(error){
                return res.status(500).json({"statusCode":500,"status":false,"message":"Unknown error"});
            }
            // end of if the error is the instance of multer error then handle the error here

            // receiving the file/files after uploading the image/ images   
            let uploadedFiles={};

            // for missing fields for showing the error message to the response
            let missingFields = []; 

            // for exceedSize fields for showing the error message to the response
            let exceedSizeFields=[]; 

            try {
                const files=req?.files;
                // for checking the file present or not  or the file length is greater than 0 or equals to 0
                console.log("files ",files);

                const missingFields=fieldNameDetails.reduce((acc,field)=>{
                    //const filesForField = req.files?.[field.name];
                    
                    console.log("body ",req.body[field.name])
                    if(!field.isOptional){
                        if(req.body[field.name]!==undefined && !files?.[field.name]){
                            console.log("enennennenene")
                            acc.nofileprovided.push(field.name);
                        }else{
                            console.log("enrrr r r r r r r")
                            acc.required.push(field.name);
                        }
                    }
                    return acc;
                },{required: [], nofileprovided: [],exceedSizeFields:[]});

                if(missingFields.required.length>0 || missingFields.nofileprovided.length>0){
                    let message = '';
                    if (missingFields.required.length > 0) {
                        message += `Required fields missing: ${missingFields.required.join(', ')}`;
                    }
                    if(missingFields.exceedSizeFields.length>0){
                        message +=`Maximum files reached for ${exceedSizeFields.join(", ")}`;
                    }
                    if (missingFields.nofileprovided.length > 0) {
                        message += (message ? ', ' : '') + `No files were provided for the fields: ${missingFields.nofileprovided.join(', ')}`;
                    }
                    
                    return res.status(400).json({
                        statusCode: 400,
                        status: false,
                        message
                      });
                }

                //end of for checking the file present or not  or the file length is greater than 0 or equals to 0

                // for checking the each field if there is any field value is missing or not 
                if(Object.keys(files).length===0){
                    console.log(Object.keys(files))
                    fieldNameDetails.forEach((field)=>{
                        const missingOptionalFields = fieldNameDetails.filter(field => !field.isOptional && !files[field.name]);
                        if(missingOptionalFields.length>0){
                            if(!Object.keys(files).includes(field.name)){
                                missingFields.push(field.name);
                            }
                        }
                    });

                    // show the error messages in the response object...
                    if(missingFields.length>0){
                       // uploadedFiles={};
                        return res.status(400).json({"statusCode":400,"status":false,"message":`Empty fields :${missingFields.join(", ")}`});
                    }
                    // end of show the error messages in the response object...
                }
                // end of for checking the each field if there is any field value is missing or not 

                //for checking each fields maxSize if it is exceeds or not and show the error messages.
                await Promise.all(Object.entries(files).map(async ([fieldName,files])=>{
                    const fieldDetails = fieldNameDetails.find((fieldNameDetails) => fieldNameDetails.name === fieldName);
                    const maxCount=fieldDetails?.maxCount;
                    if(files.length>maxCount){
                        exceedSizeFields.push(fieldDetails.name);
                    }
                })); 
                console.log("exceedSizeFields ", exceedSizeFields);

                if(exceedSizeFields.length===0){
                    console.log("enterrrrrrrrrrrrrrrrrrrrrrrrr");
                    await Promise.all(Object.entries(files).map(async ([fieldName,files])=>{
                        const fieldDetails = fieldNameDetails.find((f) => f.name === fieldName);
                        uploadedFiles[`${fieldName}`]=[];

                        console.log(uploadedFiles);
                        // check the field is optional or not then call the upload function to upload the file or files of each field
                        if(fieldDetails.isOptional===false){
                            await Promise.all(files.map(async(file)=>{
                                const metaData={'Content-type':file.mimetype};
                                const uniqueFileName=await uploadFunction(bucketConfig.bucketName,fieldDetails.folderName,file,metaData);
                                uploadedFiles[fieldName].push(uniqueFileName);
                            })); 
                        }   
                        // end of check the field is optional or not then call the upload function to upload the file or files of each field
                    }));

                    // adding the uploadedFiles array of object into the request object for next task or controller
                    if(Object.keys(uploadedFiles).length>0){
                        console.log("enterrrrr into if block...",uploadedFiles,Object.keys(uploadedFiles).length > 0);
                        req.uploadedFiles=uploadedFiles;
                        console.log("uploadedFiles ",uploadedFiles);
                        next();
                    }
                     // end of adding the uploadedFiles array of object into the request object for next task or controller
                }else{
                    console.log("enter into exceedSize else block ");
                    return res.status(400).json({"statusCode":400,"status":false,"message":`Maximum files reached for ${exceedSizeFields.join(", ")}`});
                }
                // end of for checking each fields maxSize if it is exceeds or not and show the error messages.


            } catch (error) {
                console.log(error);
                // if there is any error then delete the recent uploaded file into the minio 
                // await Promise.all(Object.entries(uploadedFiles).forEach(async([fieldName,fileName])=>{
                //     await bucketClient.removeObject(bucketConfig.bucketName,`${fieldName}/${fileName}`).catch((error)=>{
                //         return res.status(500).json({"statusCode":400,"status":false,"message":error.message});
                //     })
                // }));
                //end of if there is any error then delete the recent uploaded file into the minio 
            }
        })        
    }
}

module.exports=fileupload;

