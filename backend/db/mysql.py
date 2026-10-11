import os

import pymysql
from dotenv import load_dotenv

load_dotenv()


def get_connection():
    """New MySQL connection; rows come back as dicts keyed by column name."""
    return pymysql.connect(
        host=os.getenv("MYSQL_HOST", "localhost"),
        port=int(os.getenv("MYSQL_PORT", "3306")),
        user=os.getenv("MYSQL_USER"),
        password=os.getenv("MYSQL_PASSWORD"),
        database=os.getenv("MYSQL_DATABASE", "news_perspective_db"),
        cursorclass=pymysql.cursors.DictCursor,
    )
