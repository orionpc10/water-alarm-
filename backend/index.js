import dotenv from 'dotenv';
dotenv.config({
    path : "./.env"
})

import {app} from "./app.js"
import connectDB from "./src/db/index.js"

const PORT = process.env.PORT || 6666;

connectDB()
.then(
    ()=>{
        app.listen(PORT,()=>{
            console.log(`Server is running on port ${PORT}`);
        })
    }
)
.catch((err) => {
    console.error("Error starting server:", err);
});