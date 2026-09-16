from dotenv import load_dotenv
load_dotenv()
from database import SessionLocal
from sqlalchemy import text

db = SessionLocal()
try:
    db.execute(text("SELECT 1"))
    print("Database keep-alive ping successful")
finally:
    db.close()
