from fastapi import FastAPI, APIRouter, HTTPException, File, UploadFile, Depends, Query
from fastapi.responses import FileResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any, Union
import uuid
from datetime import datetime
from enum import Enum
import aiofiles
import json
import asyncio
from concurrent.futures import ThreadPoolExecutor

# Import database clients based on configuration
USE_OPENSEARCH = os.environ.get('USE_OPENSEARCH', 'false').lower() == 'true'

if USE_OPENSEARCH:
    from opensearchpy import OpenSearch, RequestsHttpConnection
    DATABASE_TYPE = "opensearch"
else:
    from motor.motor_asyncio import AsyncIOMotorClient
    DATABASE_TYPE = "mongodb"

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# Database configuration
if USE_OPENSEARCH:
    # OpenSearch configuration
    opensearch_config = {
        'hosts': [os.environ.get('OPENSEARCH_URL', 'http://localhost:9200')],
        'http_auth': (
            os.environ.get('OPENSEARCH_USERNAME', 'admin'),
            os.environ.get('OPENSEARCH_PASSWORD', 'admin')
        ),
        'use_ssl': os.environ.get('OPENSEARCH_USE_SSL', 'false').lower() == 'true',
        'verify_certs': os.environ.get('OPENSEARCH_VERIFY_CERTS', 'false').lower() == 'true',
        'connection_class': RequestsHttpConnection,
    }
    client = OpenSearch(**opensearch_config)
    db = None
else:
    # MongoDB configuration
    mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
    client = AsyncIOMotorClient(mongo_url)
    db = client[os.environ.get('DB_NAME', 'opensearch_cases')]

# Thread pool for async operations
thread_pool = ThreadPoolExecutor(max_workers=10)

# Create the main app
app = FastAPI(title="OpenSearch Cases API", version="2.0.0", description=f"Using {DATABASE_TYPE.upper()}")

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# File upload directory
UPLOAD_DIR = ROOT_DIR / "uploads"
UPLOAD_DIR.mkdir(exist_ok=True)

# Index/Collection names
CASES_INDEX = "cases"
COMMENTS_INDEX = "comments"
FILES_INDEX = "files"
USERS_INDEX = "users"
ALERTS_INDEX = "alerts"

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

class AlertStatus(str, Enum):
    ACTIVE = "active"
    ACKNOWLEDGED = "acknowledged"
    COMPLETED = "completed"

