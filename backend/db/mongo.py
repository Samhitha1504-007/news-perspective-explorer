import os

from dotenv import load_dotenv
from pymongo import MongoClient

load_dotenv()

_client = MongoClient(os.getenv("MONGO_URI", "mongodb://localhost:27017"))
mongo_db = _client[os.getenv("MONGO_DATABASE", "news_perspective_db")]
