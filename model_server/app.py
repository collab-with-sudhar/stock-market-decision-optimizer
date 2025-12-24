# model_server/app.py

"""
FastAPI application exposing the RL trading model for inference.

Endpoints:
    GET  /health      -> simple health check
    GET  /model-info  -> returns metadata about model server
    POST /predict     -> given an observation, return an action
"""

from functools import lru_cache
from pathlib import Path
from typing import List, Optional

import time
import numpy as np  # Added for normalization
from fastapi import FastAPI, HTTPException, Depends
from pydantic import BaseModel, Field
from pydantic_settings import BaseSettings

from src.model_inference import get_action_from_model, get_agent


# ---------- Settings / configuration ----------

class Settings(BaseSettings):
    """
    Configuration for the model server.
    Can be overridden with environment variables.

    Example:
        MODEL_PATH=models/best_model.zip
        EXPECTED_OBS_LEN=21
    """
    model_path: str = "models/best_model.zip"
    expected_obs_len: Optional[int] = 21  # set to None to skip length check
    env_name: str = "production"          # or "dev", just for info

    class Config:
        env_prefix = ""  # no prefix, use names directly
        env_file = ".env"  # optional .env file


@lru_cache
def get_settings() -> Settings:
    # cached so it's only created once
    return Settings()


# ---------- FastAPI app ----------

app = FastAPI(
    title="Stock RL Model Server",
    description="FastAPI service that exposes the PPO trading agent for inference.",
    version="1.1.0",
)


# ---------- Pydantic models ----------

class PredictRequest(BaseModel):
    obs: List[float] = Field(
        ...,
        description="Observation vector for the environment (window+1 features).",
        example=[0.01, -0.005, 0.002],
    )


class PredictResponse(BaseModel):
    action: int = Field(
        ...,
        description="Chosen action: 0=hold, 1=buy, 2=sell",
    )
    latency_ms: float = Field(
        ...,
        description="Inference latency in milliseconds.",
    )


class ModelInfoResponse(BaseModel):
    model_path: str
    env_name: str
    expected_obs_len: Optional[int]


class PredictFromClosesRequest(BaseModel):
    closes: List[float]
    position: int = 0


# ---------- Dependencies ----------

def get_configured_agent(settings: Settings = Depends(get_settings)):
    """
    Dependency that ensures the agent is loaded using the configured model path.
    """
    # This will lazy-load and reuse the agent (from model_inference)
    return get_agent(settings.model_path)


def closes_to_obs(closes: List[float], position: int, expected_len: Optional[int]) -> List[float]:
    if expected_len is None or expected_len < 2:
        raise HTTPException(status_code=400, detail="Model expected_obs_len not configured correctly")
    
    returns_needed = expected_len - 1
    if len(closes) < returns_needed + 1:
        raise HTTPException(status_code=400, detail=f"Need {returns_needed+1} closes, got {len(closes)}")
    
    # Get the exact window of closes needed to compute N returns
    closes_slice = closes[-(returns_needed + 1):]
    rets: List[float] = []
    
    # Compute raw returns
    for prev, curr in zip(closes_slice, closes_slice[1:]):
        if prev == 0:
            raise HTTPException(status_code=400, detail="Zero close encountered when computing returns")
        rets.append((curr - prev) / prev)
    
    # --- Normalization Logic (Matches src/envs/trading_env_improved.py) ---
    # The training environment normalizes returns by dividing by their standard deviation.
    # Without this, raw returns (e.g., 0.001) look like 0.0 to a network expecting values around ~1.0.
    
    rets_arr = np.array(rets[-returns_needed:], dtype=np.float32)
    std = rets_arr.std()
    
    # If std > 0, divide by it; otherwise use 1.0 (flat line case)
    if std > 1e-9:
        rets_arr = rets_arr / std
    
    obs = rets_arr.tolist()
    # ----------------------------------------------------------------------

    obs.append(float(position))
    return obs


# ---------- Routes ----------

@app.get("/health")
def health_check():
    """
    Simple health check endpoint.
    """
    return {"status": "ok"}


@app.get("/model-info", response_model=ModelInfoResponse)
def model_info(settings: Settings = Depends(get_settings)):
    """
    Returns basic metadata about the model server, for debugging/monitoring.
    """
    return ModelInfoResponse(
        model_path=str(Path(settings.model_path).resolve()),
        env_name=settings.env_name,
        expected_obs_len=settings.expected_obs_len,
    )


@app.post("/predict", response_model=PredictResponse)
def predict(
    req: PredictRequest,
    settings: Settings = Depends(get_settings),
    agent=Depends(get_configured_agent),
):
    """
    Given an observation, run the PPO model and return an action.

    Expected:
        req.obs -> list of floats, length = expected_obs_len (e.g. 21)
    """
    try:
        if not req.obs:
            raise HTTPException(
                status_code=400,
                detail="Observation 'obs' cannot be empty.",
            )

        # Validate length if configured
        if settings.expected_obs_len is not None and len(req.obs) != settings.expected_obs_len:
            raise HTTPException(
                status_code=400,
                detail=(
                    f"Invalid obs length: got {len(req.obs)}, "
                    f"expected {settings.expected_obs_len}."
                ),
            )

        start = time.perf_counter()

        # We call the agent directly instead of get_action_from_model to reuse the loaded model
        action = agent.decide(req.obs)

        if action not in (0, 1, 2):
            raise HTTPException(
                status_code=500,
                detail=f"Model returned invalid action: {action}",
            )

        latency_ms = (time.perf_counter() - start) * 1000.0

        # TODO later: structured logging instead of print
        print(f"[predict] action={action} obs_len={len(req.obs)} latency_ms={latency_ms:.3f}")

        return PredictResponse(action=action, latency_ms=latency_ms)

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Prediction failed: {e}",
        ) from e


@app.post("/predict_from_closes", response_model=PredictResponse)
def predict_from_closes(
    req: PredictFromClosesRequest,
    settings: Settings = Depends(get_settings),
    agent=Depends(get_configured_agent),
):
    try:
        # This now includes the normalization logic
        obs = closes_to_obs(req.closes, req.position, settings.expected_obs_len)
        
        # Debug: log observation stats to diagnose decisions
        try:
            closes = req.closes[-(settings.expected_obs_len or 21):]
            if closes:
                # compute returns stats from obs (first 20 values)
                rets = obs[:-1]
                if rets:
                    mean = sum(rets)/len(rets)
                    var = sum((r-mean)**2 for r in rets)/len(rets)
                    std = var ** 0.5
                    print(f"[OBS_STATS] Normalized Inputs -> mean={mean:.3f} std={std:.3f} pos={obs[-1]}")
        except Exception as _:
            pass

        start = time.perf_counter()
        action = agent.decide(obs)
        
        if action not in (0, 1, 2):
            raise HTTPException(status_code=500, detail=f"Model returned invalid action: {action}")
        
        latency_ms = (time.perf_counter() - start) * 1000.0
        print(f"[predict_from_closes] action={action} obs_len={len(obs)} latency_ms={latency_ms:.3f}")
        
        return PredictResponse(action=action, latency_ms=latency_ms)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Prediction (from_closes) failed: {e}") from e