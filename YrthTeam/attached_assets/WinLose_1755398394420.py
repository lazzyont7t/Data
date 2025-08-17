import requests
import json

# Request parameters
url = 'https://mzplayapi.com/api/webapi/GetNoaverageEmerdList'
payload = {
    "language": 0,
    "pageNo": 1,
    "pageSize": 10,
    "random": "6fd9424da2324e1c9b99a95bd12667e4",
    "signature": "AD7C0039FDE82066E93AAB6EFBED6D8B",
    "timestamp": 1755396530,
    "typeId": 1
}

headers = {
    "Content-Type": "application/json"
}

def fetch_data(url, payload):
    try:
        response = requests.post(url, json=payload, headers=headers)
        response.raise_for_status()
        return response.json()
    except requests.RequestException as e:
        return {'error': f'Error fetching data: {e}'}
    except ValueError as e:
        return {'error': f'Error parsing JSON: {e}'}

# Fetch data
data = fetch_data(url, payload)

if data and 'data' in data and 'list' in data['data']:
    issues = data['data']['list']

    if issues:
        # Only take the first number
        first_number = int(issues[0].get('number', 0))
        result = {
            'number': first_number
        }
        print(json.dumps(result, indent=4))
    else:
        print(json.dumps({'error': 'No issues available.'}))
else:
    print(json.dumps({'error': 'No data available.'}))
