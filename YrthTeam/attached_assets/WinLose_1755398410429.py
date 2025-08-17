import requests
import json

def fetch_data(url):
    try:
        response = requests.get(url)
        response.raise_for_status()
        return response.json()
    except requests.RequestException as e:
        print(json.dumps({'error': f'Error fetching data: {e}'}))
        return None
    except ValueError as e:
        print(json.dumps({'error': f'Error parsing JSON: {e}'}))
        return None

# URL to fetch
url = 'https://draw.ar-lottery01.com/WinGo/WinGo_1M/GetHistoryIssuePage.json?ts=1742827620042'

data = fetch_data(url)

if data and 'data' in data and 'list' in data['data']:
    issues = data['data']['list']
    
    if issues:
        first_number = int(issues[0].get('number', 0))  # get only the first number
        result = {
            'number': first_number
        }
        print(json.dumps(result, indent=4))
    else:
        print(json.dumps({'error': 'No issues available.'}))
else:
    print(json.dumps({'error': 'No data available.'}))