class AlertSeverity(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"

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
    case_id: str

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

class Alert(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str
    description: str
    severity: AlertSeverity
    status: AlertStatus = AlertStatus.ACTIVE
    monitor_id: str
    trigger_id: str
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    acknowledged_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    case_id: Optional[str] = None
    opensearch_query: Optional[Dict[str, Any]] = None
    visualization_id: Optional[str] = None

class AlertCreate(BaseModel):
    title: str
    description: str
    severity: AlertSeverity
    monitor_id: str
    trigger_id: str
    opensearch_query: Optional[Dict[str, Any]] = None
    visualization_id: Optional[str] = None

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
    alert_id: Optional[str] = None
    opensearch_query: Optional[Dict[str, Any]] = None
    visualization_ids: List[str] = []

class CaseCreate(BaseModel):
    title: str
    description: str
    priority: CasePriority = CasePriority.MEDIUM
    tags: List[str] = []
    assigned_to: Optional[str] = None
    assigned_to_name: Optional[str] = None
    created_by: str
    created_by_name: str
    alert_id: Optional[str] = None
    opensearch_query: Optional[Dict[str, Any]] = None
    visualization_ids: List[str] = []

class CaseUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[CaseStatus] = None
    priority: Optional[CasePriority] = None
    tags: Optional[List[str]] = None
    assigned_to: Optional[str] = None
    assigned_to_name: Optional[str] = None
    visualization_ids: Optional[List[str]] = None

class Visualization(BaseModel):
    id: str
    title: str
    type: str
    query: Dict[str, Any]
    config: Dict[str, Any]

# Database helper functions
async def run_in_thread(func, *args, **kwargs):
    """Run blocking operations in thread pool"""
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(thread_pool, func, *args, **kwargs)

# MongoDB helper functions
async def mongo_get_case_by_id(case_id: str):
    """Get case by ID from MongoDB"""
    case = await db[CASES_INDEX].find_one({"id": case_id})
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")
    return Case(**case)

async def mongo_update_case_counts(case_id: str):
    """Update case counts in MongoDB"""
    comments_count = await db[COMMENTS_INDEX].count_documents({"case_id": case_id})
    attachments_count = await db[FILES_INDEX].count_documents({"case_id": case_id})
    
    await db[CASES_INDEX].update_one(
        {"id": case_id},
        {"$set": {
            "comments_count": comments_count,
            "attachments_count": attachments_count,
            "updated_at": datetime.utcnow()
        }}
    )

# OpenSearch helper functions
async def opensearch_get_case_by_id(case_id: str):
    """Get case by ID from OpenSearch"""
    try:
        response = await run_in_thread(
            client.search,
            index=CASES_INDEX,
            body={
                "query": {
                    "term": {"id": case_id}
                }
            }
        )
        
        if response['hits']['total']['value'] == 0:
            raise HTTPException(status_code=404, detail="Case not found")
            
        case_data = response['hits']['hits'][0]['_source']
        return Case(**case_data)
    except Exception as e:
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=500, detail=f"Error retrieving case: {str(e)}")

async def opensearch_update_case_counts(case_id: str):
    """Update case counts in OpenSearch"""
    try:
        # Count comments
        comments_response = await run_in_thread(
            client.count,
            index=COMMENTS_INDEX,
            body={
                "query": {
                    "term": {"case_id": case_id}
                }
            }
        )
        comments_count = comments_response['count']
        
        # Count files
        files_response = await run_in_thread(
            client.count,
            index=FILES_INDEX,
            body={
                "query": {
                    "term": {"case_id": case_id}
                }
            }
        )
        attachments_count = files_response['count']
        
        # Update case
        await run_in_thread(
            client.update,
            index=CASES_INDEX,
            id=case_id,
            body={
                "doc": {
                    "comments_count": comments_count,
                    "attachments_count": attachments_count,
                    "updated_at": datetime.utcnow().isoformat()
                }
            }
        )
        
    except Exception as e:
        logging.error(f"Error updating case counts: {e}")

# Unified helper functions
async def get_case_by_id(case_id: str):
    """Get case by ID using the configured database"""
    if USE_OPENSEARCH:
        return await opensearch_get_case_by_id(case_id)
    else:
        return await mongo_get_case_by_id(case_id)

async def update_case_counts(case_id: str):
    """Update case counts using the configured database"""
    if USE_OPENSEARCH:
        return await opensearch_update_case_counts(case_id)
    else:
        return await mongo_update_case_counts(case_id)

# User Management Routes
@api_router.post("/users", response_model=User)
async def create_user(user: UserCreate):
    if USE_OPENSEARCH:
        # OpenSearch implementation
        try:
            response = await run_in_thread(
                client.search,
                index=USERS_INDEX,
                body={
                    "query": {
                        "term": {"username": user.username}
                    }
                }
            )
            
            if response['hits']['total']['value'] > 0:
                raise HTTPException(status_code=400, detail="Username already exists")
        except Exception as e:
            if isinstance(e, HTTPException):
                raise e
            raise HTTPException(status_code=500, detail=f"Error checking user: {str(e)}")
        
        user_obj = User(**user.dict())
        
        try:
            await run_in_thread(
                client.index,
                index=USERS_INDEX,
                id=user_obj.id,
                body=user_obj.dict()
            )
            return user_obj
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Error creating user: {str(e)}")
    else:
        # MongoDB implementation
        existing_user = await db[USERS_INDEX].find_one({"username": user.username})
        if existing_user:
            raise HTTPException(status_code=400, detail="Username already exists")
        
        user_obj = User(**user.dict())
        await db[USERS_INDEX].insert_one(user_obj.dict())
        return user_obj

@api_router.get("/users", response_model=List[User])
async def get_users():
    if USE_OPENSEARCH:
        try:
            response = await run_in_thread(
                client.search,
                index=USERS_INDEX,
                body={
                    "query": {"match_all": {}},
                    "size": 1000
                }
            )
            
            users = [User(**hit['_source']) for hit in response['hits']['hits']]
            return users
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Error retrieving users: {str(e)}")
    else:
        users = await db[USERS_INDEX].find().to_list(1000)
        return [User(**user) for user in users]

@api_router.get("/users/{user_id}", response_model=User)
async def get_user(user_id: str):
    if USE_OPENSEARCH:
        try:
            response = await run_in_thread(
                client.search,
                index=USERS_INDEX,
                body={
                    "query": {
                        "term": {"id": user_id}
                    }
                }
            )
            
            if response['hits']['total']['value'] == 0:
                raise HTTPException(status_code=404, detail="User not found")
                
            user_data = response['hits']['hits'][0]['_source']
            return User(**user_data)
        except Exception as e:
            if isinstance(e, HTTPException):
                raise e
            raise HTTPException(status_code=500, detail=f"Error retrieving user: {str(e)}")
    else:
        user = await db[USERS_INDEX].find_one({"id": user_id})
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        return User(**user)

# Case Management Routes
@api_router.post("/cases", response_model=Case)
async def create_case(case: CaseCreate):
    case_obj = Case(**case.dict())
    
    if USE_OPENSEARCH:
        try:
            await run_in_thread(
                client.index,
                index=CASES_INDEX,
                id=case_obj.id,
                body=case_obj.dict()
            )
            
            # Create system comment
            system_comment = Comment(
                case_id=case_obj.id,
                author="system",
                author_name="System",
                content=f"Case created by {case_obj.created_by_name}",
                comment_type=CommentType.SYSTEM
            )
            
            await run_in_thread(
                client.index,
                index=COMMENTS_INDEX,
                id=system_comment.id,
                body=system_comment.dict()
            )
            
            await update_case_counts(case_obj.id)
            return case_obj
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Error creating case: {str(e)}")
    else:
        await db[CASES_INDEX].insert_one(case_obj.dict())
        
        # Create system comment
        system_comment = Comment(
            case_id=case_obj.id,
            author="system",
            author_name="System",
            content=f"Case created by {case_obj.created_by_name}",
            comment_type=CommentType.SYSTEM
        )
        await db[COMMENTS_INDEX].insert_one(system_comment.dict())
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
    if USE_OPENSEARCH:
        try:
            query = {"match_all": {}}
            
            # Build filters
            filters = []
            if status:
                filters.append({"term": {"status": status}})
            if priority:
                filters.append({"term": {"priority": priority}})
            if assigned_to:
                filters.append({"term": {"assigned_to": assigned_to}})
            if created_by:
                filters.append({"term": {"created_by": created_by}})
            if search:
                filters.append({
                    "multi_match": {
                        "query": search,
                        "fields": ["title", "description", "tags"]
                    }
                })
            
            if filters:
                query = {
                    "bool": {
                        "must": filters
                    }
                }
            
            response = await run_in_thread(
                client.search,
                index=CASES_INDEX,
                body={
                    "query": query,
                    "sort": [{"created_at": {"order": "desc"}}],
                    "from": offset,
                    "size": limit
                }
            )
            
            cases = [Case(**hit['_source']) for hit in response['hits']['hits']]
            return cases
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Error retrieving cases: {str(e)}")
    else:
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
        
        cases = await db[CASES_INDEX].find(query).sort("created_at", -1).skip(offset).limit(limit).to_list(limit)
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
        
        if USE_OPENSEARCH:
            try:
                await run_in_thread(
                    client.update,
                    index=CASES_INDEX,
                    id=case_id,
                    body={"doc": update_data}
                )
                
                # Create system comment for status change
                if "status" in update_data:
                    system_comment = Comment(
                        case_id=case_id,
                        author="system",
                        author_name="System",
                        content=f"Case status changed to {update_data['status']}",
                        comment_type=CommentType.SYSTEM
                    )
                    
                    await run_in_thread(
                        client.index,
                        index=COMMENTS_INDEX,
                        id=system_comment.id,
                        body=system_comment.dict()
                    )
                    
                    await update_case_counts(case_id)
                
                return await get_case_by_id(case_id)
            except Exception as e:
                raise HTTPException(status_code=500, detail=f"Error updating case: {str(e)}")
        else:
            await db[CASES_INDEX].update_one({"id": case_id}, {"$set": update_data})
            
            # Create system comment for status change
            if "status" in update_data:
                system_comment = Comment(
                    case_id=case_id,
                    author="system",
                    author_name="System",
                    content=f"Case status changed to {update_data['status']}",
                    comment_type=CommentType.SYSTEM
                )
                await db[COMMENTS_INDEX].insert_one(system_comment.dict())
                await update_case_counts(case_id)
    
    return await get_case_by_id(case_id)

@api_router.delete("/cases/{case_id}")
async def delete_case(case_id: str):
    case = await get_case_by_id(case_id)
    
    if USE_OPENSEARCH:
        try:
            # Delete associated comments
            await run_in_thread(
                client.delete_by_query,
                index=COMMENTS_INDEX,
                body={
                    "query": {
                        "term": {"case_id": case_id}
                    }
                }
            )
            
            # Delete associated files
            await run_in_thread(
                client.delete_by_query,
                index=FILES_INDEX,
                body={
                    "query": {
                        "term": {"case_id": case_id}
                    }
                }
            )
            
            # Delete case
            await run_in_thread(
                client.delete,
                index=CASES_INDEX,
                id=case_id
            )
            
            return {"message": "Case deleted successfully"}
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Error deleting case: {str(e)}")
    else:
        # Delete associated comments and files
        await db[COMMENTS_INDEX].delete_many({"case_id": case_id})
        await db[FILES_INDEX].delete_many({"case_id": case_id})
        await db[CASES_INDEX].delete_one({"id": case_id})
        
        return {"message": "Case deleted successfully"}

# Comment Management Routes
@api_router.post("/cases/{case_id}/comments", response_model=Comment)
async def create_comment(case_id: str, comment: CommentCreate):
    # Verify case exists
    case = await get_case_by_id(case_id)
    
    comment_obj = Comment(case_id=case_id, **comment.dict())
    
    if USE_OPENSEARCH:
        try:
            await run_in_thread(
                client.index,
                index=COMMENTS_INDEX,
                id=comment_obj.id,
                body=comment_obj.dict()
            )
            await update_case_counts(case_id)
            return comment_obj
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Error creating comment: {str(e)}")
    else:
        await db[COMMENTS_INDEX].insert_one(comment_obj.dict())
        await update_case_counts(case_id)
        return comment_obj

@api_router.get("/cases/{case_id}/comments", response_model=List[Comment])
async def get_case_comments(case_id: str):
    # Verify case exists
    case = await get_case_by_id(case_id)
    
    if USE_OPENSEARCH:
        try:
            response = await run_in_thread(
                client.search,
                index=COMMENTS_INDEX,
                body={
                    "query": {"term": {"case_id": case_id}},
                    "sort": [{"created_at": {"order": "asc"}}],
                    "size": 1000
                }
            )
            comments = [Comment(**hit['_source']) for hit in response['hits']['hits']]
            return comments
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Error retrieving comments: {str(e)}")
    else:
        comments = await db[COMMENTS_INDEX].find({"case_id": case_id}).sort("created_at", 1).to_list(1000)
        return [Comment(**comment) for comment in comments]

@api_router.put("/comments/{comment_id}", response_model=Comment)
async def update_comment(comment_id: str, content: dict):
    update_data = {
        "content": content.get("content"),
        "updated_at": datetime.utcnow()
    }
    
    if USE_OPENSEARCH:
        try:
            # First check if comment exists
            response = await run_in_thread(
                client.search,
                index=COMMENTS_INDEX,
                body={"query": {"term": {"id": comment_id}}}
            )
            
            if response['hits']['total']['value'] == 0:
                raise HTTPException(status_code=404, detail="Comment not found")
            
            await run_in_thread(
                client.update,
                index=COMMENTS_INDEX,
                id=comment_id,
                body={"doc": update_data}
            )
            
            # Get updated comment
            updated_response = await run_in_thread(
                client.search,
                index=COMMENTS_INDEX,
                body={"query": {"term": {"id": comment_id}}}
            )
            
            return Comment(**updated_response['hits']['hits'][0]['_source'])
        except Exception as e:
            if isinstance(e, HTTPException):
                raise e
            raise HTTPException(status_code=500, detail=f"Error updating comment: {str(e)}")
    else:
        result = await db[COMMENTS_INDEX].update_one(
            {"id": comment_id},
            {"$set": update_data}
        )
        
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Comment not found")
        
        comment = await db[COMMENTS_INDEX].find_one({"id": comment_id})
        return Comment(**comment)

@api_router.delete("/comments/{comment_id}")
async def delete_comment(comment_id: str):
    if USE_OPENSEARCH:
        try:
            # First check if comment exists and get case_id
            response = await run_in_thread(
                client.search,
                index=COMMENTS_INDEX,
                body={"query": {"term": {"id": comment_id}}}
            )
            
            if response['hits']['total']['value'] == 0:
                raise HTTPException(status_code=404, detail="Comment not found")
            
            case_id = response['hits']['hits'][0]['_source']['case_id']
            
            await run_in_thread(
                client.delete,
                index=COMMENTS_INDEX,
                id=comment_id
            )
            
            await update_case_counts(case_id)
            return {"message": "Comment deleted successfully"}
        except Exception as e:
            if isinstance(e, HTTPException):
                raise e
            raise HTTPException(status_code=500, detail=f"Error deleting comment: {str(e)}")
    else:
        comment = await db[COMMENTS_INDEX].find_one({"id": comment_id})
        if not comment:
            raise HTTPException(status_code=404, detail="Comment not found")
        
        case_id = comment["case_id"]
        await db[COMMENTS_INDEX].delete_one({"id": comment_id})
        await update_case_counts(case_id)
        return {"message": "Comment deleted successfully"}

# File Management Routes
@api_router.post("/cases/{case_id}/files", response_model=FileAttachment)
async def upload_file(case_id: str, file: UploadFile = File(...), uploaded_by: str = "anonymous"):
    # Verify case exists
    case = await get_case_by_id(case_id)
    
    if not file:
        raise HTTPException(status_code=400, detail="No file uploaded")
    
    # Generate unique filename
    file_id = str(uuid.uuid4())
    file_extension = file.filename.split('.')[-1] if '.' in file.filename else ''
    stored_filename = f"{file_id}.{file_extension}" if file_extension else file_id
    file_path = UPLOAD_DIR / stored_filename
    
    try:
        # Save file to disk
        async with aiofiles.open(file_path, 'wb') as f:
            content = await file.read()
            await f.write(content)
        
        # Create file attachment record
        file_obj = FileAttachment(
            filename=stored_filename,
            original_filename=file.filename,
            file_size=len(content),
            mime_type=file.content_type or 'application/octet-stream',
            uploaded_by=uploaded_by,
            case_id=case_id
        )
        
        if USE_OPENSEARCH:
            await run_in_thread(
                client.index,
                index=FILES_INDEX,
                id=file_obj.id,
                body=file_obj.dict()
            )
        else:
            await db[FILES_INDEX].insert_one(file_obj.dict())
        
        await update_case_counts(case_id)
        return file_obj
        
    except Exception as e:
        # Clean up file if database operation fails
        if file_path.exists():
            file_path.unlink()
        raise HTTPException(status_code=500, detail=f"Error uploading file: {str(e)}")

@api_router.get("/cases/{case_id}/files", response_model=List[FileAttachment])
async def get_case_files(case_id: str):
    # Verify case exists
    case = await get_case_by_id(case_id)
    
    if USE_OPENSEARCH:
        try:
            response = await run_in_thread(
                client.search,
                index=FILES_INDEX,
                body={
                    "query": {"term": {"case_id": case_id}},
                    "sort": [{"uploaded_at": {"order": "desc"}}],
                    "size": 1000
                }
            )
            files = [FileAttachment(**hit['_source']) for hit in response['hits']['hits']]
            return files
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Error retrieving files: {str(e)}")
    else:
        files = await db[FILES_INDEX].find({"case_id": case_id}).sort("uploaded_at", -1).to_list(1000)
        return [FileAttachment(**file) for file in files]

@api_router.get("/files/{file_id}/download")
async def download_file(file_id: str):
    if USE_OPENSEARCH:
        try:
            response = await run_in_thread(
                client.search,
                index=FILES_INDEX,
                body={"query": {"term": {"id": file_id}}}
            )
            
            if response['hits']['total']['value'] == 0:
                raise HTTPException(status_code=404, detail="File not found")
            
            file_data = FileAttachment(**response['hits']['hits'][0]['_source'])
        except Exception as e:
            if isinstance(e, HTTPException):
                raise e
            raise HTTPException(status_code=500, detail=f"Error retrieving file: {str(e)}")
    else:
        file_record = await db[FILES_INDEX].find_one({"id": file_id})
        if not file_record:
            raise HTTPException(status_code=404, detail="File not found")
        file_data = FileAttachment(**file_record)
    
    file_path = UPLOAD_DIR / file_data.filename
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="File not found on disk")
    
    return FileResponse(
        path=file_path,
        filename=file_data.original_filename,
        media_type=file_data.mime_type
    )

