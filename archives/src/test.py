import requests

closes = [1995.0, 1998.5, 2001.0, 1999.0, 2003.0]  # just example
payload = {
    "closes": closes,
    "position": 0
}

r = requests.post("http://127.0.0.1:8001/predict_from_closes", json=payload)
print(r.status_code, r.json())
