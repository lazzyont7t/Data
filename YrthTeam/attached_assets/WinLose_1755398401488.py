import requests
import json

# Request parameters
url = 'https://mzplayapi.com/api/webapi/GetNoaverageEmerdList'
payload = {
    "language": 0,
    "pageNo": 1,
    "pageSize": 10,
    "random": "b531c9663eb445fc8890087257e7c798",
    "signature": "E90B380936F346852B77D5AF47FB9BF3",
    "timestamp": 1755396335,
    "typeId": 30
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