@api_router.delete("/files/{file_id}")
async def delete_file(file_id: str):
    if USE_OPENSEARCH:
        try:
            response = await run_in_thread(
                client.search,
                index=FILES_INDEX,
                body={"query": {"term": {"id": file_id}}}
            )
            
            if response['hits']['total']['value'] == 0:
                raise HTTPException(status_code=404, detail="File not found")
            
            file_data = FileAttachment(**response['hits']['hits'][0]['_source'])
            case_id = file_data.case_id
            
            await run_in_thread(
                client.delete,
                index=FILES_INDEX,
                id=file_id
            )
            
            # Remove file from disk
            file_path = UPLOAD_DIR / file_data.filename
            if file_path.exists():
                file_path.unlink()
            
            await update_case_counts(case_id)
            return {"message": "File deleted successfully"}
        except Exception as e:
            if isinstance(e, HTTPException):
                raise e
            raise HTTPException(status_code=500, detail=f"Error deleting file: {str(e)}")
    else:
        file_record = await db[FILES_INDEX].find_one({"id": file_id})
        if not file_record:
            raise HTTPException(status_code=404, detail="File not found")
        
        file_data = FileAttachment(**file_record)
        case_id = file_data.case_id
        
        await db[FILES_INDEX].delete_one({"id": file_id})
        
        # Remove file from disk
        file_path = UPLOAD_DIR / file_data.filename
        if file_path.exists():
            file_path.unlink()
        
        await update_case_counts(case_id)
        return {"message": "File deleted successfully"}

