const express=require('express');
const cors=require('cors');
const router = require('./src/routes/main.routes');
const app=express();

app.use(cors());
app.use(express.json());
app.use(router);
app.listen(8089,()=>{
    console.log(`Server is running on 8089 port...`)
});

module.exports=app;