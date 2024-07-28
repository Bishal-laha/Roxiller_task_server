import db from "../db.js";
import axios from "axios";

export const initializeDB = async (req, res) => {
    try {
        const response = await axios.get(process.env.API_URI);
        const data = response.data;
        const connection = await db.getConnection();
        await connection.beginTransaction();
        try {
            await connection.query('DELETE FROM item_table');
            const insertQuery = `
                INSERT INTO item_table (id, title, price, description, category, image, sold, dateOfSale)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `;
            for (const item of data) {
                await connection.query(insertQuery, [item.id,item.title,item.price,item.description,
                    item.category,item.image,item.sold,new Date(item.dateOfSale)]);
            }
            await connection.commit();
            res.status(200).json({ message: 'Database initialized successfully' });
        } catch (err) {
            await connection.rollback();
            throw err;
        } finally {
            connection.release();
        }
    } catch (error) {
        res.status(500).json({ message: 'Failed to initialize database' });
    }
}

export const getStat = async(req,res)=>{
    const month = req.params['month'];
    if (!month)
        return res.status(400).json({ message: 'Invalid month format' });
    try {
         const connection = await db.getConnection();
         const [total_sale_amount] = await connection.query(`
            SELECT SUM(price) AS totalSaleAmount
            FROM item_table
            WHERE MONTH(dateOfSale) = ${month} AND sold = true`);
        const [total_num_sold] = await connection.query(`
            SELECT COUNT(sold) AS totalNumSold
            FROM item_table
            WHERE MONTH(dateOfSale) = ${month} AND sold = true`);
        const [total_num_not_sold] = await connection.query(`
            SELECT COUNT(sold) AS totalNumNotSold
            FROM item_table
            WHERE MONTH(dateOfSale) = ${month} AND sold = false`);
        const result = {
                totalSaleAmount:total_sale_amount[0].totalSaleAmount || 0,
                totalNumSold:total_num_sold[0].totalNumSold || 0,
                totalNumNotSold:total_num_not_sold[0].totalNumNotSold || 0
            }
        connection.release();
        res.json({data:result});
    } catch (error) {
        res.status(500).json({ message: 'Failed to fetch stat' });
    }
}

export const getPriceRange = async (req, res) => {
    const month = req.params['month'];
    if (!month)
        return res.status(400).json({ message: 'Invalid month format' });
    try {
        const connection = await db.getConnection();
        const priceRanges = [
            { min: 0, max: 100 },
            { min: 101, max: 200 },
            { min: 201, max: 300 },
            { min: 301, max: 400 },
            { min: 401, max: 500 },
            { min: 501, max: 600 },
            { min: 601, max: 700 },
            { min: 701, max: 800 },
            { min: 801, max: 900 },
            { min: 901, max: 10000}
        ];
        const queries = priceRanges.map(item => 
            connection.query(`
                SELECT COUNT(*) AS count
                FROM item_table
                WHERE MONTH(dateOfSale) = ${month}
                AND price >= ${item.min} AND price <= ${item.max}`)
        );
        const results = await Promise.all(queries);
        const data = results.map((result, item) => ({
            range: `${priceRanges[item].min} - ${priceRanges[item].max === 10000 ? "Above" : priceRanges[item].max}`,
            count: result[0][0].count
        }));
        connection.release();
        res.json({ data });
    } catch (error) {
        res.status(500).json({ message: 'Failed to fetch price range data' });
    }
}

export const getPieData = async(req,res)=>{
    const month = req.params['month'];
    if (!month)
        return res.status(400).json({ message: 'Invalid month format' });
    try {
        const connection = await db.getConnection();
        const [pie_chart_data] = await connection.query(`
                SELECT DISTINCT(category),COUNT(*) AS pie_items
                FROM item_table
                WHERE MONTH(dateOfSale) = ${month}
                GROUP BY category`);
        connection.release();
        res.json({data:pie_chart_data})
    } catch (error) {
        res.status(500).json({ message: 'Failed to fetch PIE data' });
    }
}

export const getCombinedData = async(req,res)=>{
    const month = req.params['month'];
    if (!month)
        return res.status(400).json({ message: 'Invalid month format' });
    try {
        const [priceRangesResponse, pieDataResponse, statisticsResponse] = await Promise.all([
            axios.get(`${process.env.PRICE_RANGES_URL}/${month}`),
            axios.get(`${process.env.PIE_DATA_URL}/${month}`),
            axios.get(`${process.env.STATISTICS_URL}/${month}`)
        ]);
        const combinedData = [{
            priceRanges: priceRangesResponse.data.data,
            pieData: pieDataResponse.data.data,
            statistics: statisticsResponse.data
        }];
        res.json(combinedData);
    } catch (error) {
        res.status(500).json({ message: 'Failed to fetch combined data' });
    }
}

export const getSearchData = async(req,res)=>{
    const {month=3,search="",pageNo=1,perPage=10} = req.query;
    const searchText = search.trim().toLowerCase();
    const offset = parseInt((pageNo-1)*perPage);
    try {
        const connection = await db.getConnection();
        const [query] = await connection.query(`
                SELECT * FROM item_table
                WHERE (LOWER(title) LIKE "%${searchText}%" OR price LIKE "%${searchText}%" OR LOWER(description) LIKE "%${searchText}%") AND MONTH(dateOfSale) = ${month} 
                LIMIT ${parseInt(perPage)} OFFSET ${offset}
            `);
        connection.release();
        res.json(query);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch search data' });
    }
}