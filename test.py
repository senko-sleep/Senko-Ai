import requests
import json

response = requests.get(
  url="https://openrouter.ai/api/v1/auth/key",
  headers={
    "Authorization": f"Bearer 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"
  }
)

print(json.dumps(response.json(), indent=2))