# Statistics Routes
@api_router.get("/stats")
async def get_stats():
    if USE_OPENSEARCH:
        try:
            # Get case statistics
            cases_response = await run_in_thread(
                client.search,
                index=CASES_INDEX,
                body={
                    "size": 0,
                    "aggs": {
                        "total_cases": {"value_count": {"field": "id"}},
                        "status_breakdown": {
                            "terms": {"field": "status"}
                        },
                        "priority_breakdown": {
                            "terms": {"field": "priority"}
                        }
                    }
                }
            )
            
            # Get alert statistics
            alerts_response = await run_in_thread(
                client.search,
                index=ALERTS_INDEX,
                body={
                    "size": 0,
                    "aggs": {
                        "total_alerts": {"value_count": {"field": "id"}},
                        "severity_breakdown": {
                            "terms": {"field": "severity"}
                        },
                        "status_breakdown": {
                            "terms": {"field": "status"}
                        }
                    }
                }
            )
            
            # Process case statistics
            case_aggs = cases_response['aggregations']
            total_cases = case_aggs['total_cases']['value']
            
            status_breakdown = {bucket['key']: bucket['doc_count'] for bucket in case_aggs['status_breakdown']['buckets']}
            priority_breakdown = {bucket['key']: bucket['doc_count'] for bucket in case_aggs['priority_breakdown']['buckets']}
            
            # Process alert statistics
            alert_aggs = alerts_response['aggregations']
            total_alerts = alert_aggs['total_alerts']['value']
            
            severity_breakdown = {bucket['key']: bucket['doc_count'] for bucket in alert_aggs['severity_breakdown']['buckets']}
            alert_status_breakdown = {bucket['key']: bucket['doc_count'] for bucket in alert_aggs['status_breakdown']['buckets']}
            
            return {
                "total_cases": total_cases,
                "open_cases": status_breakdown.get("open", 0),
                "in_progress_cases": status_breakdown.get("in_progress", 0),
                "closed_cases": status_breakdown.get("closed", 0),
                "priority_stats": priority_breakdown,
                "total_alerts": total_alerts,
                "alert_severity_stats": severity_breakdown,
                "alert_status_stats": alert_status_breakdown
            }
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Error retrieving stats: {str(e)}")
    else:
        total_cases = await db[CASES_INDEX].count_documents({})
        open_cases = await db[CASES_INDEX].count_documents({"status": "open"})
        in_progress_cases = await db[CASES_INDEX].count_documents({"status": "in_progress"})
        closed_cases = await db[CASES_INDEX].count_documents({"status": "closed"})
        
        priority_stats = {}
        for priority in CasePriority:
            priority_stats[priority] = await db[CASES_INDEX].count_documents({"priority": priority})
        
        # Get alert statistics
        total_alerts = await db[ALERTS_INDEX].count_documents({})
        
        return {
            "total_cases": total_cases,
            "open_cases": open_cases,
            "in_progress_cases": in_progress_cases,
            "closed_cases": closed_cases,
            "priority_stats": priority_stats,
            "total_alerts": total_alerts,
            "alert_severity_stats": {},
            "alert_status_stats": {}
        }

