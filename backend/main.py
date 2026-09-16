import os
import sys
import uuid
import json
import resend
from datetime import datetime, timedelta, timezone
from fastapi import FastAPI, HTTPException, Request, Response, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from groq import APIStatusError
from sqlalchemy.orm import Session
from auth_utils import hash_password, verify_password, create_access_token, get_current_user, generate_reset_token
from crud import create_conversation, add_message, get_conversation, list_conversations, delete_conversation

sys.path.append(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "rag-pipeline"))
from app import handle_student_doubt_with_clarification_stream_async
from dag_cache import ROOT_NODE_ID
from database import init_db, get_db, User

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"   , "https://jeeai-monorepo-roan.vercel.app"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

resend.api_key = os.environ.get("RESEND_API_KEY")


@app.on_event("startup")
def on_startup():
    init_db()


class ChatRequest(BaseModel):
    message: str


class SignupRequest(BaseModel):
    email: str
    password: str


class LoginRequest(BaseModel):
    email: str
    password: str


class ForgotPasswordRequest(BaseModel):
    email: str


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str


class MessageOut(BaseModel):
    id: int
    role: str
    content: str
    created_at: datetime

    class Config:
        from_attributes = True


class ConversationOut(BaseModel):
    id: int
    title: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class ConversationDetailOut(ConversationOut):
    messages: list[MessageOut]


sessions = {}


def get_or_create_session(session_id: str | None):
    if session_id is None or session_id not in sessions:
        session_id = str(uuid.uuid4())
        sessions[session_id] = {
            "chat_history": None,
            "turn_number": 0,
            "pool": None,
            "pending_clarification": None,
            "dag_current_node": ROOT_NODE_ID,
            "conversation_has_gone_vague": False,
            "user_id": None,  # set once a logged-in user sends a message (3.8)
            "conversation_id": None,  # set once persisted to the DB (Step 5)
        }
    return session_id, sessions[session_id]


@app.get("/")
async def root():
    return {"message": "hello"}


@app.post("/auth/signup")
async def signup(request: SignupRequest, db: Session = Depends(get_db)):
    existing_user = db.query(User).filter(User.email == request.email).first()
    if existing_user:
        raise HTTPException(status_code=409, detail="Email already registered")

    new_user = User(
        email=request.email,
        hashed_password=hash_password(request.password),
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    return {"id": new_user.id, "email": new_user.email}


@app.post("/auth/login")
async def login(request: LoginRequest, res: Response, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == request.email).first()
    if not user or not verify_password(request.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    token = create_access_token(user_id=user.id, email=user.email)

    res.set_cookie(
        key="access_token",
        value=token,
        httponly=True,
        samesite="none", secure=True,
        max_age=60 * 60 * 24,  # 24 hours
    )

    return {"id": user.id, "email": user.email}


@app.get("/auth/me")
async def get_me(current_user: dict | None = Depends(get_current_user)):
    if current_user is None:
        return {"logged_in": False}
    return {"logged_in": True, "user": current_user}


@app.post("/auth/logout")
async def logout(res: Response):
    res.delete_cookie(key="access_token")
    return {"message": "Logged out successfully"}


@app.post("/auth/forgot-password")
async def forgot_password(request: ForgotPasswordRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == request.email).first()

    # Always return the same generic response, whether or not the email
    # exists — this prevents someone from using this endpoint to discover
    # which emails are registered in the system.
    generic_response = {
        "message": "If that email is registered, a reset link has been sent."
    }

    if not user:
        return generic_response

    token = generate_reset_token()
    user.reset_token = token
    user.reset_token_expires = datetime.now(timezone.utc) + timedelta(minutes=30)
    db.commit()

    reset_link = f"http://localhost:5173/reset-password?token={token}"

    try:
        resend.Emails.send({
            "from": "onboarding@resend.dev",
            "to": user.email,
            "subject": "Reset your JEEAI password",
            "html": f"""
                <p>Someone requested a password reset for your JEEAI account.</p>
                <p><a href="{reset_link}">Click here to reset your password</a></p>
                <p>This link expires in 30 minutes. If you didn't request this, you can ignore this email.</p>
            """,
        })
    except Exception as e:
        print(f"[ERROR] Failed to send reset email: {e}")
        # Note: we still return the generic success response even if email
        # sending fails, to avoid leaking whether the email exists via
        # error-response timing/content differences.

    return generic_response


@app.post("/auth/reset-password")
async def reset_password(request: ResetPasswordRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.reset_token == request.token).first()

    if not user:
        raise HTTPException(status_code=400, detail="Invalid or expired reset link")

    # Compare against timezone-aware "now" since reset_token_expires was
    # stored as UTC-aware in /auth/forgot-password.
    expires_at = user.reset_token_expires
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)

    if expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="Invalid or expired reset link")

    user.hashed_password = hash_password(request.new_password)
    user.reset_token = None
    user.reset_token_expires = None
    db.commit()

    return {"message": "Password has been reset successfully. You can now log in."}


