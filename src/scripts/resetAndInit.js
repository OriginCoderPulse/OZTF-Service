const mongoose = require('mongoose');
require('dotenv').config();

const connectDB = async () => {
    try {
        const encodedPassword = encodeURIComponent(process.env.DB_PASSWORD);
        const mongoURI = `mongodb://${process.env.DB_USER}:${encodedPassword}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}?authSource=admin`;
        
        await mongoose.connect(mongoURI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        
        console.log('MongoDB 连接成功');
    } catch (error) {
        console.error('MongoDB 连接失败:', error);
        process.exit(1);
    }
};

const resetAndInit = async () => {
    try {
        await connectDB();

        const db = mongoose.connection.db;
        
        console.log('\n========== 开始重置数据库 ==========\n');

        // 获取所有集合
        const collections = await db.listCollections().toArray();
        
        console.log(`发现 ${collections.length} 个集合，准备删除...\n`);

        let deletedCount = 0;
        let errorCount = 0;

        for (const collection of collections) {
            try {
                const collectionName = collection.name;
                const count = await db.collection(collectionName).countDocuments();
                
                console.log(`删除集合: ${collectionName} (${count} 条记录)...`);
                
                await db.collection(collectionName).drop();
                
                console.log(`  ✓ 已删除: ${collectionName}\n`);
                deletedCount++;
            } catch (error) {
                console.error(`  ✗ 删除失败: ${collection.name} - ${error.message}\n`);
                errorCount++;
            }
        }

        console.log('\n========== 数据库重置完成 ==========');
        console.log(`成功删除: ${deletedCount} 个集合`);
        if (errorCount > 0) {
            console.log(`失败: ${errorCount} 个集合`);
        }

        console.log('\n========== 开始初始化新数据 ==========\n');

        // 加载并运行初始化脚本
        require('./initDatabase.js');

    } catch (error) {
        console.error('重置和初始化过程出错:', error);
        process.exit(1);
    }
};

resetAndInit();
