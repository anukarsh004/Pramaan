import asyncio
import sys
from pathlib import Path

_backend_dir = str(Path(__file__).resolve().parent.parent)
if _backend_dir not in sys.path:
    sys.path.insert(0, _backend_dir)

from src.repositories.database import Database
from src.seed import seed_if_empty

async def main():
    db = Database("sqlite+aiosqlite:///pramaan_dev.db")
    await db.initialize()
    async with db.sessions() as session:
        async with session.begin():
            await seed_if_empty(session)
    await db.close()

if __name__ == "__main__":
    asyncio.run(main())
