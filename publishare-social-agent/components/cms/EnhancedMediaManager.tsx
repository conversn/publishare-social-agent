import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { 
  Star, 
  Image as ImageIcon, 
  Download, 
  Trash2, 
  Copy, 
  Eye,
  CheckCircle,
  AlertCircle,
  Tag,
  Share2,
  FileText,
  Edit3,
  Sparkles,
  Upload,
  FolderOpen,
  Database,
  Cloud,
  RefreshCw,
  Plus
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface MediaItem {
  id: string;
  url: string;
  altText: string;
  type: string;
  caption: string;
  isFeatured: boolean;
  createdAt: string;
}

interface EnhancedMediaManagerProps {
  articleId: string;
  onFeaturedImageChange?: (imageUrl: string, altText: string) => void;
}

const EnhancedMediaManager: React.FC<EnhancedMediaManagerProps> = ({ 
  articleId, 
  onFeaturedImageChange 
}) => {
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedImage, setSelectedImage] = useState<MediaItem | null>(null);
  const [activeTab, setActiveTab] = useState('cms');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadUrl, setUploadUrl] = useState('');
  const [uploadAltText, setUploadAltText] = useState('');
  const [uploadType, setUploadType] = useState('inline');
  const { toast } = useToast();

  // Dimension options for image generation
  const dimensionOptions = [
    { value: '1024x1024', label: 'Square (1024×1024)' },
    { value: '1536x1024', label: 'Landscape (1536×1024)' },
    { value: '1024x1536', label: 'Portrait (1024×1536)' },
    { value: '1920x1080', label: 'Wide (1920×1080)' },
    { value: '1080x1080', label: 'Social Square (1080×1080)' },
    { value: '1080x1920', label: 'Story (1080×1920)' },
    { value: '1200x800', label: 'Infographic (1200×800)' },
    { value: '512x512', label: 'Thumbnail (512×512)' }
  ];

  // Load media items from localStorage for now
  const loadMediaItems = () => {
    try {
      const stored = localStorage.getItem(`media-${articleId}`);
      if (stored) {
        setMediaItems(JSON.parse(stored));
      }
    } catch (error) {
      console.error('Error loading media items:', error);
    }
  };

  // Save media items to localStorage
  const saveMediaItems = (items: MediaItem[]) => {
    try {
      localStorage.setItem(`media-${articleId}`, JSON.stringify(items));
    } catch (error) {
      console.error('Error saving media items:', error);
    }
  };

  // Add new media item
  const addMediaItem = (url: string, altText: string, type: string) => {
    const newItem: MediaItem = {
      id: Date.now().toString(),
      url,
      altText,
      type,
      caption: '',
      isFeatured: type === 'featured',
      createdAt: new Date().toISOString()
    };

    const updatedItems = [...mediaItems, newItem];
    setMediaItems(updatedItems);
    saveMediaItems(updatedItems);

    if (type === 'featured' && onFeaturedImageChange) {
      onFeaturedImageChange(url, altText);
    }

    toast({
      title: "Success",
      description: "Media item added successfully"
    });
  };

  // Delete media item
  const deleteMediaItem = (id: string) => {
    const updatedItems = mediaItems.filter(item => item.id !== id);
    setMediaItems(updatedItems);
    saveMediaItems(updatedItems);

    toast({
      title: "Success",
      description: "Media item deleted successfully"
    });
  };

  // Copy image URL
  const copyImageUrl = async (imageUrl: string) => {
    try {
      await navigator.clipboard.writeText(imageUrl);
      toast({
        title: "Success",
        description: "Image URL copied to clipboard"
      });
    } catch (error) {
      console.error('Error copying URL:', error);
      toast({
        title: "Error",
        description: "Failed to copy URL",
        variant: "destructive"
      });
    }
  };

  // Set featured image
  const setFeaturedImage = (item: MediaItem) => {
    const updatedItems = mediaItems.map(img => ({
      ...img,
      isFeatured: img.id === item.id
    }));
    setMediaItems(updatedItems);
    saveMediaItems(updatedItems);

    if (onFeaturedImageChange) {
      onFeaturedImageChange(item.url, item.altText);
    }

    toast({
      title: "Success",
      description: "Featured image updated"
    });
  };

  // Get image type label
  const getImageTypeLabel = (imageType: string) => {
    const labels: Record<string, string> = {
      'featured': 'Featured',
      'inline': 'Inline',
      'og-image': 'Social Media',
      'social-square': 'Social Square',
      'social-story': 'Social Story',
      'thumbnail': 'Thumbnail'
    };
    return labels[imageType] || imageType;
  };

  // Get image type color
  const getImageTypeColor = (imageType: string) => {
    const colors: Record<string, string> = {
      'featured': 'bg-yellow-100 text-yellow-800',
      'inline': 'bg-blue-100 text-blue-800',
      'og-image': 'bg-green-100 text-green-800',
      'social-square': 'bg-purple-100 text-purple-800',
      'social-story': 'bg-pink-100 text-pink-800',
      'thumbnail': 'bg-gray-100 text-gray-800'
    };
    return colors[imageType] || 'bg-gray-100 text-gray-800';
  };

  // Handle manual upload
  const handleManualUpload = () => {
    if (!uploadUrl.trim()) {
      toast({
        title: "Error",
        description: "Please enter an image URL",
        variant: "destructive"
      });
      return;
    }

    addMediaItem(uploadUrl, uploadAltText, uploadType);
    setUploadUrl('');
    setUploadAltText('');
    setUploadType('inline');
  };

  // Generate placeholder image
  const generatePlaceholderImage = (prompt: string, dimensions: string) => {
    const [width, height] = dimensions.split('x').map(Number);
    const placeholderUrl = `https://via.placeholder.com/${width}x${height}/4F46E5/FFFFFF?text=${encodeURIComponent(prompt)}`;
    
    addMediaItem(placeholderUrl, prompt, 'inline');
    
    toast({
      title: "Success",
      description: "Placeholder image generated"
    });
  };

  useEffect(() => {
    loadMediaItems();
  }, [articleId]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <ImageIcon className="h-5 w-5" />
            <span>Enhanced Media Manager</span>
            <Badge variant="secondary">Local Storage</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="cms" className="flex items-center space-x-2">
                <Database className="h-4 w-4" />
                <span>CMS Images</span>
                <Badge variant="outline">{mediaItems.length}</Badge>
              </TabsTrigger>
              <TabsTrigger value="upload" className="flex items-center space-x-2">
                <Upload className="h-4 w-4" />
                <span>Upload</span>
              </TabsTrigger>
              <TabsTrigger value="generate" className="flex items-center space-x-2">
                <Sparkles className="h-4 w-4" />
                <span>Generate</span>
              </TabsTrigger>
            </TabsList>

            {/* CMS Images Tab */}
            <TabsContent value="cms" className="space-y-4">
              {loading ? (
                <div className="flex items-center justify-center p-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  <span className="ml-2">Loading images...</span>
                </div>
              ) : mediaItems.length === 0 ? (
                <div className="text-center p-8 text-gray-500">
                  <ImageIcon className="h-12 w-12 mx-auto mb-4" />
                  <p>No images found for this article</p>
                  <p className="text-sm">Add images using the Upload or Generate tabs</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {mediaItems.map((item) => (
                    <Card key={item.id} className="overflow-hidden">
                      <div className="relative group">
                        <img
                          src={item.url}
                          alt={item.altText}
                          className="w-full h-48 object-cover"
                          onError={(e) => {
                            e.currentTarget.src = 'https://via.placeholder.com/400x300/EF4444/FFFFFF?text=Image+Error';
                          }}
                        />
                        <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all duration-200 flex items-center justify-center">
                          <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex space-x-2">
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => setSelectedImage(item)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => copyImageUrl(item.url)}
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => deleteMediaItem(item.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                      <CardContent className="p-3">
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <Badge className={getImageTypeColor(item.type)}>
                              {getImageTypeLabel(item.type)}
                            </Badge>
                            {item.isFeatured && (
                              <Star className="h-4 w-4 text-yellow-500" />
                            )}
                          </div>
                          <p className="text-sm font-medium truncate">{item.altText}</p>
                          <div className="flex space-x-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setFeaturedImage(item)}
                              disabled={item.isFeatured}
                            >
                              <Star className="h-4 w-4 mr-1" />
                              {item.isFeatured ? 'Featured' : 'Set Featured'}
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* Upload Tab */}
            <TabsContent value="upload" className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="font-medium text-blue-900 mb-2">Manual Upload</h3>
                <p className="text-sm text-blue-700">
                  Add images by providing their URLs. This is useful for images already hosted elsewhere.
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Image URL</label>
                  <Input
                    type="url"
                    value={uploadUrl}
                    onChange={(e) => setUploadUrl(e.target.value)}
                    placeholder="https://example.com/image.jpg"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Alt Text</label>
                  <Input
                    type="text"
                    value={uploadAltText}
                    onChange={(e) => setUploadAltText(e.target.value)}
                    placeholder="Descriptive text for accessibility"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Image Type</label>
                  <Select value={uploadType} onValueChange={setUploadType}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select image type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="inline">Inline</SelectItem>
                      <SelectItem value="featured">Featured</SelectItem>
                      <SelectItem value="og-image">Social Media</SelectItem>
                      <SelectItem value="social-square">Social Square</SelectItem>
                      <SelectItem value="social-story">Social Story</SelectItem>
                      <SelectItem value="thumbnail">Thumbnail</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Button
                  onClick={handleManualUpload}
                  disabled={!uploadUrl.trim()}
                  className="w-full"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Image
                </Button>
              </div>
            </TabsContent>

            {/* Generate Tab */}
            <TabsContent value="generate" className="space-y-4">
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                <h3 className="font-medium text-purple-900 mb-2">AI Image Generation</h3>
                <p className="text-sm text-purple-700">
                  Generate placeholder images for your content. In a full implementation, this would use AI services like DALL-E or Midjourney.
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Image Description</label>
                  <Textarea
                    value=""
                    placeholder="Describe the image you want to generate..."
                    rows={3}
                    onChange={(e) => {
                      // This would be used for AI generation
                    }}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Dimensions</label>
                  <Select value="1024x1024" onValueChange={() => {}}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select dimensions" />
                    </SelectTrigger>
                    <SelectContent>
                      {dimensionOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <Button
                  onClick={() => generatePlaceholderImage('AI Generated Image', '1024x1024')}
                  className="w-full"
                >
                  <Sparkles className="h-4 w-4 mr-2" />
                  Generate Placeholder Image
                </Button>

                <div className="text-xs text-gray-500 bg-gray-50 p-3 rounded">
                  <strong>Note:</strong> This is a simplified version that generates placeholder images. 
                  In production, this would integrate with AI image generation services.
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Image Detail Modal */}
      {selectedImage && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-4xl max-h-[90vh] overflow-hidden">
            <div className="p-4 border-b flex items-center justify-between">
              <h3 className="text-lg font-semibold">Image Details</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedImage(null)}
              >
                ×
              </Button>
            </div>
            <div className="p-4">
              <img
                src={selectedImage.url}
                alt={selectedImage.altText}
                className="w-full h-auto max-h-[60vh] object-contain"
                onError={(e) => {
                  e.currentTarget.src = 'https://via.placeholder.com/400x300/EF4444/FFFFFF?text=Image+Error';
                }}
              />
            </div>
            <div className="p-4 border-t bg-gray-50">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium">Type:</span> {getImageTypeLabel(selectedImage.type)}
                </div>
                <div>
                  <span className="font-medium">Alt Text:</span> {selectedImage.altText}
                </div>
                <div>
                  <span className="font-medium">Created:</span> {new Date(selectedImage.createdAt).toLocaleDateString()}
                </div>
                <div>
                  <span className="font-medium">Featured:</span> {selectedImage.isFeatured ? 'Yes' : 'No'}
                </div>
              </div>
              <div className="flex space-x-2 mt-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyImageUrl(selectedImage.url)}
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Copy URL
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setFeaturedImage(selectedImage)}
                  disabled={selectedImage.isFeatured}
                >
                  <Star className="h-4 w-4 mr-2" />
                  Set Featured
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EnhancedMediaManager;