# Health check
@api_router.get("/health")
async def health_check():
    try:
        if USE_OPENSEARCH:
            # Check OpenSearch connectivity
            info = await run_in_thread(client.info)
            
            return {
                "status": "healthy",
                "timestamp": datetime.utcnow(),
                "database": "opensearch",
                "opensearch_cluster": info.get("cluster_name", "unknown"),
                "opensearch_version": info.get("version", {}).get("number", "unknown")
            }
        else:
            # Check MongoDB connectivity
            await db.command("ping")
            
            return {
                "status": "healthy",
                "timestamp": datetime.utcnow(),
                "database": "mongodb"
            }
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"Database connection failed: {str(e)}")

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

@app.on_event("startup")
async def startup_event():
    """Initialize database on startup"""
    try:
        if USE_OPENSEARCH:
            logger.info("Using OpenSearch as database")
            
            # Initialize OpenSearch indices
            await initialize_opensearch_indices()
            
            # Test OpenSearch connection
            info = await run_in_thread(client.info)
            logger.info(f"Connected to OpenSearch cluster: {info.get('cluster_name', 'unknown')}")
        else:
            logger.info("Using MongoDB as database")
            # Test MongoDB connection
            await db.command("ping")
        
        logger.info(f"Backend initialized successfully with {DATABASE_TYPE.upper()}")
    except Exception as e:
        logger.error(f"Failed to initialize backend: {e}")
        raise

