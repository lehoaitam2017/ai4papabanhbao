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

CHIA_KHOA_VANG = "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"
VECTOR_STORE_ID = "vs_68bf40c6d4448191892c7ef2e74d9f2c"

client = AsyncOpenAI(api_key=CHIA_KHOA_VANG)
app = FastAPI()


# Simple in-memory session → conversation mapping
sessions = {}

async def stream_chat(user_message: str, session_id: str) -> AsyncGenerator[str, None]:
    if len(user_message.strip()) <= 2 and " " not in user_message.strip():
        yield f"data: {json.dumps({'type':'delta','data':'🙂'})}\n\n"
        yield f"data: {json.dumps({'type':'done'})}\n\n"
        return
    # Reuse conversation id if exists
    conversation_id = sessions.get(session_id)
    # print("conversation_id:", conversation_id)
    # Create streaming request
    async with client.responses.stream(
        model="gpt-4o-mini",
        conversation=conversation_id,
        input = [
            {
                "role": "system",
                "content": (
                        "Answer ONLY using content retrieved via file_search. "
                        "Do not include any 'Source:' or citations in your output. "
                        "Speak directly to the customer in a friendly, natural, and caring tone — "
                        "like a helpful shop owner or service representative. "
                        "Avoid explaining internal processes or giving instructions to staff. "
                        "Focus on making the customer feel valued and appreciated. "
                        "If information is missing, respond warmly and offer reassurance or alternatives."
                        "Respond in the same language as the user's question — if the user writes in Vietnamese, reply in Vietnamese."
                )
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