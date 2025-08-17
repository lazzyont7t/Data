import requests
import json

def fetch_data(url):
    try:
        response = requests.get(url)
        response.raise_for_status()
        return response.json()
    except requests.RequestException as e:
        return {'error': f'Error fetching data: {e}'}
    except ValueError as e:
        return {'error': f'Error parsing JSON: {e}'}

# URL to fetch
url = 'https://draw.ar-lottery01.com/WinGo/WinGo_30S/GetHistoryIssuePage.json?ts=1742827620042'

data = fetch_data(url)

if data and 'data' in data and 'list' in data['data']:
    issues = data['data']['list']

    # Get highest issueNumber and increment by 1
    highest_issue = max(issues, key=lambda x: int(x['issueNumber']))
    next_issue_number = str(int(highest_issue['issueNumber']) + 1)

    # Combine all numbers into a single string
    all_numbers_str = ''.join(str(item.get('number', 0)) for item in issues)

    # --- Logic (count from back to front, exact) ---
    first_num = int(all_numbers_str[0])
    length = len(all_numbers_str)
    pos_index = length - first_num  # count from back to front

    digit_at_place = int(all_numbers_str[pos_index])

    # Pick the next digit toward the front (to the left in string)
    if pos_index - 1 >= 0:
        next_digit = int(all_numbers_str[pos_index - 1])
    else:
        next_digit = 0  # if no digit to the left, use 0

    last_digit = int(all_numbers_str[-1])
    total = (digit_at_place + next_digit) * last_digit

    # Reduce to single digit
    while total > 9:
        total = sum(int(d) for d in str(total))
    result_digit = total
    size = "Small" if result_digit <= 4 else "Big"

    # Final result
    result = {
        'next_issue_number': next_issue_number,
        'all_numbers': int(all_numbers_str),
        'computed_result': f"{result_digit} {size}"
    }

    print(json.dumps(result, indent=4))
else:
    print(json.dumps({'error': 'No data available.'}))
