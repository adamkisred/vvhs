// MongoDB connection helper for the application.
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let memoryServer;

const shouldUseMemoryFallback = (error) => {
    const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/viswashanthi_school';
    const isLocalMongo = uri.includes('127.0.0.1') || uri.includes('localhost');
    const isConnectionRefused = error.message.includes('ECONNREFUSED');
    const isHostedEnvironment = process.env.NODE_ENV === 'production' || process.env.RENDER === 'true';

    return process.env.MONGODB_MEMORY_FALLBACK !== 'false' && !isHostedEnvironment && isLocalMongo && isConnectionRefused;
};

const connectMemoryDB = async () => {
    memoryServer = await MongoMemoryServer.create({
        instance: {
            dbName: 'viswashanthi_school'
        }
    });

    const connection = await mongoose.connect(memoryServer.getUri());
    console.log(`Embedded MongoDB started: ${connection.connection.host}/${connection.connection.name}`);
    console.log('Data in embedded MongoDB is for local development and resets when the server stops.');
};

const connectDB = async () => {
    try {
        mongoose.set('strictQuery', true);

        const connection = await mongoose.connect(
            process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/viswashanthi_school'
        );

        console.log(`MongoDB connected: ${connection.connection.host}/${connection.connection.name}`);
    } catch (error) {
        if (shouldUseMemoryFallback(error)) {
            console.warn(`Local MongoDB unavailable (${error.message}). Starting embedded MongoDB fallback...`);
            await connectMemoryDB();
            return;
        }

        console.error(`MongoDB connection failed: ${error.message}`);
        process.exit(1);
    }
};

const stopMemoryDB = async () => {
    if (memoryServer) {
        await mongoose.disconnect();
        await memoryServer.stop();
    }
};

process.once('SIGINT', async () => {
    await stopMemoryDB();
    process.exit(0);
});

module.exports = connectDB;
