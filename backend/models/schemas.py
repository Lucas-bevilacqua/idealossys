from pydantic import BaseModel, ConfigDict, EmailStr, Field
from typing import Optional, List


class UserResponse(BaseModel):
    id: str
    username: str
    name: str
    email: Optional[str] = None


class LoginRequest(BaseModel):
    username: str
    password: str


class RegisterRequest(BaseModel):
    username: str
    password: str
    name: str
    email: Optional[EmailStr] = None


class TenantUpdate(BaseModel):
    model_config = {"populate_by_name": True}

    name: Optional[str] = None
    description: Optional[str] = None
    industry: Optional[str] = None
    goals: Optional[str] = None
    target_audience: Optional[str] = Field(None, alias="targetAudience")
    challenges: Optional[str] = None
    website_url: Optional[str] = Field(None, alias="websiteUrl")
    logo_url: Optional[str] = Field(None, alias="logoUrl")
    brand_colors: Optional[str] = Field(None, alias="brandColors")
    brand_tone: Optional[str] = Field(None, alias="brandTone")
    credits: Optional[int] = None
    plan: Optional[str] = None


class TenantResponse(BaseModel):
    id: str
    name: str
    description: Optional[str] = None
    industry: Optional[str] = None
    goals: Optional[str] = None
    target_audience: Optional[str] = None
    challenges: Optional[str] = None
    website_url: Optional[str] = None
    logo_url: Optional[str] = None
    brand_colors: Optional[str] = None
    brand_tone: Optional[str] = None
    credits: int = 5000
    plan: str = "starter"


class TaskCreate(BaseModel):
    title: str
    description: str
    assigneeId: str


class TaskResponse(BaseModel):
    id: str
    title: str
    description: str
    status: str
    assigneeId: str
    needsApproval: bool = False
    approved: bool = False
    logs: List[str] = []


class ArtifactCreate(BaseModel):
    title: str
    language: str
    code: str
    type: str = "code"
    projectId: Optional[str] = None
    filepath: Optional[str] = None


class ArtifactResponse(BaseModel):
    id: str
    title: str
    language: str
    code: str
    type: str
    timestamp: int
    projectId: Optional[str] = None
    filepath: Optional[str] = None


class ProjectCreate(BaseModel):
    name: str
    description: str
    type: str = "web"
    stack: str


class ProjectResponse(BaseModel):
    id: str
    name: str
    description: str
    type: str
    stack: str
    status: str
    createdAt: int
    deployedPort: Optional[int] = None
    deployedPid: Optional[int] = None
    deployedUrl: Optional[str] = None
    customDomain: Optional[str] = None


class MessageCreate(BaseModel):
    text: str
    role: str = "user"
    artifactId: Optional[str] = None


class MessageResponse(BaseModel):
    id: str
    senderId: str
    senderName: str
    text: str
    timestamp: int
    role: str
    areaId: str
    artifactId: Optional[str] = None


class ArtifactUpdate(BaseModel):
    title: Optional[str] = None
    language: Optional[str] = None
    code: Optional[str] = None
    type: Optional[str] = None
    filepath: Optional[str] = None
    projectId: Optional[str] = None


class AgentLogResponse(BaseModel):
    id: str
    status: str
    eventType: str
    fromAgent: str
    toAgent: str
    createdAt: int
