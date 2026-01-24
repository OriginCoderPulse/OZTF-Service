const mongoose = require("mongoose");
require("dotenv").config();

const connectDB = async () => {
  try {
    // 对密码进行URL编码，处理特殊字符
    const encodedPassword = encodeURIComponent(process.env.DB_PASSWORD);
    const mongoURI = `mongodb://${process.env.DB_USER}:${encodedPassword}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}?authSource=admin`;

    await mongoose.connect(mongoURI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log("✅ MongoDB 连接成功");
    return Promise.resolve();
  } catch (error) {
    process.exit(1);
    return Promise.reject(error);
  }
};

module.exports = connectDB;
