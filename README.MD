2 steps to make chatbot work

1) Run xlss_to_md_v2.py to convert xlsx to md
2) Deploy server on localhost
    source .venv/bin/activate
    uvicorn server:app --host 0.0.0.0 --port 8000