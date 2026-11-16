import os
import time
import requests

def ping_url(url, max_retries, delay):
    retries = 0

    while retries < max_retries:
        try:
            response = requests.get(url)
            if response.status_code == 200:
                return True
        except requests.ConnectionError:
            retries += 1
            time.sleep(delay)
        except requests.exceptions.MissingSchema:
            return False
    return False

def run(): 
    url = os.getenv("INPUT_URL")
    max_retries = int(os.getenv("INPUT_MAX_RETRIES", "10"))
    delay = int(os.getenv("INPUT_DELAY", "5"))

    website_reachable = ping_url(url, max_retries, delay)

    if not website_reachable:
        print(f"Failed to reach URL: {url}")
    else:
        print(f"Successfully reached URL: {url}")

if __name__ == "__main__":
    run()