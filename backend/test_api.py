import requests

url = "http://localhost:8000/api/foodwalk/plan-route-osm/"
data = {
    "start": "Indiranagar, Bangalore",
    "end": "Whitefield, Bangalore"
}

try:
    response = requests.post(url, json=data)
    print(f"Status code: {response.status_code}")
    try:
        # Try to parse JSON response
        print("Response JSON:")
        print(response.json())
    except ValueError:
        # Response is not JSON, print raw text
        print("Response text:")
        print(response.text)
except requests.exceptions.RequestException as e:
    print(f"Request failed: {e}")
