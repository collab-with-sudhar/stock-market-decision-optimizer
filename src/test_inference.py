# src/test_inference.py

"""
Quick sanity check for model_inference module.

Run from project root as:
    python -m src.test_inference
"""

from src.model_inference import get_action_from_model

def main():
    # TODO: replace this with a *real* observation later.
    # For now, we just create a dummy vector of the right length.
    #
    # Your TradingEnvImproved uses: observation shape = (window + 1,)
    # In training, default window in train_ppo.py is 20, so obs_dim = 21.
    # We'll use 21 zeros as a placeholder.
    dummy_obs = [0.0] * 21

    action = get_action_from_model(dummy_obs)
    print(f"Model returned action: {action} (0=hold, 1=buy, 2=sell)")

if __name__ == "__main__":
    main()
