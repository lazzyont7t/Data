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

    # Combine all numbers into a single string
    all_numbers_str = ''.join(str(item.get('number', 0)) for item in issues)

    # --- Logic (count from back to front) ---
    first_num = int(all_numbers_str[0])
    length = len(all_numbers_str)
    pos_index = length - first_num  # count from back

    digit_at_place = int(all_numbers_str[pos_index])

    # Pick the next digit toward the front (left)
    next_digit = int(all_numbers_str[pos_index - 1]) if pos_index - 1 >= 0 else 0

    last_digit = int(all_numbers_str[-1])
    total = (digit_at_place + next_digit) * last_digit

    # Reduce to single digit
    while total > 9:
        total = sum(int(d) for d in str(total))
    result_digit = total
    size = "Small" if result_digit <= 4 else "Big"

    # Get highest issueNumber and increment by 1
    highest_issue = max(issues, key=lambda x: int(x['issueNumber']))
    next_issue_number = str(int(highest_issue['issueNumber']) + 1)

    # Final result
    result = {
        'next_issue_number': next_issue_number,
        'all_numbers': int(all_numbers_str),
        'computed_result': f"{result_digit} {size}"
    }

    print(json.dumps(result, indent=4))
else:
    print(json.dumps({'error': 'No data available.'}))
