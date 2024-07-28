import express from "express";
import { getCombinedData, getPieData, getPriceRange, getSearchData, getStat, initializeDB } from "../controllers/api.controllers.js";

const router = express.Router();

router.get("/initialize",initializeDB);
router.get("/search-data",getSearchData);
router.get("/combine-data/:month",getCombinedData);
router.get("/stat/:month",getStat);
router.get("/price-range/:month",getPriceRange);
router.get("/pie-data/:month",getPieData);

export default router;