async def initialize_opensearch_indices():
    """Initialize OpenSearch indices with proper mappings"""
    indices_mappings = {
        CASES_INDEX: {
            "mappings": {
                "properties": {
                    "id": {"type": "keyword"},
                    "title": {"type": "text", "analyzer": "standard"},
                    "description": {"type": "text", "analyzer": "standard"},
                    "status": {"type": "keyword"},
                    "priority": {"type": "keyword"},
                    "tags": {"type": "keyword"},
                    "assigned_to": {"type": "keyword"},
                    "assigned_to_name": {"type": "text"},
                    "created_by": {"type": "keyword"},
                    "created_by_name": {"type": "text"},
                    "created_at": {"type": "date"},
                    "updated_at": {"type": "date"},
                    "closed_at": {"type": "date"},
                    "comments_count": {"type": "integer"},
                    "attachments_count": {"type": "integer"},
                    "alert_id": {"type": "keyword"},
                    "opensearch_query": {"type": "object"},
                    "visualization_ids": {"type": "keyword"}
                }
            }
        },
        COMMENTS_INDEX: {
            "mappings": {
                "properties": {
                    "id": {"type": "keyword"},
                    "case_id": {"type": "keyword"},
                    "author": {"type": "keyword"},
                    "author_name": {"type": "text"},
                    "content": {"type": "text", "analyzer": "standard"},
                    "comment_type": {"type": "keyword"},
                    "created_at": {"type": "date"},
                    "updated_at": {"type": "date"}
                }
            }
        },
        FILES_INDEX: {
            "mappings": {
                "properties": {
                    "id": {"type": "keyword"},
                    "filename": {"type": "keyword"},
                    "original_filename": {"type": "text"},
                    "file_size": {"type": "integer"},
                    "mime_type": {"type": "keyword"},
                    "uploaded_by": {"type": "keyword"},
                    "uploaded_at": {"type": "date"},
                    "case_id": {"type": "keyword"}
                }
            }
        },
        USERS_INDEX: {
            "mappings": {
                "properties": {
                    "id": {"type": "keyword"},
                    "username": {"type": "keyword"},
                    "email": {"type": "keyword"},
                    "full_name": {"type": "text"},
                    "created_at": {"type": "date"}
                }
            }
        },
        ALERTS_INDEX: {
            "mappings": {
                "properties": {
                    "id": {"type": "keyword"},
                    "title": {"type": "text", "analyzer": "standard"},
                    "description": {"type": "text", "analyzer": "standard"},
                    "severity": {"type": "keyword"},
                    "status": {"type": "keyword"},
                    "monitor_id": {"type": "keyword"},
                    "trigger_id": {"type": "keyword"},
                    "created_at": {"type": "date"},
                    "updated_at": {"type": "date"},
                    "acknowledged_at": {"type": "date"},
                    "completed_at": {"type": "date"},
                    "case_id": {"type": "keyword"},
                    "opensearch_query": {"type": "object"},
                    "visualization_id": {"type": "keyword"}
                }
            }
        }
    }
    
    for index_name, mapping in indices_mappings.items():
        try:
            # Check if index exists
            exists = await run_in_thread(client.indices.exists, index=index_name)
            
            if not exists:
                # Create index with mapping
                await run_in_thread(client.indices.create, index=index_name, body=mapping)
                logger.info(f"Created OpenSearch index: {index_name}")
            else:
                logger.info(f"OpenSearch index already exists: {index_name}")
                
        except Exception as e:
            logger.error(f"Error creating OpenSearch index {index_name}: {e}")
            raise

@app.on_event("shutdown")
async def shutdown_event():
    """Cleanup on shutdown"""
    if USE_OPENSEARCH:
        # OpenSearch client cleanup
        pass
    else:
        # Close MongoDB connection
        client.close()
    
    thread_pool.shutdown(wait=True)