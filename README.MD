steps to make chatbot work

1) Run xlss_to_md_v2.py to convert xlsx to md
2) Deploy server on localhost
    source .venv/bin/activate
    uvicorn server:app --host 0.0.0.0 --port 8000
3) Deploy server on cloud
   ssh -i ./kevin-instance/ssh-key-2025-09-05.key opc@192.9.142.46<br>
   3.1) stop current server
        ps -ef | grep uvicorn
        kill -9 <pid> <br>
   3.2) run following cmd <br>
        sudo rm -rf /opt/ai4banhbao/.venv
        python3 -m venv .venv
        source .venv/bin/activate
        pip install --upgrade pip
        pip install fastapi uvicorn "openai>=1.100.0" python-dotenv
        deactivate
        sudo nohup .venv/bin/uvicorn server:app --host 0.0.0.0 --port 8787 >/var/log/rag.out 2>&1 & <br>
   3.3) Confirm following:
      [opc@instance-20250905-2131 ai4banhbao]$ cat /var/log/rag.out
      nohup: ignoring input
      INFO:     Started server process [2763526]
      INFO:     Waiting for application startup.
      INFO:     Application startup complete.
      INFO:     Uvicorn running on http://0.0.0.0:8787 (Press CTRL+C to quit)

OCI information:
tenant name: kevintamle2020
username: kevin.tamle2020@gmail.com
pass: DollarInfMuoi