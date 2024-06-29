module.exports = {
    development: {
        username: 'root',
        password: 'root@1234',
        database: 'jala_manak',
        host: 'localhost',
        dialect: 'mysql',
        //migrationStoragePath: 'src/migrations'
    },
    production: {
        username: 'jalamanak_api',
        password: 'jalamanakapi@2024',
        database: 'jalamanakdb',
        host: '62.72.31.234',
        dialect: 'mysql'
    },
    emailConfig: {
        MAIL_DRIVER: "smtp",
        MAIL_HOST: "smtp.gmail.com",
        MAIL_PORT: 465,
        MAIL_USERNAME: "watercorporationofodisha0@gmail.com",
        MAIL_PASSWORD: "oqnr prlm ldre tyvf",
    },
    minioClient: {
        END_POINT: '62.72.31.234',
        PORT: 9000,
        USESSL: false,
        ACCESS_KEY: 'vejUrgg3WUVYKZ9vWmGj',
        SECRET_KEY: 'WtwpjXS8mTLuW7AuklOe80RDkuIYY3acdiLybRby',
        BUCKET_NAME: 'teample',
    }
};
