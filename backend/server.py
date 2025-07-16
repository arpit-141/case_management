from fastapi import FastAPI, APIRouter, HTTPException, File, UploadFile, Depends, Query
from fastapi.responses import FileResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime
from enum import Enum
import aiofiles
import json

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI(title="OpenSearch Cases API", version="1.0.0")

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# File upload directory
UPLOAD_DIR = ROOT_DIR / "uploads"
UPLOAD_DIR.mkdir(exist_ok=True)

# Enums
class CaseStatus(str, Enum):
    OPEN = "open"
    IN_PROGRESS = "in_progress"
    CLOSED = "closed"

class CasePriority(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"

class CommentType(str, Enum):
    USER = "user"
    SYSTEM = "system"

# Data Models
class User(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    username: str
    email: str
    full_name: str
    created_at: datetime = Field(default_factory=datetime.utcnow)

class UserCreate(BaseModel):
    username: str
    email: str
    full_name: str

class FileAttachment(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    filename: str
    original_filename: str
    file_size: int
    mime_type: str
    uploaded_by: str
    uploaded_at: datetime = Field(default_factory=datetime.utcnow)

class Comment(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    case_id: str
    author: str
    author_name: str
    content: str
    comment_type: CommentType = CommentType.USER
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: Optional[datetime] = None

class CommentCreate(BaseModel):
    content: str
    author: str
    author_name: str
    comment_type: CommentType = CommentType.USER

class Case(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str
    description: str
    status: CaseStatus = CaseStatus.OPEN
    priority: CasePriority = CasePriority.MEDIUM
    tags: List[str] = []
    assigned_to: Optional[str] = None
    assigned_to_name: Optional[str] = None
    created_by: str
    created_by_name: str
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    closed_at: Optional[datetime] = None
    comments_count: int = 0
    attachments_count: int = 0

class CaseCreate(BaseModel):
    title: str
    description: str
    priority: CasePriority = CasePriority.MEDIUM
    tags: List[str] = []
    assigned_to: Optional[str] = None
    assigned_to_name: Optional[str] = None
    created_by: str
    created_by_name: str

class CaseUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[CaseStatus] = None
    priority: Optional[CasePriority] = None
    tags: Optional[List[str]] = None
    assigned_to: Optional[str] = None
    assigned_to_name: Optional[str] = None

class CaseFilter(BaseModel):
    status: Optional[CaseStatus] = None
    priority: Optional[CasePriority] = None
    assigned_to: Optional[str] = None
    created_by: Optional[str] = None
    tags: Optional[List[str]] = None

# Helper functions
async def get_case_by_id(case_id: str):
    case = await db.cases.find_one({"id": case_id})
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")
    return Case(**case)

async def update_case_counts(case_id: str):
    comments_count = await db.comments.count_documents({"case_id": case_id})
    attachments_count = await db.files.count_documents({"case_id": case_id})
    
    await db.cases.update_one(
        {"id": case_id},
        {"$set": {
            "comments_count": comments_count,
            "attachments_count": attachments_count,
            "updated_at": datetime.utcnow()
        }}
    )

# User Management Routes
@api_router.post("/users", response_model=User)
async def create_user(user: UserCreate):
    # Check if user already exists
    existing_user = await db.users.find_one({"username": user.username})
    if existing_user:
        raise HTTPException(status_code=400, detail="Username already exists")
    
    user_obj = User(**user.dict())
    await db.users.insert_one(user_obj.dict())
    return user_obj

@api_router.get("/users", response_model=List[User])
async def get_users():
    users = await db.users.find().to_list(1000)
    return [User(**user) for user in users]

@api_router.get("/users/{user_id}", response_model=User)
async def get_user(user_id: str):
    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return User(**user)

# Case Management Routes
@api_router.post("/cases", response_model=Case)
async def create_case(case: CaseCreate):
    case_obj = Case(**case.dict())
    await db.cases.insert_one(case_obj.dict())
    
    # Create system comment
    system_comment = Comment(
        case_id=case_obj.id,
        author="system",
        author_name="System",
        content=f"Case created by {case_obj.created_by_name}",
        comment_type=CommentType.SYSTEM
    )
    await db.comments.insert_one(system_comment.dict())
    await update_case_counts(case_obj.id)
    
    return case_obj

@api_router.get("/cases", response_model=List[Case])
async def get_cases(
    status: Optional[CaseStatus] = None,
    priority: Optional[CasePriority] = None,
    assigned_to: Optional[str] = None,
    created_by: Optional[str] = None,
    search: Optional[str] = None,
    limit: int = Query(50, le=100),
    offset: int = Query(0, ge=0)
):
    query = {}
    
    # Apply filters
    if status:
        query["status"] = status
    if priority:
        query["priority"] = priority
    if assigned_to:
        query["assigned_to"] = assigned_to
    if created_by:
        query["created_by"] = created_by
    if search:
        query["$or"] = [
            {"title": {"$regex": search, "$options": "i"}},
            {"description": {"$regex": search, "$options": "i"}},
            {"tags": {"$in": [search]}}
        ]
    
    cases = await db.cases.find(query).sort("created_at", -1).skip(offset).limit(limit).to_list(limit)
    return [Case(**case) for case in cases]

@api_router.get("/cases/{case_id}", response_model=Case)
async def get_case(case_id: str):
    return await get_case_by_id(case_id)

@api_router.put("/cases/{case_id}", response_model=Case)
async def update_case(case_id: str, case_update: CaseUpdate):
    case = await get_case_by_id(case_id)
    
    update_data = case_update.dict(exclude_unset=True)
    if update_data:
        update_data["updated_at"] = datetime.utcnow()
        
        # Handle status change
        if "status" in update_data and update_data["status"] == CaseStatus.CLOSED:
            update_data["closed_at"] = datetime.utcnow()
        
        await db.cases.update_one({"id": case_id}, {"$set": update_data})
        
        # Create system comment for status change
        if "status" in update_data:
            system_comment = Comment(
                case_id=case_id,
                author="system",
                author_name="System",
                content=f"Case status changed to {update_data['status']}",
                comment_type=CommentType.SYSTEM
            )
            await db.comments.insert_one(system_comment.dict())
            await update_case_counts(case_id)
    
    return await get_case_by_id(case_id)

@api_router.delete("/cases/{case_id}")
async def delete_case(case_id: str):
    case = await get_case_by_id(case_id)
    
    # Delete associated comments and files
    await db.comments.delete_many({"case_id": case_id})
    await db.files.delete_many({"case_id": case_id})
    await db.cases.delete_one({"id": case_id})
    
    return {"message": "Case deleted successfully"}

# Comment Management Routes
@api_router.post("/cases/{case_id}/comments", response_model=Comment)
async def create_comment(case_id: str, comment: CommentCreate):
    # Verify case exists
    await get_case_by_id(case_id)
    
    comment_obj = Comment(case_id=case_id, **comment.dict())
    await db.comments.insert_one(comment_obj.dict())
    await update_case_counts(case_id)
    
    return comment_obj

@api_router.get("/cases/{case_id}/comments", response_model=List[Comment])
async def get_case_comments(case_id: str):
    # Verify case exists
    await get_case_by_id(case_id)
    
    comments = await db.comments.find({"case_id": case_id}).sort("created_at", 1).to_list(1000)
    return [Comment(**comment) for comment in comments]

@api_router.put("/comments/{comment_id}", response_model=Comment)
async def update_comment(comment_id: str, content: str):
    comment = await db.comments.find_one({"id": comment_id})
    if not comment:
        raise HTTPException(status_code=404, detail="Comment not found")
    
    await db.comments.update_one(
        {"id": comment_id},
        {"$set": {"content": content, "updated_at": datetime.utcnow()}}
    )
    
    updated_comment = await db.comments.find_one({"id": comment_id})
    return Comment(**updated_comment)

@api_router.delete("/comments/{comment_id}")
async def delete_comment(comment_id: str):
    comment = await db.comments.find_one({"id": comment_id})
    if not comment:
        raise HTTPException(status_code=404, detail="Comment not found")
    
    await db.comments.delete_one({"id": comment_id})
    await update_case_counts(comment["case_id"])
    
    return {"message": "Comment deleted successfully"}

# File Management Routes
@api_router.post("/cases/{case_id}/files")
async def upload_file(case_id: str, file: UploadFile = File(...), uploaded_by: str = "anonymous"):
    # Verify case exists
    await get_case_by_id(case_id)
    
    # Generate unique filename
    file_id = str(uuid.uuid4())
    file_extension = Path(file.filename).suffix
    filename = f"{file_id}{file_extension}"
    file_path = UPLOAD_DIR / filename
    
    # Save file
    async with aiofiles.open(file_path, 'wb') as f:
        content = await file.read()
        await f.write(content)
    
    # Create file record
    file_obj = FileAttachment(
        filename=filename,
        original_filename=file.filename,
        file_size=len(content),
        mime_type=file.content_type,
        uploaded_by=uploaded_by
    )
    
    file_record = file_obj.dict()
    file_record["case_id"] = case_id
    await db.files.insert_one(file_record)
    await update_case_counts(case_id)
    
    return file_obj

@api_router.get("/cases/{case_id}/files", response_model=List[FileAttachment])
async def get_case_files(case_id: str):
    # Verify case exists
    await get_case_by_id(case_id)
    
    files = await db.files.find({"case_id": case_id}).sort("uploaded_at", -1).to_list(1000)
    return [FileAttachment(**file) for file in files]

@api_router.get("/files/{file_id}/download")
async def download_file(file_id: str):
    file_record = await db.files.find_one({"id": file_id})
    if not file_record:
        raise HTTPException(status_code=404, detail="File not found")
    
    file_path = UPLOAD_DIR / file_record["filename"]
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="File not found on disk")
    
    return FileResponse(
        path=file_path,
        filename=file_record["original_filename"],
        media_type=file_record["mime_type"]
    )

@api_router.delete("/files/{file_id}")
async def delete_file(file_id: str):
    file_record = await db.files.find_one({"id": file_id})
    if not file_record:
        raise HTTPException(status_code=404, detail="File not found")
    
    # Delete file from disk
    file_path = UPLOAD_DIR / file_record["filename"]
    if file_path.exists():
        file_path.unlink()
    
    # Delete file record
    await db.files.delete_one({"id": file_id})
    await update_case_counts(file_record["case_id"])
    
    return {"message": "File deleted successfully"}

# Statistics Routes
@api_router.get("/stats")
async def get_stats():
    total_cases = await db.cases.count_documents({})
    open_cases = await db.cases.count_documents({"status": "open"})
    in_progress_cases = await db.cases.count_documents({"status": "in_progress"})
    closed_cases = await db.cases.count_documents({"status": "closed"})
    
    priority_stats = {}
    for priority in CasePriority:
        priority_stats[priority] = await db.cases.count_documents({"priority": priority})
    
    return {
        "total_cases": total_cases,
        "open_cases": open_cases,
        "in_progress_cases": in_progress_cases,
        "closed_cases": closed_cases,
        "priority_stats": priority_stats
    }

# Health check
@api_router.get("/health")
async def health_check():
    return {"status": "healthy", "timestamp": datetime.utcnow()}

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()