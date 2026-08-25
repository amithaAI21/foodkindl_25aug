import requests

r = requests.get(
    "https://photon.komoot.io/api",
    params={
        "q": "Krish",
        "limit": 10,
        "countrycode": "IN",
        "lat": 12.9716,
        "lon": 77.5946,
    },
    timeout=10,
)

print(r.status_code)
print(r.url)
print(r.text[:500])