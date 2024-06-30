const multer=require("multer");

const path=require("path");
const fs=require('fs');
const { v4: uuidv4 } = require("uuid");
const config = require('./config/config');
const fileUploadConfig=config.fileUploadSettings;


let bucketClient;
let bucketConfig;
let uploadFunction;

//? find the package.json into project folders
const findPackageJsonPath=(function (startDir){
    let currentDir=startDir;
    while(true){
        const packagePath=path.join(currentDir,'package.json');
        if(fs.existsSync(packagePath)){
            return packagePath;
        }
        const parentDir=path.resolve(currentDir,'..');

        //? if i have reached the root directory, then stop the loop searching...
        if(parentDir===currentDir){
            return null;
        }
        currentDir=parentDir;
    }
})(process.cwd());

//? read the package.json file
const packageJson= JSON.parse(fs.readFileSync(findPackageJsonPath,'utf8'));

console.log("package json ",packageJson);

//? check the dependencies and find then minio dependency and setup the minio
if(packageJson.dependencies['minio']){
    const Minio = require('minio')
    bucketConfig = config.cloudBucketConfig;
    bucketClient = new Minio.Client(bucketConfig);
    uploadFunction= async(bucketName,folderName,fieldName,file,metaData)=>{
        const uniqueFileName=`${uuidv4()}_${file.originalname.replace(/\s+/g, '_')}`;
       try {
         await bucketClient.putObject(bucketName,`${folderName}/${fieldName}/${uniqueFileName}`, file.buffer, metaData);
       } catch (error) {
         return res.status(500).json({"statusCode":500,"status":false,"message":error.message});
       }
       return uniqueFileName;
    }
}



const fileupload=(folderName,fieldNameDetails=[{name:"image",maxCount:10}])=>{

    //? use the memory storage to store the image for temporary periods of time
    const storage=multer.memoryStorage();

    //? use the storage to upload the image/images using multer and it return a function
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
    console.log("upload ",upload);
    return async (req,res,next)=>{
           //? fileupload function 
             upload(req,res,async (error)=>{
                //? if the error is the instance of multer error then handle the error here
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

                //? receiving the file/files after uploading the image/ images   
                let uploadedFiles={};
                let missingFields = [];  
                try {
                    const files=req?.files;
                    console.log("files ",files);
                    
                    if(!files || Object.keys(files).length===0){
                        uploadedFiles={};
                        return res.status(400).json({"statusCode":400,"status":false,"message": `No files provided`});
                    }
                    if(Object.keys(files).length!==0){
                        console.log(Object.keys(files))
                        fieldNameDetails.forEach((field)=>{
                            if(!Object.keys(files).includes(field.name)){
                                missingFields.push(field.name);
                            }
                        });
                        if(missingFields.length>0){
                            uploadedFiles={};
                            return res.status(400).json({"statusCode":400,"status":false,"message":`Empty fields :${missingFields.join(", ")}`});
                        }
                    }
    
                    console.log("keys ",Object.entries(files),files.length);
                    await Promise.all(Object.entries(files).map(async ([fieldName,files])=>{
                        const fieldDetails = fieldNameDetails.find((f) => f.name === fieldName);
                        const maxCount=fieldDetails?.maxCount || 10;
                        uploadedFiles[`${fieldName}`]=[];
    
                        //? check the file/ files present or not or null or it's length is equals to zero then handle here
                        if(files.length>maxCount){
                            uploadedFiles={};
                            return res.status(400).json({"statusCode":400,"status":false,"message":`Maximum ${maxCount} files allowed in ${fieldName}`});
                        }
                        console.log(uploadedFiles);
                        await Promise.all(files.map(async(file)=>{
                            const metaData={'Content-type':file.mimetype};
                            const uniqueFileName=await uploadFunction(bucketConfig.bucketName,folderName,fieldName,file,metaData);
                            uploadedFiles[fieldName].push(uniqueFileName);
                            // await minioClient.putObject(minio.bucketName,`${folderName}/${fieldName}/${uniqueFileName}`, file.buffer, metaData).then(()=>{
                            //     uploadedFiles[fieldName].push(uniqueFileName);
                            // }).catch((error)=>{
                            //     uploadedFiles={};
    
                            //     console.log(error);
                            //     throw new Error({"statusCode":500,"status":false,"message":error.message});
                            // });
                        }));    
                    }));            
                    //? adding the uploadedFilesOne and uploadedFilesTwo array of object into the request object for next task
                    if(Object.keys(uploadedFiles).length>0){
                        console.log("enterrrrr into if block...",uploadedFiles,Object.keys(uploadedFiles).length > 0);
                        req.uploadedFiles=uploadedFiles;
                        console.log("uploadedFiles ",uploadedFiles);
                        next();
                    }   
                } catch (error) {
                    await Promise.all(Object.entries(uploadedFiles).forEach(async([fieldName,fileName])=>{
                        await bucketClient.removeObject(bucketConfig.bucketName,`${folderName}/${fieldName}/${fileName}`).catch((error)=>{
                            throw new Error({"statusCode":500,"status":false,"message":error.message});
                        })
                    }));
                }
            }); 
    }
};

module.exports=fileupload;