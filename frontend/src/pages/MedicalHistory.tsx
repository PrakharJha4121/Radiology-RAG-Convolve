import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Folder,
  FolderPlus,
  File,
  FileImage,
  FileText,
  Upload,
  ChevronRight,
  Home,
  ArrowLeft,
  MoreVertical,
  Trash2,
  Edit2,
  Download,
  Brain,
  LogOut,
  X,
  Plus,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ThemeToggle } from '@/components/ThemeToggle';
import { useToast } from '@/hooks/use-toast';
import { getUser, logout } from '@/lib/auth';

const API_BASE = 'http://localhost:8000';

// Types
interface FileItem {
  id: string;
  name: string;
  type: 'file';
  fileType: 'scan' | 'prescription' | 'report' | 'other';
  mimeType: string;
  size: number;
  uploadedAt: string;
  path: string;
}

interface FolderItem {
  id: string;
  name: string;
  type: 'folder';
  createdAt: string;
  itemCount: number;
}

type FileSystemItem = FileItem | FolderItem;

// File type icons mapping
const getFileIcon = (fileType: string, mimeType?: string) => {
  if (mimeType?.startsWith('image/')) return FileImage;
  switch (fileType) {
    case 'scan':
      return FileImage;
    case 'prescription':
      return FileText;
    case 'report':
      return FileText;
    default:
      return File;
  }
};

// File type badges
const fileTypeBadges: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' }> = {
  scan: { label: 'Scan', variant: 'default' },
  prescription: { label: 'Prescription', variant: 'secondary' },
  report: { label: 'Report', variant: 'outline' },
  other: { label: 'Other', variant: 'outline' },
};

// Format file size
const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

// Format date
const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

