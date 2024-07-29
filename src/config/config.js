module.exports = {
    development: {
        username: 'root',
        password: 'root@1234',
        database: 'custom_library_test',
        host: 'localhost',
        dialect: 'mysql',
    },
    cloudBucketConfig: {
        endPoint: '62.72.31.234',
        port: 9000,
        useSSL: false,
        accessKey: 'vejUrgg3WUVYKZ9vWmGj',
        secretKey: 'WtwpjXS8mTLuW7AuklOe80RDkuIYY3acdiLybRby',
        bucketName: 'teample',
    },
    fileUploadSettings:{
        maxFileSize:process.env.MAX_FILE_SIZE?parseInt(process.env.MAX_FILE_SIZE,10): Infinity,
        allowedExtensions:process.env.ALLOWED_EXTENSIONS ? process.env.ALLOWED_EXTENSIONS.split(',') : [],
    }
};


/*
    if .env file setup then do this way....

    MINIO_END_POINT=your_minio_endpoint
    MINIO_PORT=9000
    MINIO_USE_SSL=false
    MINIO_ACCESS_KEY=your_access_key
    MINIO_SECRET_KEY=your_secret_key
    MAX_FILE_SIZE=10485760 # Example: 10 MB, can be omitted for no limit
    ALLOWED_EXTENSIONS=.jpg,.jpeg,.png,.pdf # Example, can be omitted for no restrictions


*/