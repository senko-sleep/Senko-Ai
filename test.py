import os
os.environ['TF_ENABLE_ONEDNN_OPTS'] = '0'  # Disable oneDNN optimizations for better CPU compatibility

import torch
from transformers import AutoTokenizer
from optimum.onnxruntime import ORTModelForSeq2SeqLM

model_id = "google/flan-t5-small"
tokenizer = AutoTokenizer.from_pretrained(model_id)

# Load and export the model to ONNX if not already done
model = ORTModelForSeq2SeqLM.from_pretrained(model_id, export=True)

# Inference input
input_text = "Summarize: The food was delicious and the service was excellent."
inputs = tokenizer(input_text, return_tensors="pt")

# Inference on CPU
with torch.no_grad():
    outputs = model.generate(**inputs)

# Decode and print output
print(tokenizer.decode(outputs[0], skip_special_tokens=True))