const MedicalHistory = () => {
  const { patientId } = useParams<{ patientId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const user = getUser();

  // State
  const [currentPath, setCurrentPath] = useState<string[]>([]);
  const [items, setItems] = useState<FileSystemItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedItem, setSelectedItem] = useState<FileSystemItem | null>(null);
  
  // Dialog states
  const [isCreateFolderOpen, setIsCreateFolderOpen] = useState(false);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isRenameOpen, setIsRenameOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  
  // Form states
  const [newFolderName, setNewFolderName] = useState('');
  const [newName, setNewName] = useState('');
  const [uploadFiles, setUploadFiles] = useState<FileList | null>(null);
  const [uploadFileType, setUploadFileType] = useState<'scan' | 'prescription' | 'report' | 'other'>('scan');
  const [isUploading, setIsUploading] = useState(false);

  // Check authentication
  useEffect(() => {
    if (!user) {
      navigate('/login');
    } else if (user.patientId !== patientId) {
      toast({
        variant: 'destructive',
        title: 'Access Denied',
        description: 'You can only view your own medical history.',
      });
      navigate('/dashboard');
    }
  }, [user, patientId, navigate, toast]);

  // Fetch folder contents
  const fetchContents = async () => {
    if (!patientId) return;
    
    setIsLoading(true);
    try {
      const pathString = currentPath.join('/');
      const response = await fetch(`${API_BASE}/medical-history/${patientId}?path=${encodeURIComponent(pathString)}`);
      
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setItems(data.items || []);
        } else {
          toast({
            variant: 'destructive',
            title: 'Error',
            description: data.error || 'Failed to load medical history',
          });
          setItems([]);
        }
      } else {
        toast({
          variant: 'destructive',
          title: 'Server Error',
          description: 'Could not connect to the server. Please ensure the backend is running.',
        });
        setItems([]);
      }
    } catch (error) {
      console.error('Failed to fetch contents:', error);
      toast({
        variant: 'destructive',
        title: 'Connection Error',
        description: 'Could not connect to the server. Please check your connection and ensure the backend is running on port 8000.',
      });
      setItems([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchContents();
  }, [patientId, currentPath]);

  // Navigation handlers
  const handleFolderClick = (folder: FolderItem) => {
    setCurrentPath([...currentPath, folder.name]);
  };

  const handleBreadcrumbClick = (index: number) => {
    if (index === -1) {
      setCurrentPath([]);
    } else {
      setCurrentPath(currentPath.slice(0, index + 1));
    }
  };

  const handleGoBack = () => {
    if (currentPath.length > 0) {
      setCurrentPath(currentPath.slice(0, -1));
    } else {
      navigate('/dashboard');
    }
  };

  // Create folder
  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) {
      toast({ variant: 'destructive', title: 'Error', description: 'Folder name is required' });
      return;
    }

    try {
      const response = await fetch(`${API_BASE}/medical-history/${patientId}/folder`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newFolderName,
          path: currentPath.join('/'),
        }),
      });

      if (response.ok) {
        const data = await response.json();
        toast({ title: 'Success', description: 'Folder created successfully' });
        setNewFolderName('');
        setIsCreateFolderOpen(false);
        fetchContents();
      } else {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || 'Failed to create folder');
      }
    } catch (error) {
      console.error('Create folder error:', error);
      toast({ 
        variant: 'destructive', 
        title: 'Error', 
        description: error instanceof Error ? error.message : 'Failed to create folder. Please ensure the backend is running.' 
      });
    }
  };

  // Upload files
  const handleUpload = async () => {
    if (!uploadFiles || uploadFiles.length === 0) {
      toast({ variant: 'destructive', title: 'Error', description: 'Please select files to upload' });
      return;
    }

    setIsUploading(true);
    let successCount = 0;
    let failCount = 0;
    
    try {
      for (const file of Array.from(uploadFiles)) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('patient_id', patientId || '');
        formData.append('file_type', uploadFileType);
        formData.append('path', currentPath.join('/'));

        try {
          const response = await fetch(`${API_BASE}/medical-history/${patientId}/upload`, {
            method: 'POST',
            body: formData,
          });

          if (response.ok) {
            successCount++;
          } else {
            failCount++;
            console.error(`Failed to upload ${file.name}`);
          }
        } catch (err) {
          failCount++;
          console.error(`Failed to upload ${file.name}:`, err);
        }
      }

      if (successCount > 0) {
        toast({ 
          title: 'Upload Complete', 
          description: `${successCount} file(s) uploaded successfully${failCount > 0 ? `, ${failCount} failed` : ''}` 
        });
        fetchContents();
      } else {
        toast({ 
          variant: 'destructive', 
          title: 'Upload Failed', 
          description: 'Could not upload files. Please ensure the backend is running.' 
        });
      }
      
      setUploadFiles(null);
      setIsUploadOpen(false);
    } catch (error) {
      console.error('Upload error:', error);
      toast({ 
        variant: 'destructive', 
        title: 'Upload Error', 
        description: 'Failed to upload files. Please check your connection.' 
      });
    } finally {
      setIsUploading(false);
    }
  };

  // Delete item
  const handleDelete = async () => {
    if (!selectedItem) return;

    try {
      const response = await fetch(`${API_BASE}/medical-history/${patientId}/item/${selectedItem.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast({ title: 'Deleted', description: `${selectedItem.name} has been deleted` });
        fetchContents(); // Refresh from server to ensure consistency
      } else {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || 'Failed to delete item');
      }
    } catch (error) {
      console.error('Delete error:', error);
      toast({ 
        variant: 'destructive', 
        title: 'Delete Failed', 
        description: error instanceof Error ? error.message : 'Could not delete item. Please try again.' 
      });
    }
    
    setSelectedItem(null);
    setIsDeleteOpen(false);
  };

  // Rename item
  const handleRename = async () => {
    if (!selectedItem || !newName.trim()) return;

    try {
      const response = await fetch(`${API_BASE}/medical-history/${patientId}/item/${selectedItem.id}/rename`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName }),
      });

      if (response.ok) {
        toast({ title: 'Renamed', description: 'Item renamed successfully' });
        fetchContents(); // Refresh from server to ensure consistency
      } else {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || 'Failed to rename item');
      }
    } catch (error) {
      console.error('Rename error:', error);
      toast({ 
        variant: 'destructive', 
        title: 'Rename Failed', 
        description: error instanceof Error ? error.message : 'Could not rename item. Please try again.' 
      });
    }

    setSelectedItem(null);
    setNewName('');
    setIsRenameOpen(false);
  };

  // Download file
  const handleDownload = async (file: FileItem) => {
    try {
      const response = await fetch(`${API_BASE}/medical-history/${patientId}/download/${file.id}`);
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = file.name;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to download file' });
    }
  };

  const handleLogout = () => {
    logout();
    toast({ title: 'Signed out', description: 'You have been successfully signed out.' });
    navigate('/');
  };

  if (!user) return null;

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="h-14 border-b border-border bg-card flex items-center justify-between px-4 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <Brain className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="font-semibold text-foreground leading-none">Medical History</h1>
            <p className="text-xs text-muted-foreground mt-0.5">Patient Records</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-sm font-medium text-foreground">{user.name}</p>
            <p className="text-xs text-muted-foreground">{user.patientId}</p>
          </div>
          <div className="flex items-center gap-1">
            <ThemeToggle />
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleLogout}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <motion.main
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
        className="flex-1 overflow-hidden p-4"
      >
        <Card className="h-full flex flex-col">
          {/* Toolbar */}
          <CardHeader className="py-3 px-4 border-b border-border">
            <div className="flex items-center justify-between">
              {/* Breadcrumbs */}
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={handleGoBack}
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                
                <div className="flex items-center gap-1 text-sm">
                  <button
                    onClick={() => handleBreadcrumbClick(-1)}
                    className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <Home className="h-4 w-4" />
                    <span>Home</span>
                  </button>
                  
                  {currentPath.map((folder, index) => (
                    <div key={index} className="flex items-center gap-1">
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      <button
                        onClick={() => handleBreadcrumbClick(index)}
                        className={`hover:text-foreground transition-colors ${
                          index === currentPath.length - 1 ? 'text-foreground font-medium' : 'text-muted-foreground'
                        }`}
                      >
                        {folder}
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2">
                <Dialog open={isCreateFolderOpen} onOpenChange={setIsCreateFolderOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm" className="gap-2">
                      <FolderPlus className="h-4 w-4" />
                      New Folder
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Create New Folder</DialogTitle>
                      <DialogDescription>
                        Enter a name for the new folder.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label htmlFor="folderName">Folder Name</Label>
                        <Input
                          id="folderName"
                          value={newFolderName}
                          onChange={(e) => setNewFolderName(e.target.value)}
                          placeholder="Enter folder name"
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setIsCreateFolderOpen(false)}>
                        Cancel
                      </Button>
                      <Button onClick={handleCreateFolder}>Create</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>

                <Dialog open={isUploadOpen} onOpenChange={setIsUploadOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm" className="gap-2">
                      <Upload className="h-4 w-4" />
                      Upload Files
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Upload Files</DialogTitle>
                      <DialogDescription>
                        Upload medical files to this folder.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label htmlFor="fileType">File Type</Label>
                        <select
                          id="fileType"
                          value={uploadFileType}
                          onChange={(e) => setUploadFileType(e.target.value as typeof uploadFileType)}
                          className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                        >
                          <option value="scan">Scan</option>
                          <option value="prescription">Prescription</option>
                          <option value="report">Report</option>
                          <option value="other">Other</option>
                        </select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="files">Select Files</Label>
                        <Input
                          id="files"
                          type="file"
                          multiple
                          onChange={(e) => setUploadFiles(e.target.files)}
                          className="cursor-pointer"
                        />
                      </div>
                      {uploadFiles && uploadFiles.length > 0 && (
                        <div className="text-sm text-muted-foreground">
                          {uploadFiles.length} file(s) selected
                        </div>
                      )}
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setIsUploadOpen(false)}>
                        Cancel
                      </Button>
                      <Button onClick={handleUpload} disabled={isUploading}>
                        {isUploading ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Uploading...
                          </>
                        ) : (
                          'Upload'
                        )}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          </CardHeader>

          {/* File Browser */}
          <CardContent className="flex-1 p-0 overflow-hidden">
            <ScrollArea className="h-full">
              {isLoading ? (
                <div className="flex items-center justify-center h-64">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : items.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                  <Folder className="h-16 w-16 mb-4 opacity-30" />
                  <p className="text-lg font-medium">This folder is empty</p>
                  <p className="text-sm mt-1">Create a folder or upload files to get started</p>
                </div>
              ) : (
                <div className="p-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                  <AnimatePresence>
                    {items.map((item, index) => {
                      const isFolder = item.type === 'folder';
                      const Icon = isFolder ? Folder : getFileIcon((item as FileItem).fileType, (item as FileItem).mimeType);

                      return (
                        <motion.div
                          key={item.id}
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.9 }}
                          transition={{ delay: index * 0.02 }}
                          className={`
                            group relative p-4 rounded-lg border border-border bg-card
                            hover:border-primary/30 hover:shadow-md transition-all cursor-pointer
                            ${isFolder ? 'hover:bg-primary/5' : ''}
                          `}
                          onClick={() => isFolder && handleFolderClick(item as FolderItem)}
                        >
                          {/* Item Actions Menu */}
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="absolute top-2 right-2 h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedItem(item);
                                  setNewName(item.name);
                                  setIsRenameOpen(true);
                                }}
                              >
                                <Edit2 className="h-4 w-4 mr-2" />
                                Rename
                              </DropdownMenuItem>
                              {!isFolder && (
                                <DropdownMenuItem
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDownload(item as FileItem);
                                  }}
                                >
                                  <Download className="h-4 w-4 mr-2" />
                                  Download
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-destructive"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedItem(item);
                                  setIsDeleteOpen(true);
                                }}
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>

                          {/* Icon */}
                          <div className={`
                            w-12 h-12 rounded-lg flex items-center justify-center mb-3
                            ${isFolder ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}
                          `}>
                            <Icon className="h-6 w-6" />
                          </div>

                          {/* Name */}
                          <p className="font-medium text-sm text-foreground truncate" title={item.name}>
                            {item.name}
                          </p>

                          {/* Details */}
                          {isFolder ? (
                            <p className="text-xs text-muted-foreground mt-1">
                              {(item as FolderItem).itemCount} items
                            </p>
                          ) : (
                            <div className="mt-2 space-y-1">
                              <Badge {...fileTypeBadges[(item as FileItem).fileType]} className="text-[10px] h-5">
                                {fileTypeBadges[(item as FileItem).fileType].label}
                              </Badge>
                              <p className="text-xs text-muted-foreground">
                                {formatFileSize((item as FileItem).size)}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {formatDate((item as FileItem).uploadedAt)}
                              </p>
                            </div>
                          )}
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </motion.main>

      {/* Rename Dialog */}
      <Dialog open={isRenameOpen} onOpenChange={setIsRenameOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename {selectedItem?.type === 'folder' ? 'Folder' : 'File'}</DialogTitle>
            <DialogDescription>
              Enter a new name for "{selectedItem?.name}".
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="newName">New Name</Label>
              <Input
                id="newName"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Enter new name"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRenameOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleRename}>Rename</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete "{selectedItem?.name}"{selectedItem?.type === 'folder' ? ' and all its contents' : ''}.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default MedicalHistory;
