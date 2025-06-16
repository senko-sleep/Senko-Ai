import requests
import json

class AnimeAIChatModel:
    def __init__(self, prompt, hf_token):
        self.model_id = "mistralai/Mistral-7B-Instruct-v0.1"  # Use a public model ID
        self.hf_api_url = f"https://api-inference.huggingface.co/models/{self.model_id}"
        self.prompt = prompt
        self.hf_token = hf_token

    def _use_hf_api(self):
        headers = {"Authorization": f"Bearer {self.hf_token}"}
        payload = {
            "inputs": f"<s>[INST] {self.prompt} [/INST]</s>"
        }
        res = requests.post(self.hf_api_url, headers=headers, json=payload)
        if res.status_code == 200:
            return res.json()
        else:
            raise RuntimeError(f"HF API error: {res.status_code} - {res.text}")

    def chat(self):
        return self._use_hf_api()

if __name__ == "__main__":
    prompt = "Write a haiku about anime fox girls"
    hf_token = "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"  # Your HF token
    model = AnimeAIChatModel(prompt, hf_token)
    output = model.chat()
    print(json.dumps(output, indent=2))
