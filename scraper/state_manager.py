import json
import os
from typing import Set, Dict, Any

DEFAULT_STATE_FILE = os.path.join(os.path.dirname(__file__), "scraper_state.json")

class StateManager:
    """
    Manages local scraper state to track previously indexed posts.
    Enables early termination of pagination as soon as known posts are reached.
    """
    def __init__(self, state_file: str = DEFAULT_STATE_FILE):
        self.state_file = state_file
        self.known_hashes: Set[str] = set()
        self.metadata: Dict[str, Any] = {}
        self.load()

    def load(self) -> None:
        if os.path.exists(self.state_file):
            try:
                with open(self.state_file, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    self.known_hashes = set(data.get("known_hashes", []))
                    self.metadata = data.get("metadata", {})
            except Exception as e:
                print(f"[StateManager] Warning: Failed to load state file ({e}). Starting fresh.")
                self.known_hashes = set()
                self.metadata = {}
        else:
            self.known_hashes = set()
            self.metadata = {}

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
