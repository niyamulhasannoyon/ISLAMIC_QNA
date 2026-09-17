import json
import os
import sqlite3
from typing import Set, Dict, Any

DEFAULT_STATE_FILE = os.path.join(os.path.dirname(__file__), "scraper_state.json")
DEFAULT_DB_FILE = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data", "fatwas.db")

class StateManager:
    """
    Manages local scraper state to track previously indexed posts.
    Enables early termination of pagination as soon as known posts are reached.
    Automatically synchronizes with SQLite fatwas.db to guarantee zero duplicates.
    """
    def __init__(self, state_file: str = DEFAULT_STATE_FILE, db_file: str = DEFAULT_DB_FILE):
        self.state_file = state_file
        self.db_file = db_file
        self.known_hashes: Set[str] = set()
        self.metadata: Dict[str, Any] = {}
        self.load()

    def load(self) -> None:
        if os.path.exists(self.state_file):
            try:
                with open(self.state_file, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    self.known_hashes = set(h.lower() for h in data.get("known_hashes", []))
                    self.metadata = data.get("metadata", {})
            except Exception as e:
                print(f"[StateManager] Warning: Failed to load state file ({e}). Starting fresh.")
                self.known_hashes = set()
                self.metadata = {}
        else:
            self.known_hashes = set()
            self.metadata = {}

        # Also load hashes from SQLite fatwas.db if available
        if os.path.exists(self.db_file):
            try:
                conn = sqlite3.connect(self.db_file)
                cursor = conn.cursor()
                cursor.execute("SELECT sha256_hash FROM fatwas WHERE sha256_hash IS NOT NULL AND sha256_hash != ''")
                db_hashes = cursor.fetchall()
                for (h,) in db_hashes:
                    if h:
                        self.known_hashes.add(h.lower().strip())
                conn.close()
            except Exception as e:
                print(f"[StateManager] Warning: Could not read hashes from {self.db_file}: {e}")

    def save(self) -> None:
        try:
            data = {
                "known_hashes": list(self.known_hashes),
                "metadata": self.metadata,
                "total_known": len(self.known_hashes)
            }
            with open(self.state_file, "w", encoding="utf-8") as f:
                json.dump(data, f, ensure_ascii=False, indent=2)
        except Exception as e:
            print(f"[StateManager] Error: Failed to save state file: {e}")

    def is_known(self, content_hash: str) -> bool:
        return content_hash.lower() in self.known_hashes

    def record_hash(self, content_hash: str) -> None:
        self.known_hashes.add(content_hash.lower())

    def record_hashes(self, hashes: list[str]) -> None:
        for h in hashes:
            self.known_hashes.add(h.lower())
