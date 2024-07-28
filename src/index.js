import express from "express";
import db from "./db.js";
import apiRouter from "./routes/api.routes.js";
import dotenv from "dotenv";
import cors from "cors";

dotenv.config({path:'../.env'});

const app = express();

app.use(cors({
    origin:process.env.CORS_ORIGIN,
    credentials:true
}));
app.use(express.urlencoded({extended:true}));
app.use(express.json())


//router
app.use("/api/v1",apiRouter);

db.query("SELECT 1")
    .then(()=>{
        console.log("Database is connected");
        app.listen(process.env.PORT,()=>console.log(`Server is listened at ${process.env.PORT}`))
    })
    .catch((err)=>console.log("Error is encountered",err));