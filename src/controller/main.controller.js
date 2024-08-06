const createUserDetails=async (req,res)=>{
    const {name, phoneNumber,email, password}=req.body;
    //const imageName=req.uploadedFiles.image;

    res.status(201).json({
        statusCode:201,
        message:"Data successfully created.",
        data:{
            name,
            email,
            phoneNumber,
            //imageName,
            password
        },
    })
}
module.exports=createUserDetails;