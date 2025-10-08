import os
import json
import asyncio
from typing import AsyncGenerator

from fastapi import FastAPI, Request
from fastapi.responses import StreamingResponse
from openai import AsyncOpenAI
from dotenv import load_dotenv
from fastapi.staticfiles import StaticFiles


load_dotenv()

CHIA_KHOA_VANG = "CHIA_KHOA_VANG#Store locally"
VECTOR_STORE_ID = "VECTOR_STORE_ID#Store locally"

client = AsyncOpenAI(api_key=CHIA_KHOA_VANG)
app = FastAPI()


# Simple in-memory session → conversation mapping
sessions = {}

async def stream_chat(user_message: str, session_id: str) -> AsyncGenerator[str, None]:
    # Reuse conversation id if exists
    conversation_id = sessions.get(session_id)
    # print("conversation_id:", conversation_id)
    # Create streaming request
    async with client.responses.stream(
        model="gpt-4o-mini",
        conversation=conversation_id,
        input=[
            {
                "role": "system",
                "content": "Answer ONLY using content retrieved via file_search. If nothing is found, search on papabanhbao.com. Do not include any 'Source:' or citations in your output."
            },
            {
                "role": "user",
                "content": user_message
            },
        ],
        tools=[{
            "type": "file_search",
            "vector_store_ids": ["vs_68bf40c6d4448191892c7ef2e74d9f2c"],
        }],
    ) as stream:
        async for event in stream:
            # Capture conversation id for next turn
            # if event.type == "response.created":
                # print(event.response)
                # cid = event.response.conversation.id
                # sessions[session_id] = cid

            if event.type == "response.output_text.delta":
                yield f"data: {json.dumps({'type':'delta','data':event.delta})}\n\n"

            if event.type == "response.citations.added":
                yield f"data: {json.dumps({'type':'citations','data':event.citations})}\n\n"

            if event.type == "response.error":
                yield f"data: {json.dumps({'type':'error','data':event.error})}\n\n"

            if event.type == "response.completed":
                yield f"data: {json.dumps({'type':'done'})}\n\n"

        await stream.close()

@app.post("/api/chat/stream")
async def chat_endpoint(req: Request):
    body = await req.json()
    user_message = body.get("userMessage")
    session_id = body.get("sessionId")

    if not user_message or not session_id:
        return {"error": "Missing userMessage or sessionId"}
    if not VECTOR_STORE_ID:
        return {"error": "Missing OPENAI_VECTOR_STORE_ID"}

    return StreamingResponse(
        stream_chat(user_message, session_id),
        media_type="text/event-stream",
    )

app.mount("/", StaticFiles(directory="public", html=True), name="public")