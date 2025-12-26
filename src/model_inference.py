

"""
Model inference helper for the PPO trading agent.

Usage:
    from src.model_inference import get_action_from_model

    obs = [...]  # list/array of floats, length = window + 1
    action = get_action_from_model(obs)
"""

from pathlib import Path
from typing import List, Union

import numpy as np
from stable_baselines3 import PPO
DEFAULT_MODEL_PATH = Path("models/best_model.zip")


class TradingAgent:
    """
    Simple wrapper around the trained PPO model.
    Loads the model once and exposes a .decide(obs) method.
    """

    def __init__(self, model_path: Union[str, Path] = DEFAULT_MODEL_PATH):
        model_path = Path(model_path)
        if not model_path.exists():
            raise FileNotFoundError(
                f"Could not find model file at {model_path.resolve()}.\n"
                f"Make sure you have trained a PPO model and saved it there."
            )
        self.model = PPO.load(str(model_path))
        self.obs_dim = None  # we can set this after first call if you want

    def decide(self, obs: Union[List[float], np.ndarray]) -> int:
        """
        Given a single observation vector, return an action:
            0 = hold
            1 = buy (go long)
            2 = sell (go to cash)

        obs should be a 1D list/array of floats with length = window + 1.
        """
        obs_arr = np.array(obs, dtype=np.float32).reshape(1, -1)
        if self.obs_dim is None:
            self.obs_dim = obs_arr.shape[1]
        action, _ = self.model.predict(obs_arr, deterministic=True)
        return int(action[0])
_agent_instance: TradingAgent | None = None


def get_agent(model_path: Union[str, Path] = DEFAULT_MODEL_PATH) -> TradingAgent:
    """
    Lazy-load and cache the TradingAgent so we don't reload the model every time.
    """
    global _agent_instance
    if _agent_instance is None:
        _agent_instance = TradingAgent(model_path=model_path)
    return _agent_instance


def get_action_from_model(
    obs: Union[List[float], np.ndarray],
    model_path: Union[str, Path] = DEFAULT_MODEL_PATH,
) -> int:
    """
    Convenience function: directly get an action from the trained PPO model.

    Example:
        obs = [0.01, -0.005, 0.002, ..., 0]  # last element could be position flag
        action = get_action_from_model(obs)
    """
    agent = get_agent(model_path=model_path)
    return agent.decide(obs)
