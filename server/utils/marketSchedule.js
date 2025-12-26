import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

export const MARKET_START_TIME = { hour: 9, minute: 15 };
export const MARKET_END_TIME = { hour: 15, minute: 30 };


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


const loadHolidays = () => {
    try {
        
        
        
        const jsonPath = path.join(__dirname, '..', '..', 'data', 'nse_holidays.json');

        if (fs.existsSync(jsonPath)) {
            const content = fs.readFileSync(jsonPath, 'utf-8');
            const data = JSON.parse(content); 
            console.log(`[MarketSchedule] Loaded ${data.length} holidays from ${jsonPath}`);
            return new Set(data);
        } else {
            console.warn(`[MarketSchedule] Holiday file not found at ${jsonPath}`);
            return new Set();
        }
    } catch (error) {
        console.error(`[MarketSchedule] Failed to load holidays: ${error.message}`);
        return new Set();
    }
};

const NSE_HOLIDAYS = loadHolidays();


export const isMarketOpen = (date = new Date()) => {
    
    
    

    
    const parts = new Intl.DateTimeFormat('en-US', {
        timeZone: 'Asia/Kolkata',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        weekday: 'short',
        hour12: false
    }).formatToParts(date);

    const partMap = {};
    parts.forEach(({ type, value }) => { partMap[type] = value; });

    

    const year = parseInt(partMap.year);
    const month = parseInt(partMap.month);
    const day = parseInt(partMap.day);
    const hour = parseInt(partMap.hour); 
    const minute = parseInt(partMap.minute);
    const weekday = partMap.weekday; 

    
    
    if (weekday === 'Sat' || weekday === 'Sun') {
        return false;
    }

    
    
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    if (NSE_HOLIDAYS.has(dateStr)) {
        return false;
    }

    
    const currentMinutes = hour * 60 + minute;
    const startMinutes = MARKET_START_TIME.hour * 60 + MARKET_START_TIME.minute;
    const endMinutes = MARKET_END_TIME.hour * 60 + MARKET_END_TIME.minute;

    if (currentMinutes < startMinutes || currentMinutes > endMinutes) {
        return false;
    }

    return true;
};
