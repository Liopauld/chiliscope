"""
Storage Service
===============

Cloud storage abstraction for Azure Blob Storage.
"""

import os
import logging
from typing import Optional, Dict, List
from datetime import datetime, timedelta

logger = logging.getLogger(__name__)


class StorageService:
    """
    Cloud storage service with Azure Blob Storage support.
    
    Falls back to local storage if Azure is not configured.
    """
    
    def __init__(
        self,
        azure_connection_string: Optional[str] = None,
        container_name: str = "chili-images",
        local_fallback_dir: str = "uploads"
    ):
        """
        Initialize storage service.
        
        Args:
            azure_connection_string: Azure Blob Storage connection string
            container_name: Azure container name
            local_fallback_dir: Local directory for fallback storage
        """
        self.connection_string = azure_connection_string
        self.container_name = container_name
        self.local_dir = local_fallback_dir
        self.use_azure = False
        self.blob_service_client = None
        self.container_client = None
        
        if azure_connection_string:
            self._init_azure()
        else:
            self._init_local()
    
    def _init_azure(self):
        """Initialize Azure Blob Storage connection."""
        try:
            from azure.storage.blob import BlobServiceClient
            
            self.blob_service_client = BlobServiceClient.from_connection_string(
                self.connection_string
            )
            
            # Create container if not exists
            self.container_client = self.blob_service_client.get_container_client(
                self.container_name
            )
            
            if not self.container_client.exists():
                self.container_client.create_container()
            
            self.use_azure = True
            logger.info(f"Azure Blob Storage initialized: {self.container_name}")
            
        except ImportError:
            logger.warning("azure-storage-blob not installed. Using local storage.")
            self._init_local()
        except Exception as e:
            logger.error(f"Failed to initialize Azure: {e}. Using local storage.")
            self._init_local()
    
    def _init_local(self):
        """Initialize local storage."""
        from pathlib import Path
        Path(self.local_dir).mkdir(parents=True, exist_ok=True)
        self.use_azure = False
        logger.info(f"Using local storage: {self.local_dir}")
    
    async def upload(
        self,
        file_content: bytes,
        blob_name: str,
        content_type: str = "image/jpeg",
        metadata: Optional[Dict] = None
    ) -> Dict:
        """
        Upload file to storage.
        
        Args:
            file_content: File content as bytes
            blob_name: Name/path for the blob
            content_type: MIME content type
            metadata: Optional metadata dict
            
        Returns:
            Upload result with URL
        """
        if self.use_azure:
            return await self._upload_azure(file_content, blob_name, content_type, metadata)
        else:
            return await self._upload_local(file_content, blob_name, metadata)
    
    async def _upload_azure(
        self,
        file_content: bytes,
        blob_name: str,
        content_type: str,
        metadata: Optional[Dict]
    ) -> Dict:
        """Upload to Azure Blob Storage."""
        try:
            from azure.storage.blob import ContentSettings
            
            blob_client = self.container_client.get_blob_client(blob_name)
            
            content_settings = ContentSettings(content_type=content_type)
            
            blob_client.upload_blob(
                file_content,
                overwrite=True,
                content_settings=content_settings,
                metadata=metadata
            )
            
            url = blob_client.url
            
            return {
                "success": True,
                "storage": "azure",
                "blob_name": blob_name,
                "url": url,
                "size": len(file_content)
            }
            
        except Exception as e:
            logger.error(f"Azure upload failed: {e}")
            return {
                "success": False,
                "error": str(e)
            }
    
    async def _upload_local(
        self,
        file_content: bytes,
        blob_name: str,
        metadata: Optional[Dict]
    ) -> Dict:
        """Upload to local storage."""
        try:
            from pathlib import Path
            
            file_path = Path(self.local_dir) / blob_name
            file_path.parent.mkdir(parents=True, exist_ok=True)
            
            with open(file_path, "wb") as f:
                f.write(file_content)
            
            # Save metadata
            if metadata:
                import json
                meta_path = file_path.with_suffix(".meta.json")
                with open(meta_path, "w") as f:
                    json.dump(metadata, f)
            
            return {
                "success": True,
                "storage": "local",
                "blob_name": blob_name,
                "path": str(file_path),
                "url": f"/uploads/{blob_name}",
                "size": len(file_content)
            }
            
        except Exception as e:
            logger.error(f"Local upload failed: {e}")
            return {
                "success": False,
                "error": str(e)
            }
    
    async def download(self, blob_name: str) -> Optional[bytes]:
        """
        Download file from storage.
        
        Args:
            blob_name: Name/path of the blob
            
        Returns:
            File content as bytes, or None if not found
        """
        if self.use_azure:
            return await self._download_azure(blob_name)
        else:
            return await self._download_local(blob_name)
    
    async def _download_azure(self, blob_name: str) -> Optional[bytes]:
        """Download from Azure Blob Storage."""
        try:
            blob_client = self.container_client.get_blob_client(blob_name)
            downloader = blob_client.download_blob()
            return downloader.readall()
        except Exception as e:
            logger.error(f"Azure download failed: {e}")
            return None
    
    async def _download_local(self, blob_name: str) -> Optional[bytes]:
        """Download from local storage."""
        try:
            from pathlib import Path
            file_path = Path(self.local_dir) / blob_name
            
            if file_path.exists():
                with open(file_path, "rb") as f:
                    return f.read()
            return None
            
        except Exception as e:
            logger.error(f"Local download failed: {e}")
            return None
    
    async def delete(self, blob_name: str) -> bool:
        """
        Delete file from storage.
        
        Args:
            blob_name: Name/path of the blob
            
        Returns:
            True if deleted successfully
        """
        if self.use_azure:
            return await self._delete_azure(blob_name)
        else:
            return await self._delete_local(blob_name)
    
    async def _delete_azure(self, blob_name: str) -> bool:
        """Delete from Azure Blob Storage."""
        try:
            blob_client = self.container_client.get_blob_client(blob_name)
            blob_client.delete_blob()
            return True
        except Exception as e:
            logger.error(f"Azure delete failed: {e}")
            return False
    
    async def _delete_local(self, blob_name: str) -> bool:
        """Delete from local storage."""
        try:
            from pathlib import Path
            file_path = Path(self.local_dir) / blob_name
            
            if file_path.exists():
                file_path.unlink()
                
                # Also delete metadata
                meta_path = file_path.with_suffix(".meta.json")
                if meta_path.exists():
                    meta_path.unlink()
                
                return True
            return False
            
        except Exception as e:
            logger.error(f"Local delete failed: {e}")
            return False
    
    async def list_blobs(
        self,
        prefix: Optional[str] = None,
        max_results: int = 100
    ) -> List[Dict]:
        """
        List blobs in storage.
        
        Args:
            prefix: Optional path prefix filter
            max_results: Maximum results to return
            
        Returns:
            List of blob info dicts
        """
        if self.use_azure:
            return await self._list_azure(prefix, max_results)
        else:
            return await self._list_local(prefix, max_results)
    
    async def _list_azure(self, prefix: Optional[str], max_results: int) -> List[Dict]:
        """List blobs in Azure."""
        try:
            blobs = []
            for blob in self.container_client.list_blobs(
                name_starts_with=prefix,
                results_per_page=max_results
            ):
                blobs.append({
                    "name": blob.name,
                    "size": blob.size,
                    "created": blob.creation_time.isoformat() if blob.creation_time else None,
                    "modified": blob.last_modified.isoformat() if blob.last_modified else None,
                    "content_type": blob.content_settings.content_type if blob.content_settings else None
                })
                
                if len(blobs) >= max_results:
                    break
            
            return blobs
            
        except Exception as e:
            logger.error(f"Azure list failed: {e}")
            return []
    
    async def _list_local(self, prefix: Optional[str], max_results: int) -> List[Dict]:
        """List files in local storage."""
        try:
            from pathlib import Path
            
            base_path = Path(self.local_dir)
            if prefix:
                base_path = base_path / prefix
            
            if not base_path.exists():
                return []
            
            blobs = []
            for file_path in base_path.rglob("*"):
                if file_path.is_file() and not file_path.suffix == ".meta.json":
                    stat = file_path.stat()
                    blobs.append({
                        "name": str(file_path.relative_to(self.local_dir)),
                        "size": stat.st_size,
                        "created": datetime.fromtimestamp(stat.st_ctime).isoformat(),
                        "modified": datetime.fromtimestamp(stat.st_mtime).isoformat()
                    })
                    
                    if len(blobs) >= max_results:
                        break
            
            return blobs
            
        except Exception as e:
            logger.error(f"Local list failed: {e}")
            return []
    
    def get_sas_url(
        self,
        blob_name: str,
        expiry_hours: int = 24,
        permission: str = "read"
    ) -> Optional[str]:
        """
        Generate SAS URL for blob (Azure only).
        
        Args:
            blob_name: Name of the blob
            expiry_hours: Hours until expiry
            permission: 'read' or 'write'
            
        Returns:
            SAS URL or None
        """
        if not self.use_azure:
            # Return local URL
            return f"/uploads/{blob_name}"
        
        try:
            from azure.storage.blob import generate_blob_sas, BlobSasPermissions
            
            expiry = datetime.utcnow() + timedelta(hours=expiry_hours)
            
            permissions = BlobSasPermissions(
                read=(permission == "read"),
                write=(permission == "write")
            )
            
            sas_token = generate_blob_sas(
                account_name=self.blob_service_client.account_name,
                container_name=self.container_name,
                blob_name=blob_name,
                account_key=self.blob_service_client.credential.account_key,
                permission=permissions,
                expiry=expiry
            )
            
            blob_client = self.container_client.get_blob_client(blob_name)
            return f"{blob_client.url}?{sas_token}"
            
        except Exception as e:
            logger.error(f"SAS generation failed: {e}")
            return None