@app.post("/chat")
async def chat(request: ChatRequest, req: Request, res: Response,
               current_user: dict | None = Depends(get_current_user),
               db: Session = Depends(get_db)):
    session_id = req.cookies.get("session_id")
    session_id, state = get_or_create_session(session_id)

    # Tag this session with the logged-in user's identity, if any, and
    # persist their message to a real Conversation/Message row (Step 5).
    if current_user:
        state["user_id"] = current_user["id"]

        # First message of this session for a logged-in user -> create a
        # real Conversation row. Every message after that just appends to it.
        if state.get("conversation_id") is None:
            conversation = create_conversation(
                db, user_id=current_user["id"], first_message=request.message
            )
            state["conversation_id"] = conversation.id

        add_message(
            db,
            conversation_id=state["conversation_id"],
            role="user",
            content=request.message,
        )

    async def event_generator():
        full_response_text = ""
        try:
            final_result = None
            async for piece in handle_student_doubt_with_clarification_stream_async(
                request.message,
                state["chat_history"],
                state["turn_number"],
                state["pool"],
                state["pending_clarification"],
                state["dag_current_node"],
                state["conversation_has_gone_vague"],
            ):
                if piece["type"] == "delta":
                    full_response_text += piece["text"]
                    # SSE format: each event is "data: <payload>\n\n"
                    yield f"data: {json.dumps({'text': piece['text']})}\n\n"
                else:
                    final_result = piece["result"]

            # Persist this session's updated state now that streaming is done.
            # user_id and conversation_id are preserved from `state` here
            # (not from final_result, since the RAG pipeline knows nothing
            # about user accounts) — otherwise this reassignment would
            # silently drop the tags we set above.
            sessions[session_id] = {
                "chat_history": final_result["chat_history"],
                "turn_number": final_result["turn_number"],
                "pool": final_result["retrieved_chunks_pool"],
                "pending_clarification": final_result["pending_clarification"],
                "dag_current_node": final_result["dag_current_node"],
                "conversation_has_gone_vague": final_result["conversation_has_gone_vague"],
                "user_id": state.get("user_id"),
                "conversation_id": state.get("conversation_id"),
            }

            # Save the assistant's full reply now that streaming is done.
            if current_user and state.get("conversation_id"):
                add_message(
                    db,
                    conversation_id=state["conversation_id"],
                    role="assistant",
                    content=full_response_text,
                    extra_data={"dag_node": final_result.get("dag_current_node")},
                )

            print(f"[SESSION DEBUG] session_id={session_id[:8]}... chat_history now has {len(sessions[session_id]['chat_history'])} messages, user_id={sessions[session_id]['user_id']}")

            # Signal the frontend that streaming is complete
            yield f"data: {json.dumps({'done': True})}\n\n"

        except APIStatusError as e:
            print(f"[ERROR] Groq APIStatusError: status={e.status_code}, message={e}")
            status = getattr(e, "status_code", None)
            if status in (429, 413):
                detail = "The AI is handling a lot of requests right now (rate limit reached). Please wait a minute and try again."
            else:
                detail = "The AI service returned an unexpected error. Please try again."
            yield f"data: {json.dumps({'error': detail})}\n\n"
        except Exception as e:
            print(f"[ERROR] Unexpected exception: {type(e).__name__}: {e}")
            yield f"data: {json.dumps({'error': 'Something went wrong while generating a response. Please try again.'})}\n\n"

    response = StreamingResponse(event_generator(), media_type="text/event-stream")
    response.set_cookie(key="session_id", value=session_id, httponly=True, samesite="none", secure=True)
    return response


@app.post("/new-chat")
async def new_chat(req: Request, res: Response):
    """Resets this browser's session too (not just the visible message list),
    starting at the DAG root again."""
    session_id = req.cookies.get("session_id")
    if session_id and session_id in sessions:
        del sessions[session_id]

    new_id = str(uuid.uuid4())
    sessions[new_id] = {
        "chat_history": None,
        "turn_number": 0,
        "pool": None,
        "pending_clarification": None,
        "dag_current_node": ROOT_NODE_ID,
        "conversation_has_gone_vague": False,
        "user_id": None,
        "conversation_id": None,
    }
    res.set_cookie(key="session_id", value=new_id, httponly=True, samesite="none", secure=True)
    return {"status": "reset"}


@app.get("/conversations", response_model=list[ConversationOut])
async def get_conversations(current_user: dict | None = Depends(get_current_user),
                             db: Session = Depends(get_db)):
    if current_user is None:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return list_conversations(db, user_id=current_user["id"])


@app.get("/conversations/{conversation_id}", response_model=ConversationDetailOut)
async def get_conversation_detail(conversation_id: int,
                                   current_user: dict | None = Depends(get_current_user),
                                   db: Session = Depends(get_db)):
    if current_user is None:
        raise HTTPException(status_code=401, detail="Not authenticated")
    conversation = get_conversation(db, conversation_id=conversation_id, user_id=current_user["id"])
    if conversation is None:
        raise HTTPException(status_code=404, detail="Conversation not found")
    return conversation


@app.delete("/conversations/{conversation_id}")
async def delete_conversation_route(conversation_id: int,
                                     current_user: dict | None = Depends(get_current_user),
                                     db: Session = Depends(get_db)):
    if current_user is None:
        raise HTTPException(status_code=401, detail="Not authenticated")
    deleted = delete_conversation(db, conversation_id=conversation_id, user_id=current_user["id"])
    if not deleted:
        raise HTTPException(status_code=404, detail="Conversation not found")
    return {"status": "deleted"}
