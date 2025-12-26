

"""
Quick sanity check for model_inference module.

Run from project root as:
    python -m src.test_inference
"""

from src.model_inference import get_action_from_model

def main():
    dummy_obs = [0.0] * 21

    action = get_action_from_model(dummy_obs)
    print(f"Model returned action: {action} (0=hold, 1=buy, 2=sell)")

if __name__ == "__main__":
    main()
