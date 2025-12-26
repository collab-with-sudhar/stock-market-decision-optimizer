import datetime
import json
import os
import logging
from logzero import logger
MARKET_START_TIME = datetime.time(9, 15)
MARKET_END_TIME = datetime.time(15, 30)

def load_holidays():
    """
    Loads NSE holidays from data/nse_holidays.json.
    Returns a set of datetime.date objects.
    """
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    json_path = os.path.join(base_dir, "data", "nse_holidays.json")
    
    holidays = set()
    try:
        if os.path.exists(json_path):
            with open(json_path, 'r') as f:
                data = json.load(f)
                for d_str in data:
                    try:
                        dt = datetime.datetime.strptime(d_str, "%Y-%m-%d").date()
                        holidays.add(dt)
                    except ValueError:
                        pass
            logger.info(f"Loaded {len(holidays)} holidays from {json_path}")
        else:
            logger.warning(f"Holiday file not found at {json_path}. Market open check might be inaccurate for holidays.")
    except Exception as e:
        logger.error(f"Error loading holidays: {e}")
        
    return holidays
NSE_HOLIDAYS = load_holidays()

def is_market_open(dt: datetime.datetime = None) -> bool:
    """
    Checks if the Indian Stock Market (NSE) is currently open.
    
    Args:
        dt (datetime.datetime, optional): The datetime to check. Defaults to now (local time).
        
    Returns:
        bool: True if market is open, False otherwise.
    """
    if dt is None:
        dt = datetime.datetime.now()
    if dt.weekday() >= 5:
        return False
    if dt.date() in NSE_HOLIDAYS:
        return False
    current_time = dt.time()
    if current_time < MARKET_START_TIME or current_time > MARKET_END_TIME:
        return False

    return True
